import { useState, useRef, useEffect } from 'react';
import { Animated } from 'react-native';

export const useAnimatedFormField = <T extends string>(
  fields: T[],
  backgroundColor: string = '#F9FAFB'
) => {
  // Create a ref to store animations for all fields
  const animsRef = useRef<Record<string, Animated.Value>>({});

  // Initialize animations for current fields
  useEffect(() => {
    // Create animations for any new fields
    fields.forEach(field => {
      if (!animsRef.current[field]) {
        animsRef.current[field] = new Animated.Value(0);
      }
    });
  }, [fields]);

  const [selectedInput, setSelectedInput] = useState<T | null>(null);

  const animateInput = (field: T, toValue: number) => {
    if (animsRef.current[field]) {
      Animated.spring(animsRef.current[field], {
        toValue,
        useNativeDriver: false,
        tension: 20,
        friction: 3,
      }).start();
    }
  };

  const getBorderColor = (field: T) => {
    if (!animsRef.current[field]) {
      return '#D1D5DB'; // Default color if animation doesn't exist yet
    }

    return animsRef.current[field].interpolate({
      inputRange: [0, 1],
      outputRange: ['#D1D5DB', '#F05C0C'],
    });
  };

  const getLabelStyle = (field: T) => {
    return {
      position: 'absolute' as const,
      left: 20,
      top: -10,
      fontSize: 12,
      color: animsRef.current[field]
        ? animsRef.current[field].interpolate({
            inputRange: [0, 1],
            outputRange: ['#6B7280', '#F05C0C'],
          })
        : '#6B7280',
      backgroundColor: backgroundColor,
      paddingHorizontal: 10,
      zIndex: 1,
    };
  };

  const handleFocus = (field: T) => {
    setSelectedInput(field);
    animateInput(field, 1);
  };

  const handleBlur = (field: T) => {
    setSelectedInput(null);
    animateInput(field, 0);
  };

  const clearSelection = () => {
    setSelectedInput(null);
  };

  // Reset all animations to their default state
  const resetAnimations = () => {
    setSelectedInput(null);

    // Reset all animations to 0
    Object.keys(animsRef.current).forEach(field => {
      animsRef.current[field].setValue(0);
    });
  };

  return {
    anims: animsRef.current,
    selectedInput,
    getBorderColor,
    getLabelStyle,
    handleFocus,
    handleBlur,
    clearSelection,
    resetAnimations,
  };
};
