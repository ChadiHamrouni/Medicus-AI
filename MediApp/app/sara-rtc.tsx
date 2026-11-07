/**
 * Sara RTC Screen
 *
 * Real-time voice conversation with Sara AI using OpenAI Realtime API via WebRTC.
 * WebRTC provides built-in echo cancellation, noise suppression, and
 * automatic gain control — no manual audio chunking needed.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import { Audio } from 'expo-av';
import { env, logger, authenticatedFetch } from '@/utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AVATAR_SIZE = SCREEN_WIDTH * 0.45;

const OPENAI_REALTIME_MODEL = 'gpt-4o-realtime-preview-2024-12-17';

// Pulsing ring animation
const PulsingRing: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    if (isActive) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 1000, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.in(Easing.ease) })
        ),
        -1,
        false
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 1000 }),
          withTiming(0.6, { duration: 1000 })
        ),
        -1,
        false
      );
    } else {
      scale.value = withTiming(1);
      opacity.value = withTiming(0);
    }
  }, [isActive, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: AVATAR_SIZE + 30,
          height: AVATAR_SIZE + 30,
          borderRadius: (AVATAR_SIZE + 30) / 2,
          borderWidth: 3,
          borderColor: '#F05C0C',
        },
        animatedStyle,
      ]}
    />
  );
};

type ConnectionState = 'idle' | 'fetching_token' | 'connecting' | 'connected' | 'error';
type ConversationState = 'idle' | 'listening' | 'thinking' | 'speaking';

export default function SaraRTCScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Extract params
  const convoId = (params.convoId as string) || '';
  const assistant = (params.assistant as string) || 'mediaid';
  const patientId = params.patientId ? Number(params.patientId) : undefined;
  const doctorId = params.doctorId ? Number(params.doctorId) : undefined;
  const userId = params.userId ? Number(params.userId) : undefined;
  const senderId = params.senderId ? Number(params.senderId) : undefined;

  // State
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [conversationState, setConversationState] = useState<ConversationState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [networkQuality, setNetworkQuality] = useState<'good' | 'poor' | 'unknown'>('unknown');
  const [isEnding, setIsEnding] = useState(false); // Track if we're in the process of ending the call

  // Refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<any>(null); // RTCDataChannel
  const localStreamRef = useRef<MediaStream | null>(null);
  const statsIntervalRef = useRef<number | null>(null);
  const isResponseActiveRef = useRef<boolean>(false); // Track if Sara is actively responding
  const lastSavedRoleRef = useRef<string | null>(null); // Track last saved role in THIS session
  const pendingSavesRef = useRef<Set<Promise<any>>>(new Set()); // Track pending save operations
  const isEndingRef = useRef(false); // Immediate ref for preventing duplicate end calls (synchronous)
  const conversationStateRef = useRef<ConversationState>('idle'); // Ref for accurate state reading in async functions
  // True from the moment a user transcript is saved until the paired assistant response is saved.
  // While this is true, navigation away is BLOCKED to prevent orphaned user messages.
  const awaitingAssistantResponseRef = useRef<boolean>(false);

  // Cleanup on unmount - wait for pending saves if possible
  useEffect(() => {
    return () => {
      // Log any pending saves that didn't complete
      if (pendingSavesRef.current.size > 0) {
        logger.warn(`[SaraRTC] Unmounting with ${pendingSavesRef.current.size} pending save(s) - these may be lost`);
      }
      disconnect();
    };
  }, []);

  // Block Android hardware back button while a user message is awaiting an assistant response
  // or while any save operation is still in flight.
  useEffect(() => {
    const onBackPress = () => {
      if (awaitingAssistantResponseRef.current || pendingSavesRef.current.size > 0) {
        logger.info('[SaraRTC] Back button blocked — awaiting assistant response or pending saves');
        // Still trigger end-call flow so the user sees the spinner and we wait properly
        handleEndCall();
        return true; // prevent default back navigation
      }
      // If nothing is pending, let handleEndCall drive navigation normally
      handleEndCall();
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  // Sync conversationState to ref for accurate reading in async functions
  useEffect(() => {
    conversationStateRef.current = conversationState;
  }, [conversationState]);

  // Fetch ephemeral token from backend
  const fetchToken = async (): Promise<string> => {
    const baseUrl = env.medicusAIApiBaseUrl;
    const tokenRequest = {
      convo_id: convoId,
      assistant,
      patient_id: patientId,
      doctor_id: doctorId,
      user_id: userId,
      sender_id: senderId,
    };

    console.log('[RTC] Fetching token with request:', {
      ...tokenRequest,
      expectedAgent: patientId ? 'medidoc' : 'docsolo',
    });

    const response = await authenticatedFetch(`${baseUrl}/realtime/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tokenRequest),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Token fetch failed: ${text}`);
    }

    const data = await response.json();
    console.log('[RTC] Token received, session:', data.session_id);
    return data.client_secret;
  };

  // Save a single message to backend with retry logic
  const saveMessage = async (role: string, text: string, maxRetries = 3): Promise<boolean> => {
    // Check if this would create consecutive messages with same role in THIS session
    if (lastSavedRoleRef.current === role) {
      logger.warn(`[SaraRTC] Skipping ${role} message - last saved was also ${role}`);
      return true;
    }

    // When a user message is about to be saved, mark that we're awaiting an assistant reply.
    // This flag stays true until the assistant message is successfully persisted,
    // blocking any navigation that would leave the conversation in an orphaned state.
    if (role === 'user') {
      awaitingAssistantResponseRef.current = true;
      logger.info('[SaraRTC] Awaiting assistant response — navigation blocked');
    }

    const saveOperation = (async () => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          logger.info(`[SaraRTC] Saving ${role} message (attempt ${attempt + 1}/${maxRetries}): ${text.substring(0, 50)}...`);
          const baseUrl = env.medicusAIApiBaseUrl;

          const response = await authenticatedFetch(`${baseUrl}/realtime/save-transcripts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              convo_id: convoId,
              messages: [{
                role,
                text,
                timestamp: new Date().toISOString(),
              }],
              assistant,
              patient_id: patientId,
              doctor_id: doctorId,
              user_id: userId,
              sender_id: senderId,
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to save message: ${response.status}`);
          }

          const result = await response.json();
          if (result.saved > 0) {
            // Update last saved role only if successfully saved
            lastSavedRoleRef.current = role;
            // Once the assistant message is confirmed saved, clear the block
            if (role === 'assistant') {
              awaitingAssistantResponseRef.current = false;
              logger.info('[SaraRTC] Assistant response saved — navigation unblocked');
            }
            logger.info(`[SaraRTC] ✅ Message saved: ${result.saved}/${result.total}`);
            return true;
          } else {
            logger.warn(`[SaraRTC] Message not saved: ${result.skipped} skipped, ${result.failed} failed`);
            return false;
          }
        } catch (err: any) {
          lastError = err as Error;
          logger.warn(`[SaraRTC] Save attempt ${attempt + 1} failed: ${(err?.message || String(err))}`);

          // Exponential backoff: 500ms, 1000ms, 2000ms
          if (attempt < maxRetries - 1) {
            const delay = Math.pow(2, attempt) * 500;
            logger.info(`[SaraRTC] Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // All retries failed — clear the block so we don't lock the user forever,
      // but log loudly so this failure is visible.
      if (role === 'user') {
        awaitingAssistantResponseRef.current = false;
        logger.error('[SaraRTC] ❌ User message save failed — clearing assistant-wait block to prevent deadlock');
      }
      logger.error(`[SaraRTC] ❌ Failed to save ${role} message after ${maxRetries} attempts: ` + (lastError?.message || String(lastError)));
      return false;
    })();

    // Track this pending save operation
    pendingSavesRef.current.add(saveOperation);

    try {
      const result = await saveOperation;
      return result;
    } finally {
      // Remove from pending saves when done
      pendingSavesRef.current.delete(saveOperation);
    }
  };

  // Execute tool call via backend
  const executeTool = async (toolName: string, args: any, callId: string) => {
    try {
      logger.info(`[SaraRTC] Executing tool: ${toolName}`);
      const baseUrl = env.medicusAIApiBaseUrl;

      const response = await authenticatedFetch(`${baseUrl}/realtime/execute-tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_name: toolName,
          arguments: args,
          convo_id: convoId,
          assistant,
          patient_id: patientId,
          doctor_id: doctorId,
          user_id: userId,
          sender_id: senderId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Tool execution failed: ${response.status}`);
      }

      const { output } = await response.json();
      logger.info(`[SaraRTC] Tool result: ${output.substring(0, 100)}...`);

      // Send function output back to OpenAI
      if (dcRef.current?.readyState === 'open') {
        dcRef.current.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: callId,
            output: output,
          },
        }));

        // Request AI response based on tool result
        dcRef.current.send(JSON.stringify({
          type: 'response.create',
        }));
      }
    } catch (err: any) {
      logger.error('[SaraRTC] Tool execution error: ' + (err?.message || String(err)));

      // Send error back to OpenAI
      if (dcRef.current?.readyState === 'open') {
        dcRef.current.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: callId,
            output: JSON.stringify({ error: err.message || 'Tool execution failed' }),
          },
        }));
      }
    }
  };

  // Monitor network quality using WebRTC stats
  const startNetworkQualityMonitoring = (pc: RTCPeerConnection) => {
    // Check stats every 3 seconds
    statsIntervalRef.current = setInterval(async () => {
      try {
        const stats = await pc.getStats();
        let packetsLost = 0;
        let packetsReceived = 0;
        let jitter = 0;

        stats.forEach((report: any) => {
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            packetsLost = report.packetsLost || 0;
            packetsReceived = report.packetsReceived || 0;
            jitter = report.jitter || 0;
          }
        });

        // Calculate packet loss percentage
        const totalPackets = packetsLost + packetsReceived;
        const lossPercentage = totalPackets > 0 ? (packetsLost / totalPackets) * 100 : 0;

        // Determine network quality
        // Good: <5% loss, <30ms jitter
        // Poor: >10% loss OR >50ms jitter
        if (lossPercentage > 10 || jitter > 0.05) {
          setNetworkQuality('poor');
          logger.warn(`[SaraRTC] Poor network: ${lossPercentage.toFixed(1)}% loss, ${(jitter * 1000).toFixed(0)}ms jitter`);
        } else if (lossPercentage < 5 && jitter < 0.03) {
          setNetworkQuality('good');
        }
      } catch (err: any) {
        logger.error('[SaraRTC] Failed to get stats: ' + (err?.message || String(err)));
      }
    }, 3000);
  };

  // Handle data channel messages from OpenAI
  const handleDCMessage = (event: any) => {
    try {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'session.created':
        case 'session.updated':
          logger.info('[SaraRTC] Session updated');
          break;

        case 'input_audio_buffer.speech_started':
          setConversationState('listening');
          // Only cancel if Sara is actively speaking (not just thinking)
          // This prevents canceling legitimate responses while allowing interruption
          if (dcRef.current && isResponseActiveRef.current) {
            (dcRef.current as any).send(JSON.stringify({
              type: 'response.cancel'
            }));
            logger.info('[SaraRTC] User interrupted - cancelled response');
            isResponseActiveRef.current = false;
            // The cancelled response will never produce a transcript, so if we were
            // awaiting an assistant reply we must clear that flag now to avoid a
            // deadlock on hangup. The user speaking again will re-set it.
            awaitingAssistantResponseRef.current = false;
          }
          break;

        case 'input_audio_buffer.speech_stopped':
          setConversationState('thinking');
          break;

        case 'response.audio.delta':
          setConversationState('speaking');
          isResponseActiveRef.current = true; // Sara is actively responding
          break;

        case 'response.done':
          setConversationState('listening');
          isResponseActiveRef.current = false; // Response finished
          // If response.done fires but no audio transcript was produced (e.g. tool-only
          // response or cancelled mid-generation), clear the assistant-wait flag so
          // handleEndCall doesn't block indefinitely.
          if (awaitingAssistantResponseRef.current) {
            // Give the in-flight assistant save one final tick to land first
            setTimeout(() => {
              if (awaitingAssistantResponseRef.current) {
                logger.warn('[SaraRTC] response.done but assistant response not yet saved — clearing block after brief delay');
                awaitingAssistantResponseRef.current = false;
              }
            }, 2000);
          }
          break;

        case 'response.output_item.done':
          // Handle function calls
          if (data.item?.type === 'function_call') {
            const { name, call_id, arguments: argsStr } = data.item;
            logger.info(`[SaraRTC] Function call: ${name}`);
            try {
              const args = JSON.parse(argsStr);
              executeTool(name, args, call_id);
            } catch (parseErr: any) {
              logger.error('[SaraRTC] Failed to parse function args: ' + parseErr?.message);
            }
          }
          break;

        case 'conversation.item.input_audio_transcription.completed':
          const userTranscript = data.transcript || '';
          setTranscript(userTranscript);

          // Save user message immediately to database
          if (userTranscript.trim()) {
            saveMessage('user', userTranscript);
            logger.info(`[SaraRTC] User transcript: ${userTranscript.substring(0, 50)}...`);
          }
          break;

        case 'response.audio_transcript.done':
          // Save assistant response transcript immediately to database
          if (data.transcript) {
            saveMessage('assistant', data.transcript);
            logger.info(`[SaraRTC] Assistant transcript: ${data.transcript.substring(0, 50)}...`);
          }
          break;

        case 'error':
          const errMsg = data.error?.message || JSON.stringify(data.error) || 'Unknown API error';
          // Ignore "no active response" errors from cancellation attempts
          if (errMsg.includes('no active response')) {
            logger.info('[SaraRTC] Cancellation attempt when no response active (expected)');
          } else {
            logger.error('[SaraRTC] API error: ' + errMsg);
            setError(errMsg);
          }
          break;
      }
    } catch (err: any) {
      logger.error('[SaraRTC] DC message parse error: ' + (err?.message || String(err)));
    }
  };

  // Connect via WebRTC
  const connect = useCallback(async () => {
    try {
      setConnectionState('fetching_token');
      setError(null);

      // Set audio mode for voice chat
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // 1. Fetch ephemeral token
      logger.info('[SaraRTC] Fetching token...');
      const token = await fetchToken();
      logger.info('[SaraRTC] Token received');

      setConnectionState('connecting');

      // 2. Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc;

      // 3. Get mic audio with echo cancellation
      const stream = await mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000,
        } as any, // react-native-webrtc types don't include these properties
        video: false,
      });
      localStreamRef.current = stream;

      // Add audio track to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // 4. Handle remote audio (Sara's voice) — WebRTC plays it automatically
      (pc as any).addEventListener('track', () => {
        logger.info('[SaraRTC] Remote track received');
        // WebRTC handles playback automatically
      });

      (pc as any).addEventListener('connectionstatechange', () => {
        logger.info('[SaraRTC] Connection state: ' + pc.connectionState);
        if (pc.connectionState === 'connected') {
          setConnectionState('connected');
          setConversationState('listening');

          // Start monitoring network quality
          startNetworkQualityMonitoring(pc);
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setError('Connection lost');
          setConnectionState('error');

          // Stop monitoring
          if (statsIntervalRef.current) {
            clearInterval(statsIntervalRef.current);
            statsIntervalRef.current = null;
          }
        }
      });

      // 5. Create data channel for events (transcripts, session updates, etc.)
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      (dc as any).addEventListener('open', () => {
        logger.info('[SaraRTC] Data channel open');
        // Configure session with server_vad tuned for poor network conditions
        dc.send(JSON.stringify({
          type: 'session.update',
          session: {
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 700,  // Longer silence before turn ends (prevents interruption)
            },
            input_audio_transcription: { model: 'whisper-1' },
          },
        }));
      });

      (dc as any).addEventListener('message', handleDCMessage);

      // 6. SDP offer/answer exchange with OpenAI
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await pc.setLocalDescription(offer);

      // SDP exchange via backend proxy (avoids iOS simulator network issues)
      logger.info('[SaraRTC] Sending SDP offer via backend proxy...');
      const baseUrl = env.medicusAIApiBaseUrl;
      const sdpResponse = await authenticatedFetch(`${baseUrl}/realtime/sdp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sdp: offer.sdp,
          token,
          model: OPENAI_REALTIME_MODEL,
        }),
      });

      if (!sdpResponse.ok) {
        const errText = await sdpResponse.text();
        throw new Error(`SDP exchange failed (${sdpResponse.status}): ${errText}`);
      }

      const { sdp: answerSdp } = await sdpResponse.json();
      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: 'answer', sdp: answerSdp })
      );

      logger.info('[SaraRTC] WebRTC connected');

    } catch (err: any) {
      logger.error('[SaraRTC] Connection failed: ' + (err?.message || String(err)));
      setError(err.message || 'Connection failed');
      setConnectionState('error');
    }
  }, [convoId, assistant, patientId, doctorId, userId, senderId]);

  // Disconnect
  const disconnect = () => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }

    if (dcRef.current) {
      try { dcRef.current.close(); } catch {}
      dcRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    setConnectionState('idle');
    setConversationState('idle');
  };

  // End call - waits for all pending saves AND the paired assistant response to complete
  // before disconnecting. This prevents the DB constraint violation where a user message
  // has no following assistant message.
  const handleEndCall = async () => {
    // Prevent multiple simultaneous end calls - use ref for immediate synchronous check
    if (isEndingRef.current) {
      logger.info('[SaraRTC] Already ending call, ignoring duplicate request');
      return;
    }

    // Immediately mark as ending to prevent further clicks
    isEndingRef.current = true;
    setIsEnding(true);

    logger.info('[SaraRTC] Ending call, waiting for pending saves...');
    logger.info(`[SaraRTC] Current state: conversationState=${conversationStateRef.current}, isResponseActive=${isResponseActiveRef.current}, pendingSaves=${pendingSavesRef.current.size}, awaitingAssistant=${awaitingAssistantResponseRef.current}`);

    // ── Phase 1: wait for any in-flight HTTP save requests to finish ─────────
    const pendingSaves = Array.from(pendingSavesRef.current);
    if (pendingSaves.length > 0) {
      logger.info(`[SaraRTC] Waiting for ${pendingSaves.length} pending save(s)...`);
      await Promise.all(pendingSaves);
      logger.info('[SaraRTC] All pending saves completed');
    } else {
      logger.info('[SaraRTC] No pending saves to wait for');
    }

    // ── Phase 2: if a user message was saved but Sara hasn't replied yet,
    //    wait for the full response cycle (thinking → speaking → response.done
    //    → assistant message saved) before disconnecting.
    //
    //    This covers the key edge-case: user speaks, transcript saved immediately,
    //    user hits hangup while Sara is still "thinking". Without this wait we
    //    would disconnect before response.audio_transcript.done fires, leaving an
    //    orphaned user message that violates the DB consecutive-role constraint.
    const MAX_WAIT_MS = 20000; // never hang forever
    const POLL_INTERVAL_MS = 300;

    if (awaitingAssistantResponseRef.current) {
      logger.info('[SaraRTC] User message saved but assistant reply not yet persisted — waiting...');
      const waitStart = Date.now();

      while (awaitingAssistantResponseRef.current && Date.now() - waitStart < MAX_WAIT_MS) {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      if (awaitingAssistantResponseRef.current) {
        logger.warn('[SaraRTC] Assistant response did not arrive within max wait — proceeding with disconnect to avoid deadlock');
        awaitingAssistantResponseRef.current = false;
      } else {
        logger.info('[SaraRTC] Assistant response confirmed saved — safe to disconnect');
      }
    }

    // ── Phase 3: also wait for any new pending saves triggered while we polled ─
    const remainingSaves = Array.from(pendingSavesRef.current);
    if (remainingSaves.length > 0) {
      logger.info(`[SaraRTC] Waiting for ${remainingSaves.length} additional pending save(s)...`);
      await Promise.all(remainingSaves);
    }

    disconnect();

    // Socket.IO already delivered WebRTC messages into the React Query cache
    // while the call was active — no invalidation needed. Invalidating here
    // would wipe those optimistic entries and trigger a DB re-fetch that races
    // with navigation, causing the messages to briefly disappear.
    router.back();
  };

  // Auto-connect on mount
  useEffect(() => {
    if (!convoId) {
      setError('Missing conversation ID');
      return;
    }
    connect();
  }, []);

  // Get status message
  const getStatusMessage = (): string => {
    if (isEnding) return 'Saving conversation...';
    if (error) return error;
    if (connectionState === 'fetching_token') return 'Preparing session...';
    if (connectionState === 'connecting') return 'Connecting to Sara...';
    if (connectionState === 'error') return 'Connection failed';
    if (conversationState === 'listening') return 'Listening...';
    if (conversationState === 'thinking') return 'Sara is thinking...';
    if (conversationState === 'speaking') return 'Sara is speaking...';
    return 'Connecting...';
  };

  const isActive = conversationState !== 'idle';
  const isConnecting = connectionState === 'fetching_token' || connectionState === 'connecting';

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity onPress={handleEndCall} disabled={isEnding} className="p-2">
          <Ionicons name="arrow-back" size={24} color={isEnding ? '#9CA3AF' : '#374151'} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">Sara Real-Time</Text>
        <View className="flex-row items-center">
          <View
            className="w-2 h-2 rounded-full mr-1"
            style={{ backgroundColor: connectionState === 'connected' ? '#22C55E' : '#9CA3AF' }}
          />
          <Text className="text-xs text-gray-500">
            {connectionState === 'connected' ? 'Live' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* Main Content */}
      <View className="flex-1 justify-center items-center px-4">
        {/* Error Banner */}
        {error && (
          <View className="absolute top-4 left-4 right-4 bg-red-50 border border-red-200 rounded-xl p-3">
            <Text className="text-red-700 text-center text-sm">{error}</Text>
            <TouchableOpacity onPress={() => { setError(null); connect(); }} className="mt-2 self-center">
              <Text className="text-red-600 font-medium text-sm">Tap to retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Poor Network Warning */}
        {networkQuality === 'poor' && !error && (
          <View className="absolute top-4 left-4 right-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
            <View className="flex-row items-center justify-center">
              <Ionicons name="warning-outline" size={16} color="#D97706" />
              <Text className="text-yellow-700 text-center text-sm ml-2">
                Slow connection detected - Sara may pause briefly
              </Text>
            </View>
          </View>
        )}

        {/* Avatar */}
        <View className="items-center justify-center" style={{ width: AVATAR_SIZE + 40, height: AVATAR_SIZE + 40 }}>
          <PulsingRing isActive={isActive || isConnecting} />
          <View className="rounded-full overflow-hidden bg-gray-100" style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}>
            <Image source={require('@/assets/images/Sara.png')} style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }} resizeMode="cover" />
          </View>
        </View>

        {/* Status */}
        <Text className="text-gray-700 text-lg font-medium mt-6">{getStatusMessage()}</Text>

        {(isConnecting || isEnding) && <ActivityIndicator size="small" color="#F05C0C" className="mt-4" />}

        {/* Transcript */}
        {transcript && (
          <View className="mt-6 px-6 max-w-full">
            <Text className="text-gray-600 text-center text-sm" numberOfLines={3}>
              "{transcript.slice(0, 150)}{transcript.length > 150 ? '...' : ''}"
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Controls */}
      <View className="px-6 pb-8 pt-4">
        <View className="flex-row justify-center items-center">
          <TouchableOpacity
            onPress={() => {
              // Immediate synchronous check using ref before any async work
              if (isEndingRef.current) {
                logger.info('[SaraRTC] Button pressed but already ending, ignoring');
                return;
              }
              handleEndCall();
            }}
            disabled={isEnding}
            activeOpacity={0.7}
            className="w-20 h-20 rounded-full items-center justify-center"
            style={{ backgroundColor: isEnding ? '#9CA3AF' : '#EF4444' }}
          >
            {isEnding ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="call" size={32} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
            )}
          </TouchableOpacity>
        </View>
        <Text className="text-gray-400 text-center text-sm mt-4">
          {isEnding ? 'Saving conversation...' : 'Speak naturally - Sara will respond when you pause'}
        </Text>
      </View>
    </SafeAreaView>
  );
}