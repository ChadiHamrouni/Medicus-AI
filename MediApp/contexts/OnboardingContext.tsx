import React, { createContext, useContext, useState, ReactNode } from 'react';

interface OnboardingContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  totalSteps: number;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined
);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({
  children,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 7; // Total number of steps in the onboarding process

  return (
    <OnboardingContext.Provider
      value={{ currentStep, setCurrentStep, totalSteps }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};
