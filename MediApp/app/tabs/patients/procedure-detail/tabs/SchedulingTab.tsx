import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { MedicalProcedure } from '@/services';

interface SchedulingTabProps {
  procedure: MedicalProcedure;
}

const InfoCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
    {children}
  </View>
);

const InfoRow: React.FC<{
  icon: string;
  label: string;
  value: string | React.ReactNode;
  iconColor?: string;
}> = ({ icon, label, value, iconColor = '#2563EB' }) => (
  <View className="mb-4 last:mb-0">
    <View className="flex-row items-center mb-2">
      <MaterialCommunityIcons name={icon as any} size={18} color={iconColor} />
      <Text className="text-xs text-gray-500 ml-2 uppercase tracking-wide">
        {label}
      </Text>
    </View>
    {typeof value === 'string' ? (
      <Text className="text-base text-gray-900 font-medium ml-6">{value}</Text>
    ) : (
      <View className="ml-6">{value}</View>
    )}
  </View>
);

const SchedulingTab: React.FC<SchedulingTabProps> = ({ procedure }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; color: string }> = {
      scheduled: { bg: 'bg-blue-50', text: 'text-blue-700', color: 'border-blue-200' },
      completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', color: 'border-emerald-200' },
      cancelled: { bg: 'bg-gray-50', text: 'text-gray-600', color: 'border-gray-300' },
      active: { bg: 'bg-orange-50', text: 'text-orange-700', color: 'border-orange-200' },
    };

    const config = statusConfig[status] || statusConfig.scheduled;

    return (
      <View className={`${config.bg} px-3 py-1.5 rounded-full border ${config.color} self-start`}>
        <Text className={`text-sm font-semibold ${config.text} capitalize`}>
          {status}
        </Text>
      </View>
    );
  };

  return (
    <View className="p-4">
      {/* Status Badge */}
      <View className="mb-4">
        {getStatusBadge(procedure.procedure_status)}
      </View>

      {/* Date & Time Information */}
      <InfoCard>
        <Text className="text-lg font-bold text-gray-900 mb-4">
          Date & Time
        </Text>

        <InfoRow
          icon="calendar"
          label="Scheduled Date"
          value={formatDate(procedure.scheduled_date)}
        />

        {procedure.scheduled_time && (
          <InfoRow
            icon="clock-outline"
            label="Scheduled Time"
            value={procedure.scheduled_time}
          />
        )}

        {procedure.timeline_status && (
          <InfoRow
            icon="timeline-clock"
            label="Timeline Status"
            value={
              <View className="flex-row items-center">
                <View
                  className={`px-2 py-1 rounded-md ${
                    procedure.timeline_status === 'upcoming'
                      ? 'bg-blue-100'
                      : procedure.timeline_status === 'today'
                        ? 'bg-orange-100'
                        : 'bg-gray-100'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium capitalize ${
                      procedure.timeline_status === 'upcoming'
                        ? 'text-blue-700'
                        : procedure.timeline_status === 'today'
                          ? 'text-orange-700'
                          : 'text-gray-700'
                    }`}
                  >
                    {procedure.timeline_status}
                  </Text>
                </View>
              </View>
            }
          />
        )}
      </InfoCard>

      {/* Duration Information */}
      {(procedure.expected_duration || procedure.actual_duration) && (
        <InfoCard>
          <Text className="text-lg font-bold text-gray-900 mb-4">
            Duration
          </Text>

          {procedure.expected_duration && (
            <InfoRow
              icon="timer-outline"
              label="Expected Duration"
              value={`${procedure.expected_duration} minutes`}
              iconColor="#F05C0C"
            />
          )}

          {procedure.actual_duration && (
            <InfoRow
              icon="timer"
              label="Actual Duration"
              value={
                <View>
                  <Text className="text-base text-gray-900 font-medium">
                    {procedure.actual_duration} minutes
                  </Text>
                  {procedure.expected_duration &&
                    procedure.actual_duration > procedure.expected_duration * 1.2 && (
                      <Text className="text-xs text-orange-600 mt-1">
                        Exceeded expected duration by{' '}
                        {procedure.actual_duration - procedure.expected_duration} minutes
                      </Text>
                    )}
                </View>
              }
              iconColor="#F05C0C"
            />
          )}
        </InfoCard>
      )}

      {/* Provider Information */}
      <InfoCard>
        <Text className="text-lg font-bold text-gray-900 mb-4">
          Provider Information
        </Text>

        {procedure.doctor_name && (
          <InfoRow
            icon="doctor"
            label="Doctor"
            value={`Dr. ${procedure.doctor_name}`}
            iconColor="#10B981"
          />
        )}

        {procedure.healthcare_provider_name && (
          <InfoRow
            icon="hospital-building"
            label="Healthcare Provider"
            value={procedure.healthcare_provider_name}
            iconColor="#10B981"
          />
        )}
      </InfoCard>

      {/* Location Information */}
      {(procedure.formatted_location || procedure.location) && (
        <InfoCard>
          <Text className="text-lg font-bold text-gray-900 mb-4">
            Location
          </Text>

          <InfoRow
            icon="map-marker"
            label="Address"
            value={
              procedure.formatted_location ||
              (typeof procedure.location === 'string'
                ? procedure.location
                : procedure.location
                  ? JSON.stringify(procedure.location, null, 2)
                  : 'Not specified')
            }
            iconColor="#EF4444"
          />

          {(procedure.latitude || procedure.longitude) && (
            <InfoRow
              icon="map"
              label="Coordinates"
              value={`${procedure.latitude || 'N/A'}, ${procedure.longitude || 'N/A'}`}
              iconColor="#EF4444"
            />
          )}
        </InfoCard>
      )}

      {/* Procedure Details */}
      {(procedure.procedure_code || procedure.body_part) && (
        <InfoCard>
          <Text className="text-lg font-bold text-gray-900 mb-4">
            Procedure Details
          </Text>

          {procedure.procedure_code && (
            <InfoRow
              icon="barcode"
              label="Procedure Code"
              value={procedure.procedure_code}
            />
          )}

          {procedure.body_part && (
            <InfoRow
              icon="human"
              label="Body Part"
              value={procedure.body_part}
              iconColor="#8B5CF6"
            />
          )}
        </InfoCard>
      )}

      {/* Preparation Instructions (for upcoming) */}
      {procedure.timeline_status === 'upcoming' &&
        procedure.preparation_instructions && (
          <View className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
            <View className="flex-row items-center mb-3">
              <MaterialCommunityIcons
                name="alert-circle"
                size={24}
                color="#F97316"
              />
              <Text className="text-base font-bold text-orange-900 ml-2">
                Preparation Required
              </Text>
            </View>
            <Text className="text-sm text-orange-800 leading-6">
              {procedure.preparation_instructions}
            </Text>
          </View>
        )}

      {/* Post-Procedure Instructions */}
      {procedure.post_procedure_instructions && (
        <InfoCard>
          <View className="flex-row items-center mb-3">
            <MaterialCommunityIcons
              name="clipboard-text-outline"
              size={20}
              color="#10B981"
            />
            <Text className="text-lg font-bold text-gray-900 ml-2">
              Post-Procedure Instructions
            </Text>
          </View>
          <Text className="text-sm text-gray-700 leading-6">
            {procedure.post_procedure_instructions}
          </Text>
        </InfoCard>
      )}

      {/* Metadata */}
      <View className="bg-gray-50 rounded-xl p-4 mt-2">
        <Text className="text-xs text-gray-500 mb-1">
          Created: {new Date(procedure.created_at).toLocaleString()}
        </Text>
        {procedure.updated_at && (
          <Text className="text-xs text-gray-500">
            Last Updated: {new Date(procedure.updated_at).toLocaleString()}
          </Text>
        )}
      </View>
    </View>
  );
};

export default SchedulingTab;