import { Button, CustomModal, Divider } from '@/components/shared/ui';
import { PasswordField } from '@/components/shared/ui/Form';

// Define field types for each role
import { FormFieldWrapper } from '@/components/shared/ui/Form/FormFieldWrapper';
import {
  commonValidationRules,
  useAnimatedFormField,
  useFormValidation,
  useModal,
} from '@/hooks';
import {
  useRegisterMutation,
  useSendVerificationCodeMutation,
} from '@/hooks/auth/mutations';
import { UserRole as AuthUserRole, UserRegisterRequest } from '@/types/auth';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, Image, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RoleSelector, UserRole } from './RoleSelector';

// Define field types for each role
// type PatientFormFieldKey = "firstName" | "lastName" | "email" | "phone" | "password" | "confirmPassword" | "countryCode";
// type DoctorFormFieldKey = "firstName" | "lastName" | "email" | "phone" | "password" | "confirmPassword" | "countryCode";

//! Hide phone since it's optional
type PatientFormFieldKey =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'password'
  | 'confirmPassword'
  | 'countryCode';
type DoctorFormFieldKey =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'password'
  | 'confirmPassword'
  | 'countryCode';
type FormFieldKey = PatientFormFieldKey | DoctorFormFieldKey;

const SignUpForm: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<UserRole>('patient');

  // Progressive form state
  const [, setCompletedFields] = useState<Set<string>>(new Set());
  const [fieldAnimations] = useState({
    firstName: new Animated.Value(1),
    lastName: new Animated.Value(0),
    email: new Animated.Value(0),
    // phone: new Animated.Value(0),
    password: new Animated.Value(0),
    confirmPassword: new Animated.Value(0),
  });

  // Separate scale animations for bounce effect
  const [scaleAnimations] = useState({
    firstName: new Animated.Value(1),
    lastName: new Animated.Value(1),
    email: new Animated.Value(1),
    // phone: new Animated.Value(1),
    password: new Animated.Value(1),
    confirmPassword: new Animated.Value(1),
  });

  // Use custom hooks
  const { modalProps, showModal, hideModal } = useModal();

  // Mutation hooks
  const registerMutation = useRegisterMutation();
  const sendVerificationCodeMutation = useSendVerificationCodeMutation();

  const validationRules = useMemo(
    () => ({
      firstName: (value: string) => (value ? null : 'First name is required'),
      lastName: (value: string) => (value ? null : 'Last name is required'),
      email: (value: string) => {
        return commonValidationRules.email(value);
      },
      // phone: (value: string, formData?: Record<string, string>) => {

      //     return commonValidationRules.optionalPhone(value, formData);
      // },
      password: commonValidationRules.password,
      confirmPassword: commonValidationRules.confirmPassword,
      countryCode: () => null, // No validation needed for country code
    }),
    []
  );

  const { formData, errors, handleInputChange, setFormData, setErrors } =
    useFormValidation<FormFieldKey>(
      {
        firstName: '',
        lastName: '',
        email: '',
        // phone: "",
        password: '',
        confirmPassword: '',
        countryCode: 'US', // Default country code
      },
      validationRules
    );

  // Load saved form data on mount
  useEffect(() => {
    const loadSavedFormData = async () => {
      try {
        const savedData = await AsyncStorage.getItem('signupFormData');
        if (savedData) {
          const parsed = JSON.parse(savedData);
          setFormData(parsed);
        }
      } catch (error) {
        console.error('Failed to load saved form data:', error);
      }
    };
    loadSavedFormData();
  }, []);

  // Save form data whenever it changes
  useEffect(() => {
    const saveFormData = async () => {
      try {
        await AsyncStorage.setItem('signupFormData', JSON.stringify(formData));
      } catch (error) {
        console.error('Failed to save form data:', error);
      }
    };
    saveFormData();
  }, [formData]);

  const currentFields = useMemo(() => {
    // const allFields: FormFieldKey[] = ["firstName", "lastName", "email", "phone", "password", "confirmPassword", "countryCode"];
    const allFields: FormFieldKey[] = [
      'firstName',
      'lastName',
      'email',
      'password',
      'confirmPassword',
      'countryCode',
    ];
    return allFields;
  }, []);

  // Setup animated form field hook with current fields
  const {
    selectedInput,
    getBorderColor,
    getLabelStyle,
    handleFocus,
    handleBlur,
    resetAnimations,
  } = useAnimatedFormField(currentFields);

  // Progressive form logic
  const getFieldVisibility = (fieldName: string) => {
    // const fieldOrder = ["firstName", "lastName", "email", "phone", "password", "confirmPassword"];
    const fieldOrder = [
      'firstName',
      'lastName',
      'email',
      'password',
      'confirmPassword',
    ];
    const currentIndex = fieldOrder.indexOf(fieldName);

    if (currentIndex === 0) return true; // Always show first field

    // Show field if previous field has content
    const previousField = fieldOrder[currentIndex - 1];
    return formData[previousField as FormFieldKey]?.trim().length > 0;
  };

  const animateFieldIn = useCallback(
    (fieldName: string) => {
      const animation =
        fieldAnimations[fieldName as keyof typeof fieldAnimations];
      const scaleAnimation =
        scaleAnimations[fieldName as keyof typeof scaleAnimations];

      animation.setValue(0);
      scaleAnimation.setValue(0.8);

      // Animate opacity and scale together for a nice entrance effect
      Animated.parallel([
        Animated.timing(animation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.sequence([
          Animated.timing(scaleAnimation, {
            toValue: 1.05,
            duration: 200,
            useNativeDriver: false,
          }),
          Animated.timing(scaleAnimation, {
            toValue: 1,
            duration: 100,
            useNativeDriver: false,
          }),
        ]),
      ]).start();
    },
    [fieldAnimations, scaleAnimations]
  );

  const animateFieldOut = useCallback(
    (fieldName: string) => {
      const animation =
        fieldAnimations[fieldName as keyof typeof fieldAnimations];
      const scaleAnimation =
        scaleAnimations[fieldName as keyof typeof scaleAnimations];

      Animated.parallel([
        Animated.timing(animation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    },
    [fieldAnimations, scaleAnimations]
  );

  // Handle field completion and animation
  const handleFieldCompletion = (fieldName: string, value: string) => {
    const isFieldComplete = value.trim().length > 0;
    // const fieldOrder = ["firstName", "lastName", "email", "phone", "password", "confirmPassword"];
    const fieldOrder = [
      'firstName',
      'lastName',
      'email',
      'password',
      'confirmPassword',
    ];
    const currentIndex = fieldOrder.indexOf(fieldName);

    if (isFieldComplete && currentIndex < fieldOrder.length - 1) {
      const nextField = fieldOrder[currentIndex + 1];
      if (!getFieldVisibility(nextField)) {
        setTimeout(() => animateFieldIn(nextField), 100);
      }
    }

    // Update completed fields
    setCompletedFields(prev => {
      const newSet = new Set(prev);
      if (isFieldComplete) {
        newSet.add(fieldName);
      } else {
        newSet.delete(fieldName);
        // Hide subsequent fields if current field becomes empty
        const subsequentFields = fieldOrder.slice(currentIndex + 1);
        subsequentFields.forEach(field => {
          newSet.delete(field);
          animateFieldOut(field);
        });
      }
      return newSet;
    });
  };

  // Enhanced input change handler
  const enhancedHandleInputChange = (field: FormFieldKey, value: string) => {
    handleInputChange(field, value);
    handleFieldCompletion(field, value);
  };

  useEffect(() => {
    // Initialize first field animation
    animateFieldIn('firstName');
  }, [animateFieldIn]);

  // Calculate progress for the progress indicator
  const getProgress = () => {
    const totalFields = 5; // firstName, lastName, email, password, confirmPassword
    const filledFields =
      Object.values(formData).filter(
        value => typeof value === 'string' && value.trim().length > 0
      ).length - 1; // Subtract 1 for countryCode which is always filled
    return Math.max(0, filledFields) / totalFields;
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);

    // Reset form data and errors when role changes
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      // phone: "",
      password: '',
      confirmPassword: '',
      countryCode: 'US', // Keep the country code
    });
    setErrors({});
    setCompletedFields(new Set());
    resetAnimations();

    // Reset all animations and show only first field
    Object.keys(fieldAnimations).forEach(field => {
      if (field === 'firstName') {
        fieldAnimations[field as keyof typeof fieldAnimations].setValue(1);
        scaleAnimations[field as keyof typeof scaleAnimations].setValue(1);
      } else {
        fieldAnimations[field as keyof typeof fieldAnimations].setValue(0);
        scaleAnimations[field as keyof typeof scaleAnimations].setValue(1);
      }
    });
  };

  // const handleCountryChange = (countryCode: string) => {
  //   handleInputChange("countryCode", countryCode);
  // };

  const handleSignUp = async () => {
    // Create validation rules based on current role
    const validationRules: Record<
      string,
      (_value: string, _formData?: Record<string, string>) => string | null
    > = {
      firstName: (value: string) => (value ? null : 'First name is required'),
      lastName: (value: string) => (value ? null : 'Last name is required'),
      password: commonValidationRules.password,
      confirmPassword: commonValidationRules.confirmPassword,
    };

    // if (role === "doctor") {
    validationRules.email = commonValidationRules.email; // Required email for doctors
    // validationRules.phone = commonValidationRules.optionalPhone; // Optional phone for doctors
    // } else {
    //   validationRules.email = commonValidationRules.optionalEmail; // Optional email for patients
    //   validationRules.phone = commonValidationRules.phone; // Required phone for patients
    // }

    // Manually validate each field
    const newErrors: Record<string, string> = {};
    let isValid = true;

    // Filter out countryCode from validation
    currentFields
      .filter(field => field !== 'countryCode')
      .forEach(field => {
        const error = validationRules[field](formData[field], formData);
        if (error) {
          newErrors[field] = error;
          isValid = false;
        }
      });

    setErrors(newErrors);
    if (!isValid) return;

    setIsLoading(true);
    try {
      // Prepare registration data according to the backend API
      const registrationData: UserRegisterRequest = {
        email: formData.email || '',
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        // phone_number: formData.phone ? `${countryCodes.find(c => c.code === formData.countryCode)?.dial_code}${formData.phone}` : undefined,
        role: role === 'doctor' ? AuthUserRole.DOCTOR : AuthUserRole.PATIENT,
      };

      if (!formData.email) {
        throw new Error('Email is required for doctor registration');
      }

      // // For patients, we might not require email initially
      // if (role === "patient" && !formData.email) {
      //   registrationData.email = `patient-${Date.now()}@medicus-temp.com`;
      // }
      // Register the user
      await registerMutation.mutateAsync(registrationData);

      // Clear saved form data after successful registration
      await AsyncStorage.removeItem('signupFormData');

      // If registration is successful, send email verification
      if (formData.email) {
        try {
          await sendVerificationCodeMutation.mutateAsync({
            email: formData.email,
          });
        } catch {
          // Don't fail the whole process if verification email fails
          // Could add user notification here if needed
        }
      }

      // Create a navigation function that will be called only when the user clicks the button
      const navigateToVerification = () => {
        // Use setTimeout to ensure this happens after the current render cycle
        setTimeout(() => {
          // Prepare params based on available contact information
          const params: any = {};

          // Prepare navigation based on user role
          // if (role === "patient") {
          //   // Patients go directly to sign in (no verification required)
          //   router.push("/(SignIn)/SignInScreen" as const);
          // } else {
          // Doctors verify via email
          if (formData.email) {
            params.email = formData.email;
            params.role = 'doctor';
            params.type = 'email';
          }

          router.push({
            pathname: '/(SignUp)/VerificationScreen' as const,
            params,
          });
          // }
        }, 0);
      };

      showModal(
        'success',
        'Signup Successful',
        // role === "doctor" ?
        'Your account has been created. Please verify your email address before logging in.',
        // : "Your account has been created successfully. You can now log in.",
        undefined,
        navigateToVerification,
        // role === "doctor" ? "Verify Email" : "Go to Sign In"
        'Verify Email'
      );
    } catch (error: any) {
      showModal(
        'error',
        'Signup Failed',
        error.message || 'Failed to create account. Please try again.',
        hideModal
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // This would be implemented with OAuth integration
    showModal('info', 'Coming Soon', 'Google sign-in will be available soon!');
  };

  return (
    <View className="w-full max-w-md mx-auto px-4 py-6">
      {/* Custom Modal */}
      <CustomModal {...modalProps} />

      {/* Role Selection */}
      <RoleSelector selectedRole={role} onRoleChange={handleRoleChange} />

      {/* Progress Indicator */}
      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-sm text-gray-600">
            {`Progress: ${Math.round(getProgress() * 100)}%`}
          </Text>
        </View>
        <View className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <Animated.View
            style={{
              height: '100%',
              backgroundColor: '#F05C0C',
              borderRadius: 9999,
              width: `${getProgress() * 100}%`,
            }}
          />
        </View>
      </View>

      {/* First Name field */}
      <Animated.View
        style={{
          opacity: fieldAnimations.firstName,
          transform: [
            {
              scale: scaleAnimations.firstName,
            },
          ],
          marginBottom: 24,
          overflow: 'visible',
        }}
      >
        <View className="relative">
          <FormFieldWrapper
            type="text"
            field="firstName"
            value={formData.firstName}
            label="First Name"
            isActive={selectedInput === 'firstName'}
            borderColor={
              errors.firstName ? '#EF4444' : getBorderColor('firstName')
            }
            labelStyle={getLabelStyle('firstName')}
            onFocus={() => handleFocus('firstName')}
            onBlur={() => handleBlur('firstName')}
            onChangeText={text => enhancedHandleInputChange('firstName', text)}
            errorMessage={errors.firstName}
          />
          {formData.firstName.trim().length > 0 && (
            <View className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Text className="text-green-500 text-lg">✓</Text>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Last Name field */}
      {getFieldVisibility('lastName') && (
        <Animated.View
          style={{
            opacity: fieldAnimations.lastName,
            transform: [
              {
                scale: scaleAnimations.lastName,
              },
            ],
            marginBottom: 24,
            overflow: 'visible',
          }}
        >
          <View className="relative">
            <FormFieldWrapper
              type="text"
              field="lastName"
              value={formData.lastName}
              label="Last Name"
              isActive={selectedInput === 'lastName'}
              borderColor={
                errors.lastName ? '#EF4444' : getBorderColor('lastName')
              }
              labelStyle={getLabelStyle('lastName')}
              onFocus={() => handleFocus('lastName')}
              onBlur={() => handleBlur('lastName')}
              onChangeText={text => enhancedHandleInputChange('lastName', text)}
              errorMessage={errors.lastName}
            />
            {formData.lastName.trim().length > 0 && (
              <View className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Text className="text-green-500 text-lg">✓</Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}

      {/* Email field - required for doctors, optional for patients */}
      {getFieldVisibility('email') && (
        <Animated.View
          style={{
            opacity: fieldAnimations.email,
            transform: [
              {
                scale: scaleAnimations.email,
              },
            ],
            marginBottom: 24,
            overflow: 'visible',
          }}
        >
          <View className="relative">
            <FormFieldWrapper
              type="text"
              field="email"
              value={formData.email}
              label={'Email'}
              isActive={selectedInput === 'email'}
              borderColor={errors.email ? '#EF4444' : getBorderColor('email')}
              labelStyle={getLabelStyle('email')}
              onFocus={() => handleFocus('email')}
              onBlur={() => handleBlur('email')}
              onChangeText={text => enhancedHandleInputChange('email', text)}
              keyboardType="email-address"
              errorMessage={errors.email}
            />
            {formData.email.trim().length > 0 && !errors.email && (
              <View className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Text className="text-green-500 text-lg">✓</Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}

      {/* Phone field with country selector - for both roles */}
      {/* {getFieldVisibility("phone") && (
        <Animated.View 
          style={{
            opacity: fieldAnimations.phone,
            transform: [{
              scale: scaleAnimations.phone
            }],
            marginBottom: 24,
            overflow: 'visible'
          }}
        >
          <View className="relative">
            <FormFieldWrapper
              type="phone"
              field="phone"
              value={formData.phone}
              label={role === "patient" ? "Phone Number *" : "Phone Number (Optional)"}
              isActive={selectedInput === "phone"}
              borderColor={errors.phone ? "#EF4444" : getBorderColor("phone")}
              labelStyle={getLabelStyle("phone")}
              onFocus={() => handleFocus("phone")}
              onBlur={() => handleBlur("phone")}
              onChangeText={(text) => enhancedHandleInputChange("phone", text)}
              onChangeCountry={handleCountryChange}
              selectedCountryCode={formData.countryCode}
              errorMessage={errors.phone}
            />
            {formData.phone.trim().length > 0 && !errors.phone && (
              <View className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Text className="text-green-500 text-lg">✓</Text>
              </View>
            )}
          </View>
        </Animated.View>
      )} */}

      {/* Password field */}
      {getFieldVisibility('password') && (
        <Animated.View
          style={{
            opacity: fieldAnimations.password,
            transform: [
              {
                scale: scaleAnimations.password,
              },
            ],
            marginBottom: 24,
            overflow: 'visible',
          }}
        >
          <View className="relative">
            <PasswordField
              field="password"
              value={formData.password}
              label="Password"
              isActive={selectedInput === 'password'}
              borderColor={
                errors.password ? '#EF4444' : getBorderColor('password')
              }
              labelStyle={getLabelStyle('password')}
              onFocus={() => handleFocus('password')}
              onBlur={() => handleBlur('password')}
              onChangeText={(text: string) =>
                enhancedHandleInputChange('password', text)
              }
              errorMessage={errors.password}
            />
            {formData.password.trim().length > 0 && !errors.password && (
              <View className="absolute right-12 top-1/2 transform -translate-y-1/2">
                <Text className="text-green-500 text-lg">✓</Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}

      {/* Confirm Password field */}
      {getFieldVisibility('confirmPassword') && (
        <Animated.View
          style={{
            opacity: fieldAnimations.confirmPassword,
            transform: [
              {
                scale: scaleAnimations.confirmPassword,
              },
            ],
            marginBottom: 24,
            overflow: 'visible',
          }}
        >
          <View className="relative">
            <PasswordField
              field="confirmPassword"
              value={formData.confirmPassword}
              label="Confirm Password"
              isActive={selectedInput === 'confirmPassword'}
              borderColor={
                errors.confirmPassword
                  ? '#EF4444'
                  : getBorderColor('confirmPassword')
              }
              labelStyle={getLabelStyle('confirmPassword')}
              onFocus={() => handleFocus('confirmPassword')}
              onBlur={() => handleBlur('confirmPassword')}
              onChangeText={(text: string) =>
                enhancedHandleInputChange('confirmPassword', text)
              }
              errorMessage={errors.confirmPassword}
            />
            {formData.confirmPassword.trim().length > 0 &&
              !errors.confirmPassword &&
              formData.password === formData.confirmPassword && (
                <View className="absolute right-12 top-1/2 transform -translate-y-1/2">
                  <Text className="text-green-500 text-lg">✓</Text>
                </View>
              )}
          </View>
        </Animated.View>
      )}

      {/* Completion hint */}
      {getProgress() === 1 && (
        <Animated.View
          style={{
            opacity: 1,
            marginBottom: 16,
          }}
        >
          <View className="bg-green-50 border border-green-200 rounded-lg p-3 flex-row items-center">
            <Text className="text-green-600 text-lg mr-2">🎉</Text>
            <Text className="text-green-700 font-medium flex-1">
              Great! All fields completed. Ready to create your account.
            </Text>
          </View>
        </Animated.View>
      )}

      <Button
        onPress={handleSignUp}
        title={isLoading ? 'Signing Up...' : 'Sign Up'}
        containerClassName="w-full h-14 bg-[#F05C0C] rounded-lg items-center justify-center mb-6 py-4"
        textClassName="text-white font-semibold text-base"
        disabled={isLoading}
      >
        {isLoading && (
          <ActivityIndicator size="small" color="#FFFFFF" className="ml-2" />
        )}
      </Button>

      <Divider />

      <Button
        onPress={handleGoogleSignIn}
        title={'Sign up with Google'}
        containerClassName="bg-white w-full h-17 border border-gray-300 rounded-lg flex-row items-center justify-center py-4"
        textClassName="text-gray-700 font-semibold text-base"
        disabled={isLoading}
      >
        <Image
          source={require('./../../../assets/images/google-logo.png')}
          className="w-6 h-6 ml-2"
        />
      </Button>
    </View>
  );
};

export default SignUpForm;
