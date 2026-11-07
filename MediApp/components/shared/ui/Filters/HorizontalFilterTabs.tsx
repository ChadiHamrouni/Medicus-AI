import React from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export interface HorizontalTabFilterOption {
  key: string;
  label: string;
  icon: string;
  count?: number;
}

interface HorizontalFilterTabsProps {
  options: HorizontalTabFilterOption[];
  selectedKey?: string;
  selectedKeys?: string[];
  // eslint-disable-next-line no-unused-vars
  onFilterChange: (key: string | string[]) => void;
  showCount?: boolean;
  variant?: 'simple' | 'enhanced';
  loading?: boolean;
  title?: string;
  multiSelect?: boolean;
}

const AnimatedSpinner = ({
  size = 20,
  color = '#F05C0C',
}: {
  size?: number;
  color?: string;
}) => {
  const spinValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    );
    spinAnimation.start();
    return () => spinAnimation.stop();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderWidth: 2,
        borderColor: color,
        borderTopColor: 'transparent',
        borderRadius: size / 2,
        transform: [{ rotate: spin }],
      }}
    />
  );
};

export const HorizontalFilterTabs: React.FC<HorizontalFilterTabsProps> = ({
  options,
  selectedKey,
  selectedKeys,
  onFilterChange,
  showCount = false,
  variant = 'simple',
  loading = false,
  title,
  multiSelect = false,
}) => {
  const isEnhanced = variant === 'enhanced';

  const handlePress = (key: string) => {
    if (multiSelect && selectedKeys) {
      const newSelectedKeys = selectedKeys.includes(key)
        ? selectedKeys.filter(k => k !== key)
        : [...selectedKeys, key];
      // Don't allow deselecting all
      if (newSelectedKeys.length > 0) {
        onFilterChange(newSelectedKeys);
      }
    } else {
      onFilterChange(key);
    }
  };

  const isActive = (key: string) => {
    if (multiSelect && selectedKeys) {
      return selectedKeys.includes(key);
    }
    return selectedKey === key;
  };

  return (
    <View>
      {title && (
        <Text className="text-sm font-semibold text-gray-700 mb-3 px-1">
          {title}
        </Text>
      )}

      {loading ? (
        <View className="flex-row items-center justify-center py-4">
          <AnimatedSpinner size={20} />
          <Text className="text-gray-500 ml-2">Loading...</Text>
        </View>
      ) : options.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-4 px-4"
          contentContainerStyle={{ paddingRight: 16 }}
        >
          <View className="flex-row gap-3">
            {options.map(option => {
              const isOptionActive = isActive(option.key);

              if (isEnhanced) {
                return (
                  <TouchableOpacity
                    key={option.key}
                    onPress={() => handlePress(option.key)}
                    className={`flex-row items-center px-4 py-3 rounded-xl border-2 shadow-sm ${
                      isOptionActive
                        ? 'bg-orange-50 border-orange-400'
                        : 'bg-white border-gray-200'
                    }`}
                    activeOpacity={1}
                    style={{
                      shadowColor: isOptionActive ? '#EA580C' : '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isOptionActive ? 0.15 : 0.05,
                      shadowRadius: 4,
                      elevation: isOptionActive ? 3 : 1,
                    }}
                  >
                    <View
                      className={`p-1.5 rounded-lg mr-2.5 `}
                      // ${
                      //   isOptionActive ? 'bg-orange-100' : 'bg-gray-100'
                      // }
                    >
                      <MaterialCommunityIcons
                        name={option.icon as any}
                        size={18}
                        color={isOptionActive ? '#EA580C' : '#6B7280'}
                      />
                    </View>
                    <Text
                      className={`text-sm font-semibold ${
                        isOptionActive ? 'text-orange-700' : 'text-gray-700'
                      }`}
                    >
                      {option.label}
                    </Text>
                    {showCount &&
                      option.count !== undefined &&
                      option.count > 0 && (
                        <View
                          className={`ml-2.5 px-2.5 py-1 rounded-full ${
                            isOptionActive ? 'bg-orange-200' : 'bg-gray-200'
                          }`}
                        >
                          <Text
                            className={`text-xs font-bold ${
                              isOptionActive
                                ? 'text-orange-800'
                                : 'text-gray-700'
                            }`}
                          >
                            {option.count}
                          </Text>
                        </View>
                      )}
                  </TouchableOpacity>
                );
              } else {
                return (
                  <TouchableOpacity
                    key={option.key}
                    onPress={() => handlePress(option.key)}
                    className={`flex-row items-center px-4 py-3 rounded-full mr-3 border shadow-sm ${
                      isOptionActive
                        ? 'bg-orange-100 border-orange-300'
                        : 'bg-white border-gray-200'
                    }`}
                    activeOpacity={1}
                  >
                    <MaterialCommunityIcons
                      name={option.icon as any}
                      size={16}
                      color="#F05C0C"
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      className={`text-sm font-medium ${
                        isOptionActive ? 'text-orange-700' : 'text-gray-700'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              }
            })}
          </View>
        </ScrollView>
      ) : (
        <View className="flex-row items-center justify-center py-4">
          <Text className="text-gray-500">No options available</Text>
        </View>
      )}
    </View>
  );
};
