import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  StyleSheet,
  Keyboard,
  Dimensions,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useKeyboardHeight } from '@/hooks';

export interface DropdownOption {
  key: string;
  value: string;
  label: string;
  icon?: any;
  description?: string;
  metadata?: any;
}

export interface UnifiedDropdownProps {
  // Basic props
  label?: string;
  placeholder?: string;
  value?: string | string[];
  options: DropdownOption[];
  onValueChange: (
    _value: string | string[],
    _option?: DropdownOption | DropdownOption[]
  ) => void;

  // Features
  multiSelect?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  isLoading?: boolean;

  // Styling
  primaryColor?: string;
  backgroundColor?: string;
  labelStyle?: TextStyle;
  dropdownStyle?: ViewStyle;
  selectedItemStyle?: TextStyle;

  // Custom Rendering
  renderOption?: (
    _option: DropdownOption,
    _isSelected: boolean,
    _onSelect: () => void
  ) => React.ReactNode;
  renderTrigger?: (
    _selectedOptions: DropdownOption | DropdownOption[] | null,
    _placeholder: string,
    _isOpen: boolean
  ) => React.ReactNode;

  // Error handling
  error?: string;
  helperText?: string;

  // Event handlers
  onFocus?: () => void;
  onBlur?: () => void;

  // Search
  searchPlaceholder?: string;

  // Legacy props for backward compatibility
  modalType?: string;
  modalTitle?: string;
  showCheckmarks?: boolean;
  renderSelectedValue?: any;
  customFilter?: any;
}

