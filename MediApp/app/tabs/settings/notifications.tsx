import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  Text,
  Switch,
  Alert,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Linking,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

import { StandardScreenLayout } from '@/components/shared/layout/StandardScreenLayout';
import {
  medicusNotificationAPI,
  ChannelSettings,
  NotificationCategory,
  PATIENT_NOTIFICATION_CATEGORIES,
  DOCTOR_NOTIFICATION_CATEGORIES,
} from '@/services/notifications';
import { getCurrentUser, updateCurrentUser } from '@/services/user';
import { useAppContext } from '@/contexts/AppContext';
import { logger } from '@/utils';

// ---------------------------------------------------------------------------
// Email validation helper
// ---------------------------------------------------------------------------
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidEmail = (value: string): boolean => EMAIL_REGEX.test(value.trim());

// ---------------------------------------------------------------------------
// EmailCaptureModal
// ---------------------------------------------------------------------------
interface EmailCaptureModalProps {
  visible: boolean;
  saving: boolean;
  onSave: (email: string) => void;
  onCancel: () => void;
}

const EmailCaptureModal: React.FC<EmailCaptureModalProps> = ({
  visible,
  saving,
  onSave,
  onCancel,
}) => {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);

  const valid = isValidEmail(email);
  const showError = touched && !valid;

  // Reset state every time modal opens
  useEffect(() => {
    if (visible) {
      setEmail('');
      setTouched(false);
    }
  }, [visible]);

  const handleSave = () => {
    setTouched(true);
    if (!valid) return;
    onSave(email.trim());
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-center items-center bg-black/50"
      >
        <View className="bg-white rounded-2xl mx-6 p-6 w-full max-w-sm shadow-xl">
          {/* Header */}
          <View className="flex-row items-center mb-3">
            <MaterialCommunityIcons
              name="email-outline"
              size={24}
              color="#F05C0C"
            />
            <Text className="ml-2 text-lg font-bold text-gray-900">
              Add Your Email
            </Text>
          </View>

          <Text className="text-sm text-gray-500 mb-5 leading-5">
            To receive email notifications, we need your email address.
          </Text>

          {/* Email input */}
          <TextInput
            value={email}
            onChangeText={text => {
              setEmail(text);
              if (!touched) setTouched(false); // keep error hidden while typing first chars
            }}
            onBlur={() => setTouched(true)}
            placeholder="your@email.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!saving}
            className={`border rounded-xl px-4 py-3 text-base text-gray-900 ${
              showError
                ? 'border-red-400 bg-red-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          />

          {/* Validation error */}
          {showError && (
            <Text className="text-xs text-red-500 mt-1 ml-1">
              Please enter a valid email address.
            </Text>
          )}

          {/* Buttons */}
          <View className="flex-row mt-6 gap-3">
            <TouchableOpacity
              onPress={onCancel}
              disabled={saving}
              className="flex-1 border border-gray-200 rounded-xl py-3 items-center"
            >
              <Text className="text-base font-medium text-gray-600">
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || (!valid && touched)}
              className={`flex-1 rounded-xl py-3 items-center ${
                saving || (!valid && touched) ? 'bg-orange-300' : 'bg-[#F05C0C]'
              }`}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-base font-semibold text-white">
                  Save & Enable
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
const NotificationSettings: React.FC = () => {
  const { userAssistant } = useAppContext();

  // Get mode-specific categories (mediaid = patient, medidoc = doctor)
  const categoryConfig = useMemo(() => {
    return userAssistant === 'medidoc'
      ? DOCTOR_NOTIFICATION_CATEGORIES
      : PATIENT_NOTIFICATION_CATEGORIES;
  }, [userAssistant]);

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [osPermission, setOsPermission] = useState<
    'granted' | 'denied' | 'undetermined'
  >('undetermined');
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Defaults until the saved settings load from the server.
  const [channels, setChannels] = useState<ChannelSettings>({
    push_enabled: true,
    email_enabled: true,
    sms_enabled: false,
    quiet_hours_enabled: false,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  });

  const [categories, setCategories] = useState<Record<string, boolean>>({});

  // Email modal state
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);

  // Check OS-level notification permission
  const checkOsPermission = useCallback(async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setOsPermission(
        status === 'granted'
          ? 'granted'
          : status === 'denied'
            ? 'denied'
            : 'undetermined'
      );
      return status;
    } catch (error) {
      logger.error(
        'Failed to check OS notification permission',
        error as Error,
        {
          component: 'NotificationSettings',
        }
      );
      return 'undetermined';
    }
  }, []);

  // Re-check OS permissions when app returns to foreground
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        const status = await checkOsPermission();
        // If user just enabled notifications at OS level, sync push_enabled to backend
        if (status === 'granted' && !channels.push_enabled) {
          setChannels(prev => ({ ...prev, push_enabled: true }));
          try {
            await medicusNotificationAPI.updateChannelSettings(
              { push_enabled: true },
              userAssistant
            );
          } catch {
            // Silently fail — user will see the correct state on next load
          }
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );
    return () => subscription.remove();
  }, [checkOsPermission, channels.push_enabled, userAssistant]);

  const loadSettings = useCallback(async () => {
    try {
      // Fetch OS permission, notification settings, and user profile in parallel
      const [settings, user] = await Promise.all([
        medicusNotificationAPI.getSettings(userAssistant),
        getCurrentUser().catch(() => null), // user profile fetch is best-effort
        checkOsPermission(),
      ]);

      // Check whether the user actually has an email address
      const hasEmail =
        user !== null &&
        typeof user.email === 'string' &&
        user.email.trim().length > 0;

      // If the backend says email is enabled but the user has no email,
      // snap it back to false locally and sync the backend in the background.
      const resolvedChannels = { ...settings.channels };
      if (resolvedChannels.email_enabled && !hasEmail) {
        resolvedChannels.email_enabled = false;
        medicusNotificationAPI
          .updateChannelSettings({ email_enabled: false }, userAssistant)
          .catch(err =>
            logger.error(
              'Failed to auto-disable email channel (no email on account)',
              err as Error,
              { component: 'NotificationSettings' }
            )
          );
      }

      setChannels(resolvedChannels);

      // Initialize categories based on mode-specific config
      const catMap: Record<string, boolean> = {};
      categoryConfig.forEach(cat => {
        catMap[cat.value] = true; // Default to enabled
      });
      // Override with server values
      settings.categories.forEach(c => {
        if (catMap.hasOwnProperty(c.category)) {
          catMap[c.category] = c.enabled;
        }
      });
      setCategories(catMap);
    } catch (error) {
      logger.error('Failed to load settings', error as Error, {
        component: 'NotificationSettings',
      });
    } finally {
      setLoading(false);
    }
  }, [categoryConfig, userAssistant, checkOsPermission]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const toggleMasterSwitch = async () => {
    // If OS notifications are denied, prompt user to open Settings instead
    if (osPermission !== 'granted') {
      Alert.alert(
        'Notifications Disabled',
        'Push notifications are turned off at the system level. Open Settings to enable them.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    const newValue = !channels.push_enabled;
    const prevChannels = { ...channels };

    setChannels(prev => ({ ...prev, push_enabled: newValue }));
    setUpdating('master');

    try {
      await medicusNotificationAPI.updateChannelSettings(
        { push_enabled: newValue },
        userAssistant
      );
    } catch {
      setChannels(prevChannels);
      Alert.alert('Error', 'Could not save. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Toggle email / SMS channels
  // ---------------------------------------------------------------------------
  const toggleChannel = async (key: 'email' | 'sms') => {
    const fieldName = `${key}_enabled` as keyof ChannelSettings;
    const newValue = !channels[fieldName];
    const prevValue = channels[fieldName];

    // ---- Special flow: turning email ON ----
    if (key === 'email' && newValue === true) {
      // Optimistically reflect the toggle
      setChannels(prev => ({ ...prev, email_enabled: true }));
      setUpdating('channel:email');

      try {
        const user = await getCurrentUser();
        const hasEmail =
          typeof user.email === 'string' && user.email.trim().length > 0;

        if (hasEmail) {
          // User already has an email — activate directly
          await medicusNotificationAPI.updateChannelSettings(
            { email_enabled: true },
            userAssistant
          );
        } else {
          // No email on file — show the capture modal
          setUpdating(null);
          setEmailModalVisible(true);
          // Modal callbacks handle the rest; revert optimistic state for now
          // (modal onSave will re-set it to true on success)
          setChannels(prev => ({ ...prev, email_enabled: false }));
        }
      } catch {
        // Network/auth error fetching user — revert
        setChannels(prev => ({ ...prev, email_enabled: false }));
        Alert.alert(
          'Error',
          'Could not retrieve your account info. Please try again.'
        );
      } finally {
        setUpdating(null);
      }
      return;
    }

    // ---- Standard flow for all other toggles ----
    setChannels(prev => ({ ...prev, [fieldName]: newValue }));
    setUpdating(`channel:${key}`);

    try {
      await medicusNotificationAPI.updateChannelSettings(
        { [fieldName]: newValue },
        userAssistant
      );
    } catch {
      setChannels(prev => ({ ...prev, [fieldName]: prevValue }));
      Alert.alert('Error', 'Could not save. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Email modal callbacks
  // ---------------------------------------------------------------------------
  const handleEmailSave = async (enteredEmail: string) => {
    setEmailSaving(true);
    try {
      // 1. Persist email to MedicusUser
      await updateCurrentUser({ email: enteredEmail });

      // 2. Activate email channel on MedicusNotification
      await medicusNotificationAPI.updateChannelSettings(
        { email_enabled: true },
        userAssistant
      );

      // 3. Reflect success in UI
      setChannels(prev => ({ ...prev, email_enabled: true }));
      setEmailModalVisible(false);

      logger.auditLog('email_added_for_notifications', '', {
        component: 'NotificationSettings',
      });
    } catch (error) {
      logger.error('Failed to save email for notifications', error as Error, {
        component: 'NotificationSettings',
      });
      Alert.alert(
        'Could not save email',
        'Please check the address and try again.'
      );
      // Keep modal open so the user can correct or retry
    } finally {
      setEmailSaving(false);
    }
  };

  const handleEmailCancel = () => {
    // Revert the optimistic toggle (already false from the special-flow branch)
    setEmailModalVisible(false);
  };

  const toggleCategory = async (
    category: NotificationCategory,
    canDisable?: boolean
  ) => {
    if (!canDisable && categories[category]) {
      Alert.alert('Required', 'Security notifications cannot be disabled.');
      return;
    }

    const newValue = !categories[category];
    const prevValue = categories[category];

    setCategories(prev => ({ ...prev, [category]: newValue }));
    setUpdating(`cat:${category}`);

    try {
      await medicusNotificationAPI.updateCategorySetting(
        { category, enabled: newValue },
        userAssistant
      );
    } catch {
      setCategories(prev => ({ ...prev, [category]: prevValue }));
      Alert.alert('Error', 'Could not save. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <StandardScreenLayout title="Notifications">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#F05C0C" />
        </View>
      </StandardScreenLayout>
    );
  }

  return (
    <StandardScreenLayout title="Notifications">
      {/* Email capture modal */}
      <EmailCaptureModal
        visible={emailModalVisible}
        saving={emailSaving}
        onSave={handleEmailSave}
        onCancel={handleEmailCancel}
      />

      {/* OS Permission Banner */}
      {osPermission === 'denied' && (
        <View className="mx-4 mt-4 bg-amber-50 rounded-xl border border-amber-200 p-4">
          <View className="flex-row items-start">
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={22}
              color="#D97706"
              style={{ marginTop: 1 }}
            />
            <View className="flex-1 ml-3">
              <Text className="text-sm font-semibold text-amber-800">
                Notifications are blocked
              </Text>
              <Text className="text-xs text-amber-700 mt-1">
                Push notifications are turned off in your device settings.
                Enable them to receive alerts.
              </Text>
              <TouchableOpacity
                onPress={() => Linking.openSettings()}
                className="mt-3 bg-amber-600 rounded-lg py-2 px-4 self-start"
              >
                <Text className="text-white text-sm font-semibold">
                  Open Settings
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Master Switch */}
      <View className="mt-4 mx-4">
        <View className="bg-white rounded-xl border border-gray-200">
          <View className="flex-row items-center justify-between px-4 py-4">
            <View className="flex-1">
              <Text className="text-base text-gray-900">
                Allow Notifications
              </Text>
              {osPermission === 'denied' && (
                <Text className="text-xs text-amber-600 mt-0.5">
                  Blocked by system
                </Text>
              )}
            </View>
            {updating === 'master' ? (
              <ActivityIndicator size="small" color="#F05C0C" />
            ) : (
              <Switch
                value={osPermission === 'granted' && channels.push_enabled}
                onValueChange={toggleMasterSwitch}
                trackColor={{ false: '#E5E7EB', true: '#F05C0C' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E5E7EB"
              />
            )}
          </View>
        </View>
      </View>

      {osPermission === 'granted' && channels.push_enabled && (
        <>
          {/* Delivery Channels */}
          <View className="mt-6 mx-4">
            <Text className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 px-1">
              Also Send Via
            </Text>
            <View className="bg-white rounded-xl border border-gray-200">
              {/* Email row */}
              <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
                <View className="flex-1">
                  <Text className="text-base text-gray-900">Email</Text>
                </View>
                {updating === 'channel:email' ? (
                  <ActivityIndicator size="small" color="#F05C0C" />
                ) : (
                  <Switch
                    value={channels.email_enabled}
                    onValueChange={() => toggleChannel('email')}
                    trackColor={{ false: '#E5E7EB', true: '#F05C0C' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#E5E7EB"
                  />
                )}
              </View>

              {/* SMS row */}
              <View className="flex-row items-center justify-between px-4 py-3">
                <Text className="text-base text-gray-900">SMS</Text>
                {updating === 'channel:sms' ? (
                  <ActivityIndicator size="small" color="#F05C0C" />
                ) : (
                  <Switch
                    value={channels.sms_enabled}
                    onValueChange={() => toggleChannel('sms')}
                    trackColor={{ false: '#E5E7EB', true: '#F05C0C' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#E5E7EB"
                  />
                )}
              </View>
            </View>
          </View>

          {/* Notification Types */}
          <View className="mt-6 mx-4">
            <Text className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 px-1">
              Notification Types
            </Text>
            <View className="bg-white rounded-xl border border-gray-200">
              {categoryConfig.map((cat, idx) => (
                <View
                  key={cat.value}
                  className={`flex-row items-center justify-between px-4 py-3 ${idx < categoryConfig.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <View className="flex-1">
                    <Text className="text-base text-gray-900">{cat.label}</Text>
                    {!cat.canDisable && (
                      <Text className="text-xs text-gray-400">Required</Text>
                    )}
                  </View>
                  {updating === `cat:${cat.value}` ? (
                    <ActivityIndicator size="small" color="#F05C0C" />
                  ) : !cat.canDisable ? (
                    <MaterialCommunityIcons
                      name="check"
                      size={22}
                      color="#F05C0C"
                    />
                  ) : (
                    <Switch
                      value={categories[cat.value] ?? true}
                      onValueChange={() =>
                        toggleCategory(
                          cat.value as NotificationCategory,
                          cat.canDisable
                        )
                      }
                      trackColor={{ false: '#E5E7EB', true: '#F05C0C' }}
                      thumbColor="#FFFFFF"
                      ios_backgroundColor="#E5E7EB"
                    />
                  )}
                </View>
              ))}
            </View>
          </View>

        </>
      )}
    </StandardScreenLayout>
  );
};

export default NotificationSettings;
