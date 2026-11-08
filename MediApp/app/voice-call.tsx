/**
 * Live voice conversation with Sara.
 *
 * Hands-free turn-taking over one WebSocket to MedicusAI (/api/MedicusAI/live/voice):
 *   listen -> detect the end of the user's sentence (silence) -> send the clip ->
 *   server transcribes it, runs the conversation's assistant (same tools and records as
 *   the chat) and streams the spoken answer back sentence by sentence -> play -> listen.
 *
 * Works with any self-hosted speech-to-text / text-to-speech server configured on the
 * backend (e.g. an Ollama audio model). Both sides of the call are saved in the chat.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  AudioModule,
  createAudioPlayer,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  type AudioPlayer,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { env, logger } from '@/utils';
import { tokenStorage } from '@/utils/infrastructure/storage';

type Phase = 'connecting' | 'listening' | 'hearing' | 'transcribing' | 'thinking' | 'speaking' | 'muted' | 'error';
type Line = { role: 'user' | 'assistant'; text: string };

// Voice activity detection on the recorder's level meter (dBFS, -160..0).
const VAD = {
  pollMs: 100,
  speechAboveFloorDb: 12, // louder than the background noise by this much = speech
  minSpeechDb: -50,       // ...and at least this loud
  endSilenceMs: 900,      // this long below the threshold ends the sentence
  minSpeechMs: 300,       // shorter blips are ignored (coughs, clicks)
  maxUtteranceMs: 30000,
  idleRestartMs: 20000,   // restart an idle recording so silent audio never piles up
};

const PHASE_LABEL: Record<Phase, string> = {
  connecting: 'Connecting…',
  listening: 'Listening',
  hearing: 'Listening…',
  transcribing: 'Got it…',
  thinking: 'Sara is thinking…',
  speaking: 'Sara is speaking',
  muted: 'Microphone off',
  error: 'Disconnected',
};

function wsUrl(): string {
  const base = env.medicusAIApiBaseUrl.replace(/\/$/, '');
  return `${base.replace(/^http/, 'ws')}/live/voice`;
}

export default function VoiceCallScreen() {
  const router = useRouter();
  const { convoId, title } = useLocalSearchParams<{ convoId: string; title?: string }>();

  const [phase, setPhase] = useState<Phase>('connecting');
  const [lines, setLines] = useState<Line[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);

  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });

  const ws = useRef<WebSocket | null>(null);
  const phaseRef = useRef<Phase>('connecting');
  const mutedRef = useRef(false);
  const closingRef = useRef(false);
  const vadTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioQueue = useRef<string[]>([]);
  const player = useRef<AudioPlayer | null>(null);
  const responseDone = useRef(true);
  const pendingClips = useRef(0);          // audio clips still being written to disk
  const playbackMode = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const addLine = (line: Line) => setLines(prev => [...prev, line]);

  // ------------------------------------------------------------------ recorder (guarded)
  // The recorder is a native object that expo-audio releases when the screen unmounts.
  // Touching it afterwards throws, so every call goes through these guards.

  const recorderAlive = () => !closingRef.current;

  const stopVad = () => {
    if (vadTimer.current) {
      clearInterval(vadTimer.current);
      vadTimer.current = null;
    }
  };

  const stopRecording = useCallback(async (): Promise<string | null> => {
    stopVad();
    if (!recorderAlive()) return null;
    try {
      if (recorder.isRecording) {
        await recorder.stop();
      }
      return recorder.uri;
    } catch (e) {
      logger.warn('Live voice: stopping the recorder failed', { error: String(e) });
      return null;
    }
  }, [recorder]);

  const readLevel = (): number => {
    if (!recorderAlive()) return -160;
    try {
      return recorder.getStatus().metering ?? -160;
    } catch {
      return -160;
    }
  };

  // ------------------------------------------------------------------ listening

  const sendUtterance = useCallback(async (uri: string) => {
    try {
      const audio = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      if (closingRef.current) return;
      ws.current?.send(JSON.stringify({ type: 'input_audio', audio, format: 'm4a' }));
      setPhaseBoth('transcribing');
    } catch (e) {
      logger.error('Live voice: reading the recording failed', e as Error);
    }
  }, []);

  // Sara is talking or about to: never record over her (it would also take the audio
  // focus on Android and silence her).
  const saraBusy = () =>
    !responseDone.current || player.current !== null || audioQueue.current.length > 0 || pendingClips.current > 0;

  const startListening = useCallback(async () => {
    if (closingRef.current || mutedRef.current || saraBusy()) return;
    try {
      stopVad();
      if (recorder.isRecording) await recorder.stop();
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, interruptionMode: 'doNotMix' });
      if (closingRef.current || saraBusy()) return;
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      if (closingRef.current) return;
      logger.error('Live voice: starting the recorder failed', e as Error);
      setErrorText('The microphone could not be started.');
      setPhaseBoth('error');
      return;
    }
    setPhaseBoth('listening');

    const startedAt = Date.now();
    let floor = -60;            // running background-noise estimate
    let speechStart = 0;
    let lastLoud = 0;
    let finishing = false;

    vadTimer.current = setInterval(async () => {
      if (finishing) return;
      if (closingRef.current) {
        stopVad();
        return;
      }
      const now = Date.now();
      const level = readLevel();
      const threshold = Math.max(floor + VAD.speechAboveFloorDb, VAD.minSpeechDb);
      const loud = level > threshold;

      if (!speechStart) {
        floor = loud ? floor : floor * 0.9 + level * 0.1;   // adapt to the room while quiet
        if (loud) {
          speechStart = now;
          lastLoud = now;
          setPhaseBoth('hearing');
        } else if (now - startedAt > VAD.idleRestartMs) {
          finishing = true;
          await stopRecording();
          startListening();                                  // fresh file, nothing to send
        }
        return;
      }

      if (loud) lastLoud = now;
      const spokeFor = lastLoud - speechStart;
      const silentFor = now - lastLoud;
      if (silentFor < VAD.endSilenceMs && now - speechStart < VAD.maxUtteranceMs) return;

      finishing = true;
      const uri = await stopRecording();
      if (spokeFor < VAD.minSpeechMs || !uri) {
        startListening();                                    // a blip, keep listening
        return;
      }
      sendUtterance(uri);
    }, VAD.pollMs);
  }, [recorder, sendUtterance, stopRecording]);

  // ------------------------------------------------------------------ speaking

  const stopPlayback = () => {
    audioQueue.current = [];
    if (player.current) {
      try {
        player.current.pause();
        player.current.remove();
      } catch {
        // already released
      }
      player.current = null;
    }
  };

  const resumeListeningIfIdle = useCallback(() => {
    if (!saraBusy() && phaseRef.current === 'speaking') startListening();
  }, [startListening]);

  const playNext = useCallback(async () => {
    if (player.current || closingRef.current) return;      // one clip at a time
    const next = audioQueue.current.shift();
    if (!next) {
      resumeListeningIfIdle();
      return;
    }
    if (!playbackMode.current) {
      // Output through the loudspeaker as media, with the microphone released.
      playbackMode.current = true;
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, interruptionMode: 'doNotMix' })
        .catch(() => {});
    }
    const p = createAudioPlayer({ uri: next });
    player.current = p;
    p.addListener('playbackStatusUpdate', status => {
      if (status.didJustFinish) {
        try {
          p.remove();
        } catch {
          // already released
        }
        FileSystem.deleteAsync(next, { idempotent: true }).catch(() => {});
        player.current = null;
        playNext();
      }
    });
    p.play();
  }, [resumeListeningIfIdle]);

  const enqueueAudio = useCallback(async (b64: string, seq: number, format: string) => {
    pendingClips.current += 1;
    try {
      const path = `${FileSystem.cacheDirectory}live-${Date.now()}-${seq}.${format || 'wav'}`;
      await FileSystem.writeAsStringAsync(path, b64, { encoding: FileSystem.EncodingType.Base64 });
      audioQueue.current.push(path);
    } finally {
      pendingClips.current -= 1;
    }
    playNext();
  }, [playNext]);

  // ------------------------------------------------------------------ connection

  const onMessage = useCallback(async (raw: string) => {
    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    switch (msg.type) {
      case 'session.ready':
        startListening();
        break;
      case 'state':
        if (msg.state === 'thinking' || msg.state === 'transcribing') setPhaseBoth(msg.state);
        if (msg.state === 'speaking') {
          responseDone.current = false;
          playbackMode.current = false;
          await stopRecording();
          setPhaseBoth('speaking');
        }
        break;
      case 'transcript':
        if (msg.text) addLine({ role: 'user', text: msg.text });
        break;
      case 'response.text':
        addLine({ role: 'assistant', text: msg.text });
        break;
      case 'response.audio':
        await enqueueAudio(msg.audio, msg.seq, msg.format);
        break;
      case 'response.done':
        responseDone.current = true;
        resumeListeningIfIdle();
        break;
      case 'error':
        setErrorText(msg.message);
        if (msg.fatal) setPhaseBoth('error');
        break;
    }
  }, [enqueueAudio, resumeListeningIfIdle, startListening, stopRecording]);

  // WebSocket handlers run concurrently; process server messages strictly in order so a
  // clip is queued before the "response.done" that follows it is handled.
  const messageChain = useRef<Promise<void>>(Promise.resolve());
  const handleMessage = useCallback((raw: string) => {
    messageChain.current = messageChain.current
      .then(() => onMessage(raw))
      .catch(e => logger.error('Live voice: handling a message failed', e as Error));
  }, [onMessage]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    (async () => {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setErrorText('Microphone access is needed for a voice conversation.');
        setPhaseBoth('error');
        return;
      }
      const token = await tokenStorage.getAccessToken();
      socket = new WebSocket(wsUrl());
      ws.current = socket;
      socket.onopen = () => socket?.send(JSON.stringify({ type: 'session.start', token, convo_id: convoId }));
      socket.onmessage = e => handleMessage(String(e.data));
      socket.onerror = () => {
        if (!closingRef.current) setErrorText('Could not reach the voice service.');
      };
      socket.onclose = () => {
        if (!closingRef.current) setPhaseBoth('error');
      };
    })();

    return () => {
      // expo-audio stops and releases the recorder itself on unmount; don't touch it here.
      closingRef.current = true;
      stopVad();
      stopPlayback();
      socket?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convoId]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [lines]);

  // ------------------------------------------------------------------ controls

  const interrupt = () => {
    ws.current?.send(JSON.stringify({ type: 'response.cancel' }));
    stopPlayback();
    responseDone.current = true;
    startListening();
  };


  const toggleMute = async () => {
    mutedRef.current = !mutedRef.current;
    if (mutedRef.current) {
      await stopRecording();
      setPhaseBoth('muted');
    } else {
      startListening();
    }
  };

  const endCall = () => {
    closingRef.current = true;
    router.back();
  };

  useEffect(() => {
    if (phase === 'error' && errorText && lines.length === 0) {
      Alert.alert('Voice conversation', errorText, [{ text: 'OK', onPress: () => router.back() }]);
    }
  }, [phase, errorText, lines.length, router]);

  const busy = phase === 'transcribing' || phase === 'thinking' || phase === 'speaking';
  const listening = phase === 'listening' || phase === 'hearing';

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <View className="items-center pt-10 pb-6">
        <View
          className={`w-36 h-36 rounded-full items-center justify-center ${
            phase === 'speaking' ? 'bg-[#F05C0C]' : phase === 'hearing' ? 'bg-emerald-500' : 'bg-gray-800'
          }`}
        >
          {phase === 'connecting' || phase === 'transcribing' || phase === 'thinking' ? (
            <ActivityIndicator size="large" color="#ffffff" />
          ) : (
            <MaterialCommunityIcons
              name={phase === 'speaking' ? 'account-voice' : phase === 'muted' ? 'microphone-off' : 'microphone'}
              size={64}
              color="#ffffff"
            />
          )}
        </View>
        <Text className="text-white text-2xl font-semibold mt-6">{title || 'Sara'}</Text>
        <Text className="text-gray-300 text-base mt-1">{PHASE_LABEL[phase]}</Text>
        {errorText && phase !== 'error' ? <Text className="text-amber-400 text-sm mt-2 px-8 text-center">{errorText}</Text> : null}
      </View>

      <ScrollView ref={scrollRef} className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 16 }}>
        {lines.length === 0 && listening ? (
          <Text className="text-gray-400 text-center mt-4">Start speaking whenever you are ready.</Text>
        ) : null}
        {lines.map((line, i) => (
          <View key={i} className={`mb-3 max-w-[85%] ${line.role === 'user' ? 'self-end' : 'self-start'}`}>
            <View className={`rounded-2xl px-4 py-3 ${line.role === 'user' ? 'bg-[#F05C0C]' : 'bg-gray-800'}`}>
              <Text className="text-white text-base">{line.text}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View className="flex-row justify-around items-center px-10 pb-8 pt-4">
        <TouchableOpacity onPress={toggleMute} className="w-16 h-16 rounded-full bg-gray-800 items-center justify-center">
          <MaterialCommunityIcons name={phase === 'muted' ? 'microphone-off' : 'microphone'} size={28} color="#ffffff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={endCall} className="w-20 h-20 rounded-full bg-red-600 items-center justify-center">
          <MaterialCommunityIcons name="phone-hangup" size={36} color="#ffffff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={interrupt}
          disabled={!busy}
          className={`w-16 h-16 rounded-full items-center justify-center ${busy ? 'bg-gray-800' : 'bg-gray-900'}`}
        >
          <MaterialCommunityIcons name="hand-back-right" size={28} color={busy ? '#ffffff' : '#4B5563'} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
