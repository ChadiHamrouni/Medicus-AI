import {
  FormFieldWrapper,
  RadioButton,
  StandardBottomButton,
  ThreeDotsLoader,
} from '@/components/shared/ui';
import { DAYS_OF_WEEK } from '@/constants';
import { useAnimatedFormField } from '@/hooks/ui/forms';
import { useDoctorProfile, useDoctorPublicProfile } from '@/hooks/doctor';
import { WeekSchedule, DoctorProfileResponse } from '@/types';
import { logger } from '@/utils';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useForm } from 'react-hook-form';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

interface WorkingHoursFormProps {
  fromProfile?: boolean;
  readOnly?: boolean;
  doctorId?: number; // For viewing another doctor's profile
}

export const WorkingHoursForm: React.FC<WorkingHoursFormProps> = React.memo(
  ({ fromProfile: _fromProfile = true, readOnly = false, doctorId }) => {
    // Doctor profile hook for API calls
    const { updateWorkingHours, isUpdatingWorkingHours, profile: ownProfile, isLoading: isLoadingOwn, refetch, error: ownError } =
      useDoctorProfile();

    // State for viewing another doctor's profile
    const isViewingOtherDoctor = readOnly && !!doctorId;
    const {
      data: viewedDoctorProfile,
      isLoading: isLoadingViewed,
      error: viewedError
    } = useDoctorPublicProfile(isViewingOtherDoctor ? doctorId : undefined);

    // Determine which profile to use
    // const isViewingOtherDoctor = readOnly && doctorId;
    const profile = isViewingOtherDoctor ? viewedDoctorProfile || null : ownProfile;
    const isLoading = isViewingOtherDoctor ? isLoadingViewed : isLoadingOwn;
    const error = isViewingOtherDoctor ? (viewedError ? (viewedError as Error).message : null) : ownError;

    // Fetch detailed profile data on mount if working_hours is missing
    // (LIGHT data from login doesn't include working_hours, need DETAILED data)
    const hasFetchedRef = useRef(false);
    useEffect(() => {
      if (!hasFetchedRef.current && profile && !profile.working_hours) {
        hasFetchedRef.current = true;
        logger.info('Fetching detailed profile for working hours', {
          component: 'WorkingHoursForm',
        });
        refetch(true);
      }
    }, [profile, refetch]);

    const initializedRef = useRef(false);

    const {
      reset,
      setValue,
      formState: { isDirty },
    } = useForm({
      defaultValues: {
        weekSchedule: {},
      },
      mode: 'onChange',
    });

    const [isRetrying, setIsRetrying] = useState(false);
    const [selectedDay, setSelectedDay] = useState('Monday');
    const [weekSchedule, setWeekSchedule] = useState<WeekSchedule>(() => {
      const initialSchedule: WeekSchedule = {};
      DAYS_OF_WEEK.forEach(day => {
        initialSchedule[day] = {
          isWorking: true,
          hours: [
            {
              startTime: '09:00',
              endTime: '17:00',
              locationId: undefined,
            },
          ],
        };
      });
      return initialSchedule;
    });

    // Update form state whenever weekSchedule changes to track dirty state
    useEffect(() => {
      if (initializedRef.current) {
        setValue('weekSchedule', weekSchedule, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    }, [weekSchedule, setValue]);

    // Initialize form with default schedule on mount
    useEffect(() => {
      if (!initializedRef.current) {
        reset({ weekSchedule });
        initializedRef.current = true;
      }
    }, [reset, weekSchedule]);

    // Handle update when form is submitted from profile
    const handleUpdateWorkingHours = useCallback(async () => {
      try {
        const workingHoursData = {
          working_hours: Object.entries(weekSchedule).map(
            ([day, schedule]) => ({
              day_of_week: day.toLowerCase(),
              is_available: schedule.isWorking,
              time_slots: schedule.isWorking
                ? schedule.hours.map(hour => ({
                  start_time: hour.startTime,
                  end_time: hour.endTime,
                  other_locations_id: hour.locationId,
                }))
                : [],
            })
          ),
        };

        await updateWorkingHours(workingHoursData);

        Alert.alert('Success', 'Working hours updated successfully!');

        reset({ weekSchedule });
      } catch (error: any) {
        const errorMessage =
          error?.message || 'Failed to update working hours. Please try again.';
        Alert.alert('Error', errorMessage);
        logger.error('Update error:', error as Error, {
          component: 'WorkingHoursForm',
        });
      }
    }, [weekSchedule, updateWorkingHours, reset]);

    // Memoize locations from profile data
    const locations = useMemo(() => {
      if (profile?.other_locations && profile.other_locations.length > 0) {
        return [
          // { id: undefined, name: "No specific location" },
          ...(profile.other_locations || []).map((loc, index) => ({
            id: index + 1,
            name: loc.location_name,
          })),
        ];
      }
      return [
        { id: undefined, name: 'No specific location' },
        { id: 1, name: 'Main Office' },
        { id: 2, name: 'Branch 1' },
        { id: 3, name: 'Branch 2' },
      ];
    }, [profile?.other_locations]);

    const handleRetry = useCallback(async () => {
      setIsRetrying(true);
      await refetch(true);
      setIsRetrying(false);
    }, [refetch]);

    // Auto-populate working hours from profile data (similar to other forms)
    useEffect(() => {
      if (profile?.working_hours && profile.working_hours.length > 0) {
        const profileSchedule: WeekSchedule = {};

        // Initialize all days
        DAYS_OF_WEEK.forEach(day => {
          profileSchedule[day] = {
            isWorking: false,
            hours: [],
          };
        });

        // Populate with profile data
        profile.working_hours.forEach(workingHour => {
          const day = workingHour.day_of_week;
          if (day && typeof day === 'string') {
            const capitalizedDay = day.charAt(0).toUpperCase() + day.slice(1);
            if (DAYS_OF_WEEK.includes(capitalizedDay)) {
              profileSchedule[capitalizedDay] = {
                isWorking: workingHour.is_available || false,
                hours:
                  workingHour.time_slots?.map(slot => ({
                    startTime: slot.start_time || '09:00',
                    endTime: slot.end_time || '17:00',
                    locationId: slot.other_locations_id,
                  })) || [],
              };
            }
          }
        });

        setWeekSchedule(profileSchedule);
        reset({ weekSchedule: profileSchedule });
        logger.info('WorkingHoursForm populated with profile data', {
          component: 'WorkingHoursForm',
          workingHoursCount: profile.working_hours.length,
        });
      } else if (
        profile &&
        (!profile.working_hours || profile.working_hours.length === 0)
      ) {
        logger.info(
          'WorkingHoursForm keeping default schedule - no working hours in profile',
          {
            component: 'WorkingHoursForm',
          }
        );
      }
    }, [profile, reset]);

    const formFields = ['startTime', 'endTime'];
    const {
      selectedInput,
      getBorderColor,
      getLabelStyle,
      handleFocus,
      handleBlur,
    } = useAnimatedFormField(formFields, 'white');

    const addTimeSlot = () => {
      setWeekSchedule(prev => {
        const newSchedule = { ...prev };
        const daySchedule = { ...newSchedule[selectedDay] };
        daySchedule.hours.push({
          startTime: '09:00',
          endTime: '17:00',
          locationId: undefined,
        });
        newSchedule[selectedDay] = daySchedule;
        return newSchedule;
      });
    };

    const removeTimeSlot = (index: number) => {
      setWeekSchedule(prev => {
        const newSchedule = { ...prev };
        const daySchedule = { ...newSchedule[selectedDay] };
        daySchedule.hours = daySchedule.hours.filter((_, i) => i !== index);
        newSchedule[selectedDay] = daySchedule;
        return newSchedule;
      });
    };

    const toggleWorkingDay = () => {
      setWeekSchedule(prev => {
        const newSchedule = { ...prev };
        const daySchedule = { ...newSchedule[selectedDay] };
        daySchedule.isWorking = !daySchedule.isWorking;
        newSchedule[selectedDay] = daySchedule;
        return newSchedule;
      });
    };

    const updateTimeSlot = (
      index: number,
      field: 'startTime' | 'endTime',
      value: string
    ) => {
      setWeekSchedule(prev => {
        const newSchedule = { ...prev };
        const daySchedule = { ...newSchedule[selectedDay] };
        const hours = [...daySchedule.hours];
        const hourSlot = { ...hours[index] };
        hourSlot[field] = value;
        hours[index] = hourSlot;
        daySchedule.hours = hours;
        newSchedule[selectedDay] = daySchedule;
        return newSchedule;
      });
    };

    const updateLocation = (
      timeSlotIndex: number,
      locationId: number | undefined
    ) => {
      setWeekSchedule(prev => {
        const newSchedule = { ...prev };
        const daySchedule = { ...newSchedule[selectedDay] };
        const hours = [...daySchedule.hours];
        const hourSlot = { ...hours[timeSlotIndex] };
        hourSlot.locationId = locationId;
        hours[timeSlotIndex] = hourSlot;
        daySchedule.hours = hours;
        newSchedule[selectedDay] = daySchedule;
        return newSchedule;
      });
    };

    if ((isLoading && !profile) || isRetrying) {
      return (
        <View className="flex-1 items-center justify-center py-20 px-4">
          <ThreeDotsLoader size={24} />
        </View>
      );
    }

    if (error && !profile) {
      return (
        <View className="flex-1 items-center justify-center py-20 px-4">
          <Text className="text-center text-gray-700 font-semibold text-base mb-4">
            An error occurred while fetching your profile.
          </Text>
          <Text
            className="text-center text-orange-600 font-semibold"
            onPress={handleRetry}
          >
            Tap to retry
          </Text>
        </View>
      );
    }

    // Read-only view - plain text display of working hours
    if (readOnly) {
      const workingDays = DAYS_OF_WEEK.filter(day => weekSchedule[day]?.isWorking);

      return (
        <View className="flex-1 bg-white">
          <ScrollView
            className="flex-1 bg-white"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16 }}
          >
            {workingDays.length > 0 ? (
              <View className="space-y-4">
                {workingDays.map((day, index) => (
                  <View
                    key={day}
                    className="bg-white rounded-2xl p-5 mb-2"
                  >
                    <View className="flex-row items-center mb-4">
                      <View className="w-10 h-10 rounded-full items-center justify-center mr-3">
                        <MaterialCommunityIcons
                          name="calendar-clock"
                          size={20}
                          color="#F05C0C"
                        />
                      </View>
                      <Text className="text-lg font-bold text-gray-900">
                        {day}
                      </Text>
                    </View>

                    <View className="space-y-3 pl-2">
                      {weekSchedule[day].hours.map((slot, idx) => (
                        <View
                          key={idx}
                          className="bg-gray-50 rounded-xl p-3"
                        >
                          <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center">
                              <MaterialCommunityIcons
                                name="clock-outline"
                                size={18}
                                color="#4B5563"
                              />
                              <Text className="ml-2 text-base font-semibold text-gray-800">
                                {slot.startTime} - {slot.endTime}
                              </Text>
                            </View>

                            {slot.locationId &&
                              locations.find(l => l.id === slot.locationId) && (
                                <View className="bg-white px-2.5 py-1 rounded-md flex-row items-center">
                                  <MaterialCommunityIcons
                                    name="map-marker-outline"
                                    size={14}
                                    color="#F05C0C"
                                    style={{ marginRight: 4 }}
                                  />
                                  <Text className="text-xs font-medium text-gray-600">
                                    {locations.find(l => l.id === slot.locationId)?.name}
                                  </Text>
                                </View>
                              )}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className="items-center justify-center py-20">
                <View className="w-20 h-20 rounded-full items-center justify-center mb-6">
                  <MaterialCommunityIcons
                    name="calendar-remove"
                    size={40}
                    color="#9CA3AF"
                  />
                </View>
                <Text className="text-xl font-bold text-gray-900 mb-2">
                  No Schedule Available
                </Text>
                <Text className="text-gray-500 text-center max-w-[250px]">
                  This doctor hasn't set up their working hours yet.
                </Text>
              </View>
            )}
            <View className="h-10" />
          </ScrollView>
        </View>
      );
    }

    return (
      <View className="flex-1 bg-white">
        <ScrollView
          className="flex-1 bg-white"
          showsVerticalScrollIndicator={false}
        >
          <View className="p-4">
            <View className="flex-row justify-between mb-6">
              {DAYS_OF_WEEK.map(day => {
                const dayAbbr = day.substring(0, 3);
                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => setSelectedDay(day)}
                    className={`px-3 py-2 rounded-full ${selectedDay === day ? 'bg-[#F05C0C]' : 'bg-gray-200'
                      }`}
                    style={{ minWidth: 44 }}
                  >
                    <Text
                      className={`text-center font-semibold text-sm ${selectedDay === day ? 'text-white' : 'text-gray-700'
                        }`}
                    >
                      {dayAbbr}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="mb-6">
              <RadioButton
                isSelected={weekSchedule[selectedDay].isWorking}
                onSelect={readOnly ? () => { } : toggleWorkingDay}
                label={`Working on ${selectedDay}`}
              />
            </View>

            {weekSchedule[selectedDay].isWorking && (
              <>
                {weekSchedule[selectedDay].hours.map((timeSlot, index) => (
                  <View
                    key={index}
                    className="mb-6 p-4 border-b border-gray-200 rounded-lg bg-white"
                  >
                    <View className="flex-row justify-between items-center mb-4">
                      {/* <Text className="text-lg font-semibold">
                        Time Slot {index + 1}
                      </Text> */}
                      {index > 0 && !readOnly && (
                        <TouchableOpacity onPress={() => removeTimeSlot(index)}>
                          <MaterialCommunityIcons
                            name="close"
                            size={24}
                            color="gray"
                          />
                        </TouchableOpacity>
                      )}
                    </View>

                    <View className="flex-row justify-between mb-4">
                      <View className="flex-1 mr-2">
                        <FormFieldWrapper
                          type="time"
                          field="startTime"
                          value={timeSlot.startTime}
                          label="Start Time"
                          isActive={selectedInput === 'startTime'}
                          borderColor={getBorderColor('startTime')}
                          labelStyle={getLabelStyle('startTime')}
                          onFocus={() => handleFocus('startTime')}
                          onBlur={() => handleBlur('startTime')}
                          onChange={time =>
                            updateTimeSlot(index, 'startTime', time)
                          }
                          backgroundColor='white'
                        />
                      </View>

                      <View className="flex-1 ml-2">
                        <FormFieldWrapper
                          type="time"
                          field="endTime"
                          value={timeSlot.endTime}
                          label="End Time"
                          isActive={selectedInput === 'endTime'}
                          borderColor={getBorderColor('endTime')}
                          labelStyle={getLabelStyle('endTime')}
                          onFocus={() => handleFocus('endTime')}
                          onBlur={() => handleBlur('endTime')}
                          onChange={time =>
                            updateTimeSlot(index, 'endTime', time)
                          }
                          backgroundColor='white'
                        />
                      </View>
                    </View>

                    <View className="flex-row flex-wrap">
                      {(readOnly
                        ? locations.filter(loc => loc.id === timeSlot.locationId)
                        : locations
                      ).map(location => (
                        <TouchableOpacity
                          key={location.id || 'no-location'}
                          onPress={() => !readOnly && updateLocation(index, location.id)}
                          disabled={readOnly}
                          className={`px-3 py-1.5 mr-2 mb-2 rounded-full ${timeSlot.locationId === location.id
                            ? 'border-2 border-[#F05C0C]'
                            : 'border-2 border-gray-300'
                            }`}
                          activeOpacity={readOnly ? 1 : 0.7}
                        >
                          <Text
                            className={`font-medium ${timeSlot.locationId === location.id
                              ? 'text-[#F05C0C]'
                              : 'text-gray-700'
                              }`}
                          >
                            {location.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}

                {!readOnly && (
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={addTimeSlot}
                    className="flex-row items-center justify-center p-4 border border-gray-200 rounded-lg mb-4 bg-white"
                  >
                    <MaterialCommunityIcons name="plus" size={24} color="gray" />
                    <Text className="ml-2 text-gray-700">Add Time Slot</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Bottom Spacing */}
            <View className="h-32" />
          </View>
        </ScrollView>

        {!readOnly && (isDirty || isUpdatingWorkingHours) && (
          <Animated.View
            entering={FadeInUp.duration(300)}
            exiting={FadeOutDown.duration(200)}
            className="absolute bottom-4 left-4 right-4 mb-4"
          >
            <StandardBottomButton
              onPress={handleUpdateWorkingHours}
              label="Save Working Hours"
              isLoading={isUpdatingWorkingHours}
              isDisabled={isUpdatingWorkingHours}
            />
          </Animated.View>
        )}
      </View>
    );
  }
);

WorkingHoursForm.displayName = 'WorkingHoursForm';
