import { FormFieldWrapper, UnifiedDropdown } from '@/components/shared/ui';
import { countryCodes } from '@/components/shared/ui/Form/PhoneInput/countryCodes';
import { useAnimatedFormField } from '@/hooks/ui/forms';
import { Ionicons } from '@expo/vector-icons';
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { getCountryFromLocation, logger } from '@/utils';
import { validateEmail } from '@/utils/validation';
import { commonValidationRules } from '@/hooks/ui/forms/useFormValidation';

interface ContactInformationProps {
  profileData: {
    email: string;
    phone: string;
    emailVerified: boolean;
    phoneVerified: boolean;
  };
  onPhoneUpdate: (_fullPhoneNumber: string) => Promise<void>;
  isUpdatingContact: boolean;
}

export const ContactInformation: React.FC<ContactInformationProps> = ({
  profileData,
  onPhoneUpdate,
  isUpdatingContact,
}) => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(
    countryCodes.find(c => c.code === 'US') || countryCodes[0]
  );
  const selectedCountryRef = useRef(selectedCountry);
  const [isPhoneInitialized, setIsPhoneInitialized] = useState(false);
  const [isCountryDetected, setIsCountryDetected] = useState(false);

  // Validation State
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const countryOptions = useMemo(
    () =>
      countryCodes.map(country => ({
        key: country.code,
        value: country.code,
        label: country.name,
        icon: country.flag,
        description: country.dial_code,
        metadata: country,
      })),
    []
  );

  useEffect(() => {
    const detectCountry = async () => {
      if (!isCountryDetected && !profileData.phone) {
        const detectedCountryCode = await getCountryFromLocation();

        const country = countryCodes.find(c => c.code === detectedCountryCode);
        if (country) {
          setSelectedCountry(country);
          selectedCountryRef.current = country;
        }
        setIsCountryDetected(true);
      }
    };

    detectCountry();
  }, [isCountryDetected, profileData.phone]);

  // Update ref whenever selectedCountry changes
  useEffect(() => {
    selectedCountryRef.current = selectedCountry;
  }, [selectedCountry]);

  const formFields = ['email', 'phone'];

  const {
    selectedInput,
    getBorderColor,
    getLabelStyle,
    handleFocus,
    handleBlur,
  } = useAnimatedFormField(formFields, 'white');

  const handlePhoneChange = useCallback(
    (value: string) => {
      setPhone(value);
      // Validate phone on change if it has an error
      if (phoneError) {
        setPhoneError(null);
      }
    },
    [phoneError]
  );

  const handleEmailChange = useCallback(
    (value: string) => {
      setEmail(value);
      // Validate email on change if it has an error
      if (emailError) {
        setEmailError(null);
      }
    },
    [emailError]
  );

  const validateEmailField = useCallback(() => {
    const error = validateEmail(email);
    setEmailError(error);
    return !error;
  }, [email]);

  const validatePhoneField = useCallback(() => {
    // Basic phone validation using common rules
    // adapting similar logic from useFormValidation phone rule
    const error = commonValidationRules.phone(phone, {
      countryCode: selectedCountryRef.current.code,
    });
    setPhoneError(error);
    return !error;
  }, [phone]);

  const handleCountrySelect = useCallback(
    (countryCode: string) => {
      const country = countryCodes.find(c => c.code === countryCode);
      if (country) {
        setSelectedCountry(country);
        selectedCountryRef.current = country;
        // Keep existing phone number without reformatting
        if (phone) {
          // const formatted = formatPhone(phone, country.code);
          // setPhone(formatted);
        }
      }
    },
    [phone]
  );

  // Load user data when component mounts or profileData changes
  useEffect(() => {
    setEmail(profileData.email);

    // Handle phone number initialization
    const rawPhone = profileData.phone;

    if (rawPhone && (!isPhoneInitialized || phone === '')) {
      setPhone(rawPhone);

      logger.info('Phone initialized/updated from server', {
        component: 'ContactInformation',
        rawPhone,
        selectedCountry: selectedCountryRef.current.code,
        formattedPhone: rawPhone,
        wasInitialized: isPhoneInitialized,
      });

      setIsPhoneInitialized(true);
    } else if (!rawPhone && !isPhoneInitialized) {
      // Clear phone if no data
      setPhone('');
      setIsPhoneInitialized(true);
    }
  }, [profileData.email, profileData.phone, isPhoneInitialized]);

  const handlePhoneUpdate = async () => {
    const cleanCurrentPhone = phone.replace(/\D/g, '');
    const cleanProfilePhone = profileData.phone.replace(/\D/g, '');

    logger.info('Phone update attempt', {
      component: 'ContactInformation',
      cleanCurrentPhone,
      cleanProfilePhone,
      phoneInput: phone,
      profilePhone: profileData.phone,
      selectedCountry: selectedCountryRef.current.code,
      dialCode: selectedCountryRef.current.dial_code,
      phoneLength: phone.length,
    });

    if (cleanCurrentPhone !== cleanProfilePhone && phone.length > 0) {
      try {
        await onPhoneUpdate(cleanCurrentPhone);
        Alert.alert('Success', 'Phone number updated successfully!');
      } catch (error: any) {
        setPhone(profileData.phone);
        Alert.alert(
          'Error',
          error.message || 'Failed to update phone number. Please try again.'
        );
      }
    } else {
      logger.warn('Phone update skipped', {
        component: 'ContactInformation',
        reason:
          cleanCurrentPhone === cleanProfilePhone
            ? 'phones are equal'
            : 'phone length is 0',
        cleanCurrentPhone,
        cleanProfilePhone,
        phoneLength: phone.length,
      });
      Alert.alert('Info', 'No changes detected or phone number is empty.');
    }
  };

  const isPhoneChanged = () => {
    const cleanCurrentPhone = phone.replace(/\D/g, '');
    const cleanProfilePhone = profileData.phone.replace(/\D/g, '');

    return cleanCurrentPhone !== cleanProfilePhone && phone.length > 0;
  };

  const isSamePhone = () => {
    const cleanCurrentPhone = phone.replace(/\D/g, '');
    const cleanProfilePhone = profileData.phone.replace(/\D/g, '');

    return cleanCurrentPhone === cleanProfilePhone;
  };

  return (
    <View className="bg-white mx-4 mt-4 rounded-lg border-b border-gray-200 p-4">
      <Text className="text-lg font-semibold text-gray-900 mb-6">
        Contact Information
      </Text>

      <View>
        {/* Email Section */}
        <View className="mb-6">
          <FormFieldWrapper
            type="text"
            field="email"
            value={email}
            label="Email Address"
            placeholder="Enter email address"
            isActive={selectedInput === 'email'}
            borderColor={getBorderColor('email')}
            labelStyle={getLabelStyle('email')}
            onFocus={() => handleFocus('email')}
            onBlur={() => {
              handleBlur('email');
              if (email !== profileData.email && email.length > 0) {
                validateEmailField();
              }
            }}
            onChangeText={handleEmailChange}
            keyboardType="email-address"
            autoCapitalize="none"
            disabled={true}
          />

          {/* Email Submit Button */}
        </View>

        <View className="flex-row items-center mb-2">
          <View className="flex-1">
            <FormFieldWrapper
              type="text"
              field="phone"
              value={phone}
              label="Phone Number"
              placeholder={
                selectedCountry.mask
                  ? selectedCountry.mask.replace(/#/g, '0')
                  : 'Enter phone number'
              }
              isActive={selectedInput === 'phone'}
              borderColor={getBorderColor('phone')}
              labelStyle={getLabelStyle('phone')}
              onFocus={() => handleFocus('phone')}
              onBlur={() => {
                handleBlur('phone');
                if (isPhoneChanged()) {
                  validatePhoneField();
                }
              }}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              disabled={true}
            />
          </View>
        </View>

        {/* Phone Submit Button */}
      </View>
    </View>
  );
};
