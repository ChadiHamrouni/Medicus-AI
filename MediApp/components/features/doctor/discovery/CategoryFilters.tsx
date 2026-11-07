// CategoryFilters.tsx

import React from 'react';
import {
  Animated,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // preferred import with expo
// Note: Do *not* also import from 'react-native-vector-icons/MaterialCommunityIcons' unless needed specially.

interface SuperCategory {
  id: number;
  name: string;
  description: string;
  icon?: string;
}

interface CategoryFiltersProps {
  categories?: SuperCategory[];
  selectedCategoryId: number | null;
  onCategorySelect: (categoryId: number) => void;
  loading?: boolean;
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

const validIconName = (name: string): boolean => {
  // Basic validation: non-empty string. Could be extended to check against a known list.
  return typeof name === 'string' && name.trim().length > 0;
};

const CategoryFilters: React.FC<CategoryFiltersProps> = ({
  categories = [],
  selectedCategoryId,
  onCategorySelect,
  loading = false,
}) => {
  const safeCategoriesArray = Array.isArray(categories) ? categories : [];

  // Map database icon names to MaterialCommunityIcons names
  const databaseIconToMaterialIcon: Record<string, string> = {
    stethoscope: 'stethoscope',
    baby: 'baby-face',
    skin: 'account-check',
    heartbeat: 'heart-pulse',
    brain: 'brain',
    tooth: 'tooth',
  };

  return (
    <View className="px-4 mb-6">
      <Text className="text-base font-medium text-gray-700 mb-4">
        Quick Filters
      </Text>
      {loading ? (
        <View className="flex-row items-center justify-center py-4">
          <AnimatedSpinner size={20} />
          <Text className="text-gray-500 ml-2">Loading categories...</Text>
        </View>
      ) : safeCategoriesArray.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row">
            {safeCategoriesArray.map(category => {
              // Use database icon name to get MaterialCommunityIcons name
              const iconName =
                databaseIconToMaterialIcon[category.icon || ''] ||
                'medical-bag';

              return (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => onCategorySelect(category.id)}
                  className={`flex-row items-center px-4 py-3 rounded-full mr-3 border shadow-sm ${
                    selectedCategoryId === category.id
                      ? 'bg-orange-100 border-orange-300'
                      : 'bg-white border-gray-200'
                  }`}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name={iconName as any}
                    size={16}
                    color="#F05C0C"
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    className={`text-sm font-medium ${
                      selectedCategoryId === category.id
                        ? 'text-orange-700'
                        : 'text-gray-700'
                    }`}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <View className="flex-row items-center justify-center py-4">
          <Text className="text-gray-500">No categories available</Text>
        </View>
      )}
    </View>
  );
};

export default CategoryFilters;
