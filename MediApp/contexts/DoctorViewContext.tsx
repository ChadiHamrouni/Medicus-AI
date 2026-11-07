import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DoctorViewContextType {
  viewingAsPatient: boolean;
  setViewingAsPatient: (value: boolean) => void;
}

const DoctorViewContext = createContext<DoctorViewContextType | undefined>(
  undefined
);

const VIEWING_MODE_STORAGE_KEY = '@doctor_viewing_as_patient';

export const DoctorViewProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [viewingAsPatient, setViewingAsPatientState] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load viewing mode from AsyncStorage on mount
  useEffect(() => {
    const loadViewingMode = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(
          VIEWING_MODE_STORAGE_KEY
        );
        if (storedValue !== null) {
          const parsedValue = JSON.parse(storedValue);
          setViewingAsPatientState(parsedValue);
        }
      } catch (error) {
        console.error('❌ Failed to load viewing mode from storage:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadViewingMode();
  }, []);

  // Persist viewing mode to AsyncStorage whenever it changes
  const setViewingAsPatient = (value: boolean) => {
    try {
      setViewingAsPatientState(value);
      // Fire and forget - don't await to keep the function synchronous
      AsyncStorage.setItem(
        VIEWING_MODE_STORAGE_KEY,
        JSON.stringify(value)
      ).catch(error => {
        console.error('Failed to save viewing mode to storage:', error);
      });
    } catch (error) {
      console.error('Failed to save viewing mode to storage:', error);
    }
  };

  // Don't render children until we've loaded the persisted state
  if (!isLoaded) {
    return null;
  }

  return (
    <DoctorViewContext.Provider
      value={{ viewingAsPatient, setViewingAsPatient }}
    >
      {children}
    </DoctorViewContext.Provider>
  );
};

export const useDoctorView = () => {
  const context = useContext(DoctorViewContext);
  if (context === undefined) {
    throw new Error('useDoctorView must be used within a DoctorViewProvider');
  }
  return context;
};