export const UnifiedDropdown: React.FC<UnifiedDropdownProps> = ({
  label,
  placeholder = 'Select an option...',
  value,
  options = [],
  onValueChange,
  multiSelect = false,
  searchable: _searchable = false,
  clearable = false,
  disabled = false,
  isLoading = false,
  primaryColor = '#F05C0C',
  backgroundColor = '#F9FAFB',
  labelStyle,
  dropdownStyle,
  selectedItemStyle,
  renderOption,
  renderTrigger,
  error,
  helperText,
  onFocus,
  onBlur,
  searchPlaceholder: _searchPlaceholder = 'Search...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Track keyboard height and visibility
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();
  const screenHeight = Dimensions.get('window').height;
  const insets = useSafeAreaInsets();

  // Transform our options for display
  const transformedOptions = useMemo(() => {
    return options.map(option => ({
      ...option,
      label: option.label || option.value,
    }));
  }, [options]);

  // Filter options based on search text
  const filteredOptions = useMemo(() => {
    if (!_searchable || !searchText.trim()) {
      return transformedOptions;
    }
    return transformedOptions.filter(
      option =>
        option.label.toLowerCase().includes(searchText.toLowerCase()) ||
        option.value.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [transformedOptions, searchText, _searchable]);

  // Get selected option(s) for display
  const selectedOptions = useMemo(() => {
    if (multiSelect && Array.isArray(value)) {
      return value
        .map(val => options.find(opt => opt.key === val))
        .filter(Boolean) as DropdownOption[];
    } else if (!multiSelect && typeof value === 'string') {
      return (
        options.find(
          opt =>
            opt.key === value ||
            opt.value === value ||
            opt.key.toLowerCase() === value.toLowerCase()
        ) || null
      );
    }
    return null;
  }, [value, options, multiSelect]);

  // Get display text
  const displayText = useMemo(() => {
    if (
      multiSelect &&
      Array.isArray(selectedOptions) &&
      selectedOptions.length > 0
    ) {
      return selectedOptions.map(opt => opt?.label).join(', ');
    } else if (!multiSelect && selectedOptions) {
      return (selectedOptions as DropdownOption).label;
    }
    return placeholder;
  }, [selectedOptions, multiSelect, placeholder]);

  // Handle closing modal and dismissing keyboard
  const handleCloseModal = () => {
    setSearchText(''); // Clear search when closing
    setIsOpen(false);
    Keyboard.dismiss(); // Ensure keyboard is dismissed
    onBlur?.();
  };

  // Calculate max height based on keyboard state
  const maxModalHeight = useMemo(() => {
    if (isKeyboardVisible) {
      // When keyboard is visible, allow modal to take more space above keyboard
      return screenHeight - keyboardHeight - 50; // 50px buffer
    }
    return screenHeight * 0.8; // Default 80% of screen height
  }, [isKeyboardVisible, keyboardHeight, screenHeight]);

  // Handle selection
  const handleSelect = (optionKey: string) => {
    const selectedOption = options.find(opt => opt.key === optionKey);
    if (!selectedOption) return;

    if (multiSelect) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValues = currentValues.includes(optionKey)
        ? currentValues.filter(v => v !== optionKey)
        : [...currentValues, optionKey];

      const newSelectedOptions = newValues
        .map(val => options.find(opt => opt.key === val))
        .filter(Boolean);

      onValueChange(newValues, newSelectedOptions as DropdownOption[]);
    } else {
      onValueChange(optionKey, selectedOption);
      handleCloseModal();
    }
  };

  // Handle clear
  const handleClear = () => {
    if (multiSelect) {
      onValueChange([], []);
    } else {
      onValueChange('', undefined);
    }
  };

  const hasValue = multiSelect
    ? Array.isArray(value) && value.length > 0
    : Boolean(value);

  return (
    <View style={styles.container}>
      {/* Floating Label */}
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: error ? '#EF4444' : '#6B7280',
              top: -10,
              fontSize: 12,
              backgroundColor: backgroundColor,
            },
            labelStyle,
          ]}
        >
          {label}
        </Text>
      )}

      <View>
        <TouchableOpacity
          style={[
            styles.triggerButton,
            {
              borderColor: error
                ? '#EF4444'
                : isOpen
                  ? primaryColor
                  : '#D1D5DB',
              backgroundColor: backgroundColor,
            },
            dropdownStyle,
          ]}
          disabled={disabled || isLoading}
          onPress={() => {
            if (isOpen) {
              handleCloseModal();
            } else {
              setIsOpen(true);
              onFocus?.();
            }
          }}
        >
          {renderTrigger ? (
            renderTrigger(selectedOptions, placeholder, isOpen)
          ) : (
            <View style={styles.triggerContent}>
              <Text
                style={[
                  styles.displayText,
                  {
                    color: hasValue ? '#111827' : '#9CA3AF',
                  },
                  selectedItemStyle,
                ]}
                numberOfLines={1}
              >
                {isLoading ? 'Loading...' : displayText}
              </Text>

              <View style={styles.iconContainer}>
                {clearable && hasValue && !disabled && !isLoading && (
                  <TouchableOpacity
                    onPress={handleClear}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={isOpen ? primaryColor : '#9CA3AF'}
                  style={[
                    styles.chevron,
                    { transform: [{ rotate: isOpen ? '180deg' : '0deg' }] },
                  ]}
                />
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Enhanced Modal Dropdown */}
        <Modal
          visible={isOpen}
          transparent
          animationType="fade"
          onRequestClose={handleCloseModal}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={handleCloseModal}
            />

            <View
              style={[
                styles.dropdownModal,
                {
                  maxHeight: maxModalHeight,
                  marginBottom: isKeyboardVisible ? keyboardHeight : 0,
                  paddingBottom: Math.max(insets.bottom, 20),
                },
              ]}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {label || 'Select an option'}
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleCloseModal}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Search bar for searchable dropdowns */}
              {_searchable && (
                <View style={styles.searchContainer}>
                  <Ionicons
                    name="search"
                    size={16}
                    color="#9CA3AF"
                    style={styles.searchIcon}
                  />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={_searchPlaceholder}
                    placeholderTextColor="#9CA3AF"
                    value={searchText}
                    onChangeText={setSearchText}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                </View>
              )}

              {/* Options List */}
              <ScrollView
                style={[
                  styles.optionsList,
                  { maxHeight: maxModalHeight - 200 },
                ]}
                showsVerticalScrollIndicator={false}
                bounces={false}
                keyboardShouldPersistTaps="handled"
              >
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((item, index) => {
                    const isSelected =
                      multiSelect && Array.isArray(value)
                        ? value.includes(item.key)
                        : value === item.key;

                    if (renderOption) {
                      return (
                        <React.Fragment key={item.key}>
                          {renderOption(item, isSelected, () =>
                            handleSelect(item.key)
                          )}
                        </React.Fragment>
                      );
                    }

                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[
                          styles.optionItem,
                          index === filteredOptions.length - 1 &&
                          styles.lastOptionItem,
                          isSelected && styles.selectedOption,
                        ]}
                        onPress={() => handleSelect(item.key)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.optionContent}>
                          {item.icon && (
                            <Text style={styles.optionIcon}>{item.icon}</Text>
                          )}
                          <View style={styles.optionTextContainer}>
                            <Text
                              style={[
                                styles.optionText,
                                isSelected && styles.selectedOptionText,
                              ]}
                            >
                              {item.label}
                            </Text>
                            {item.description && (
                              <Text style={styles.optionDescription}>
                                {item.description}
                              </Text>
                            )}
                          </View>
                          {isSelected && (
                            <View style={styles.checkmarkContainer}>
                              <Ionicons
                                name="checkmark"
                                size={20}
                                color={primaryColor}
                              />
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={48} color="#E5E7EB" />
                    <Text style={styles.emptyText}>No options available</Text>
                    <Text style={styles.emptySubtext}>
                      Try adjusting your search or check back later
                    </Text>
                  </View>
                )}
              </ScrollView>

              {/* Multi-select footer */}
              {multiSelect && (
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.clearAllButton}
                    onPress={() => {
                      handleClear();
                    }}
                  >
                    <Text style={styles.clearAllText}>Clear All</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.doneButton,
                      { backgroundColor: primaryColor },
                    ]}
                    onPress={handleCloseModal}
                  >
                    <Text style={styles.doneButtonText}>
                      Done{' '}
                      {Array.isArray(value) &&
                        value.length > 0 &&
                        `(${value.length})`}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </View>

      {/* Error Text */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Helper Text */}
      {helperText && !error && (
        <Text style={styles.helperText}>{helperText}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    // marginBottom: 16,
  },
  label: {
    position: 'absolute',
    left: 20,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    zIndex: 10,
    fontWeight: '500',
  },
  triggerButton: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  displayText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearButton: {
    padding: 2,
  },
  chevron: {},
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dropdownModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 16,
    flexShrink: 0,
    // Ensure modal sticks to bottom and allows escape
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
    borderRadius: 20,
    // backgroundColor: '#F9FAFB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    padding: 0,
  },
  optionsList: {
    flexGrow: 1,
    flexShrink: 1,
    paddingHorizontal: 8,
    minHeight: 100,
  },
  optionItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 12,
    marginVertical: 2,
    borderRadius: 8,
    backgroundColor: 'white',
  },
  lastOptionItem: {
    marginBottom: 16,
  },
  selectedOption: {
    backgroundColor: '#FEF3F2',
    borderWidth: 1,
    borderColor: '#F05C0C',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  optionTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '400',
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  selectedOptionText: {
    color: '#F05C0C',
    fontWeight: '500',
  },
  checkmarkContainer: {
    marginLeft: 12,
    backgroundColor: '#F05C0C',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 8, // Extra space for home indicator
    borderTopWidth: 1,
    borderTopColor: '#FFF',
    backgroundColor: '#FFF',
  },
  clearAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  clearAllText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  doneButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F05C0C',
  },
  doneButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  helperText: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
