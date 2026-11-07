import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import React, { useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Define the possible date formats
export type DateFormat = 'full' | 'year-month' | 'year';

interface DatePickerProps {
  value: string;
  label: string;
  isActive: boolean;
  borderColor: Animated.AnimatedInterpolation<string | number>;
  labelStyle: any;
  onFocus: () => void;
  onBlur: () => void;
  // eslint-disable-next-line no-unused-vars
  onChange: (date: string) => void;
  // Add a new prop for date format with default value 'full'
  dateFormat?: DateFormat;
  errorMessage?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  label,
  isActive,
  borderColor,
  labelStyle,
  onFocus,
  onBlur,
  onChange,
  dateFormat = 'full', // Default to full date format
  errorMessage,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(
    value ? new Date(value) : new Date()
  );
  const [selectedYear, setSelectedYear] = useState(
    value && /^\d{4}/.test(value)
      ? value.substring(0, 4)
      : new Date().getFullYear().toString()
  );
  const [selectedMonth, setSelectedMonth] = useState(
    value && /^\d{4}-\d{2}/.test(value)
      ? value.substring(5, 7)
      : (new Date().getMonth() + 1).toString().padStart(2, '0')
  );

  // Generate years for picker (current year and 100 years back)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 101 }, (_, i) =>
    (currentYear - 100 + i).toString()
  );

  // Generate months for picker
  const months = [
    { label: 'January', value: '01' },
    { label: 'February', value: '02' },
    { label: 'March', value: '03' },
    { label: 'April', value: '04' },
    { label: 'May', value: '05' },
    { label: 'June', value: '06' },
    { label: 'July', value: '07' },
    { label: 'August', value: '08' },
    { label: 'September', value: '09' },
    { label: 'October', value: '10' },
    { label: 'November', value: '11' },
    { label: 'December', value: '12' },
  ];

  // Format the date based on the dateFormat prop
  const formatDate = (date: Date): string => {
    const year = date.getFullYear().toString();

    if (dateFormat === 'year') {
      return year;
    }

    const month = (date.getMonth() + 1).toString().padStart(2, '0');

    if (dateFormat === 'year-month') {
      return `${year}-${month}`;
    }

    // Default to full date format (YYYY-MM-DD)
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format the display value for the input field
  const getDisplayValue = (): string => {
    if (!value) return '';

    if (dateFormat === 'year') {
      // If it's already just a year, return it
      if (/^\d{4}$/.test(value)) return value;

      // Otherwise, try to extract the year from a date string
      const date = new Date(value);
      return isNaN(date.getTime()) ? '' : date.getFullYear().toString();
    }

    if (dateFormat === 'year-month') {
      // If it's already in YYYY-MM format, return it
      if (/^\d{4}-\d{2}$/.test(value)) return value;

      // Otherwise, try to extract year and month from a date string
      const date = new Date(value);
      if (isNaN(date.getTime())) return '';
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      return `${year}-${month}`;
    }

    // For full date, return as is or format it
    return value;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempDate(selectedDate);
      if (Platform.OS === 'android') {
        setShowDatePicker(false);
        onChange(formatDate(selectedDate));
        onBlur();
      }
    }
  };

  const handleConfirm = () => {
    setShowDatePicker(false);

    if (dateFormat === 'year') {
      onChange(selectedYear);
    } else if (dateFormat === 'year-month') {
      onChange(`${selectedYear}-${selectedMonth}`);
    } else {
      onChange(formatDate(tempDate));
    }

    onBlur();
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    if (dateFormat === 'year' && Platform.OS === 'android') {
      setShowDatePicker(false);
      onChange(year);
      onBlur();
    }
  };

  // const handleMonthChange = (month: string) => {
  //     setSelectedMonth(month);
  //     if (dateFormat === 'year-month' && Platform.OS === 'android') {
  //         // For Android, we'll close the picker and update the value immediately
  //         setShowDatePicker(false);
  //         onChange(`${selectedYear}-${month}`);
  //         onBlur();
  //     }
  // };

  // Render custom year picker
  const renderYearPicker = () => {
    const PickerItem = Picker.Item;
    return (
      <View style={{ minHeight: 200 }}>
        <Picker
          selectedValue={selectedYear}
          onValueChange={handleYearChange}
          style={{ width: '100%', height: 200 }}
          itemStyle={{ height: 200, color: '#000000' }}
        >
          {years.map(year => (
            <PickerItem key={year} label={year} value={year} color="#000000" />
          ))}
        </Picker>
      </View>
    );
  };

  // Render custom year-month picker
  const renderYearMonthPicker = () => {
    const PickerItem = Picker.Item;
    return (
      <View>
        <Text
          className="text-center font-medium mb-2"
          style={{ color: '#000000' }}
        >
          Select Year
        </Text>
        <Picker
          selectedValue={selectedYear}
          onValueChange={year => setSelectedYear(year.toString())}
          style={{ width: '100%', height: 150 }}
          itemStyle={{ height: 150, color: '#000000' }}
        >
          {years.map(year => (
            <PickerItem key={year} label={year} value={year} color="#000000" />
          ))}
        </Picker>

        <Text
          className="text-center font-medium mb-2 mt-4"
          style={{ color: '#000000' }}
        >
          Select Month
        </Text>
        <Picker
          selectedValue={selectedMonth}
          onValueChange={month => setSelectedMonth(month.toString())}
          style={{ width: '100%', height: 150 }}
          itemStyle={{ height: 150, color: '#000000' }}
        >
          {months.map(month => (
            <PickerItem
              key={month.value}
              label={month.label}
              value={month.value}
              color="#000000"
            />
          ))}
        </Picker>
      </View>
    );
  };

  return (
    <View>
      <TouchableOpacity
        onPress={() => {
          setShowDatePicker(true);
          onFocus();
        }}
        activeOpacity={1}
      >
        <Animated.View
          style={{
            borderWidth: 1,
            borderColor: errorMessage
              ? '#EF4444'
              : isActive
                ? '#F05C0C'
                : borderColor,
            borderRadius: 8,
            position: 'relative' as const,
          }}
        >
          <Animated.Text
            style={[
              labelStyle,
              {
                color: errorMessage
                  ? '#EF4444'
                  : isActive
                    ? '#F05C0C'
                    : '#6B7280',
              },
            ]}
          >
            {label}
          </Animated.Text>
          <View className="flex-row items-center justify-between px-4 h-12">
            <Text
              className="text-base"
              style={{ color: getDisplayValue() ? '#000000' : '#9CA3AF' }}
            >
              {getDisplayValue() ||
                `Select ${dateFormat === 'year' ? 'year' : dateFormat === 'year-month' ? 'year and month' : 'date'}`}
            </Text>
            <MaterialCommunityIcons
              name="calendar"
              size={24}
              color={
                errorMessage ? '#EF4444' : isActive ? '#F05C0C' : '#6B7280'
              }
            />
          </View>
        </Animated.View>
      </TouchableOpacity>
      {errorMessage && (
        <Text className="text-red-500 text-xs mt-1 ml-1">{errorMessage}</Text>
      )}

      {Platform.OS === 'ios' && showDatePicker && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowDatePicker(false);
            onBlur();
          }}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <TouchableOpacity
              className="flex-1"
              activeOpacity={1}
              onPress={() => {
                setShowDatePicker(false);
                onBlur();
              }}
            />
            <View className="bg-white rounded-t-2xl">
              {/* Header */}
              <View className="px-4 py-3 border-b border-gray-200">
                <Text className="text-lg font-semibold text-gray-900 text-center">
                  {label}
                </Text>
              </View>

              {/* Picker Content */}
              <View className="p-4" style={{ minHeight: 250 }}>
                {dateFormat === 'year' ? (
                  renderYearPicker()
                ) : dateFormat === 'year-month' ? (
                  renderYearMonthPicker()
                ) : (
                  <DateTimePicker
                    value={tempDate}
                    mode="date"
                    display="spinner"
                    onChange={handleDateChange}
                    style={{ backgroundColor: 'white', height: 200 }}
                    textColor="#000000"
                  />
                )}
              </View>

              {/* Footer */}
              <View className="p-4 pb-8 border-t border-gray-200">
                <TouchableOpacity
                  onPress={handleConfirm}
                  className="bg-[#F05C0C] py-4 px-4 rounded-lg"
                  activeOpacity={0.8}
                >
                  <Text className="text-white text-center font-semibold text-base">
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'android' &&
        showDatePicker &&
        (dateFormat === 'year' ? (
          <Modal
            visible={true}
            transparent
            animationType="fade"
            onRequestClose={() => {
              setShowDatePicker(false);
              onBlur();
            }}
          >
            <View className="flex-1 bg-black/50 justify-end">
              <TouchableOpacity
                className="flex-1"
                activeOpacity={1}
                onPress={() => {
                  setShowDatePicker(false);
                  onBlur();
                }}
              />
              <View className="bg-white rounded-t-2xl">
                {/* Header */}
                <View className="px-4 py-3 border-b border-gray-200">
                  <Text className="text-lg font-semibold text-gray-900 text-center">
                    {label}
                  </Text>
                </View>

                {/* Picker Content */}
                <View className="p-4">{renderYearPicker()}</View>

                {/* Footer */}
                <View className="p-4 border-t border-gray-200">
                  <TouchableOpacity
                    onPress={handleConfirm}
                    className="bg-[#F05C0C] py-4 px-4 rounded-lg"
                    activeOpacity={0.8}
                  >
                    <Text className="text-white text-center font-semibold text-base">
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        ) : dateFormat === 'year-month' ? (
          <Modal
            visible={true}
            transparent
            animationType="fade"
            onRequestClose={() => {
              setShowDatePicker(false);
              onBlur();
            }}
          >
            <View className="flex-1 bg-black/50 justify-end">
              <TouchableOpacity
                className="flex-1"
                activeOpacity={1}
                onPress={() => {
                  setShowDatePicker(false);
                  onBlur();
                }}
              />
              <View className="bg-white rounded-t-2xl">
                {/* Header */}
                <View className="px-4 py-3 border-b border-gray-200">
                  <Text className="text-lg font-semibold text-gray-900 text-center">
                    {label}
                  </Text>
                </View>

                {/* Picker Content */}
                <View className="p-4">{renderYearMonthPicker()}</View>

                {/* Footer */}
                <View className="p-4 pb-8 border-t border-gray-200">
                  <TouchableOpacity
                    onPress={handleConfirm}
                    className="bg-[#F05C0C] py-4 px-4 rounded-lg"
                    activeOpacity={0.8}
                  >
                    <Text className="text-white text-center font-semibold text-base">
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        ))}
    </View>
  );
};
