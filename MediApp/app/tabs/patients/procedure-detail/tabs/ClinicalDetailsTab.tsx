import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { MedicalProcedure, MedicalProcedureDetailEntry } from '@/services';
import { formatEventTime } from '@/utils/date';

interface ClinicalDetailsTabProps {
  procedure: MedicalProcedure;
}

const ClinicalDetailsTab: React.FC<ClinicalDetailsTabProps> = ({ procedure }) => {
  const clinicalEvents = procedure.medical_procedure_details || [];

  // Sort events chronologically (most recent first for display)
  const sortedEvents = [...clinicalEvents].sort((a, b) => {
    return new Date(b.time).getTime() - new Date(a.time).getTime();
  });

  const getSeverityBadge = (severity: number) => {
    if (severity === 0) {
      return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Routine' };
    } else if (severity === 1) {
      return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Watch' };
    } else if (severity === 2) {
      return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Elevated' };
    } else {
      return { bg: 'bg-red-100', text: 'text-red-700', label: 'Critical' };
    }
  };

  const getEventTypeIcon = (eventType: string): string => {
    const type = eventType.toLowerCase();
    if (type.includes('vital')) return 'heart-pulse';
    if (type.includes('medication') || type.includes('med')) return 'pill';
    if (type.includes('observation')) return 'eye-outline';
    if (type.includes('incision') || type.includes('surgical')) return 'scalpel-path';
    if (type.includes('complication')) return 'alert-circle-outline';
    if (type.includes('anesthesia')) return 'sleep';
    if (type.includes('closure')) return 'check-circle-outline';
    return 'clipboard-text-outline';
  };

  const formatTimestamp = (timeString: string) => {
    try {
      // Try to parse as full datetime
      const date = new Date(timeString);
      if (!isNaN(date.getTime())) {
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        };
      }

      // If not a valid date, treat as time string
      return {
        date: '', // No date
        time: formatEventTime(timeString),
      };
    } catch (error) {
      console.warn('Failed to format timestamp:', timeString, error);
      return {
        date: '',
        time: timeString,
      };
    }
  };

  // Parse content if it's a JSON string
  const parseContent = (content: any): string => {
    if (typeof content === 'string') {
      try {
        const parsed = JSON.parse(content);
        return parsed.text || parsed.description || JSON.stringify(parsed, null, 2);
      } catch {
        return content;
      }
    }
    if (typeof content === 'object') {
      return content.text || content.description || JSON.stringify(content, null, 2);
    }
    return String(content);
  };

  // Empty state
  if (clinicalEvents.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-16 px-6">
        <View className="bg-gray-100 rounded-full p-6 mb-4">
          <MaterialCommunityIcons name="clipboard-pulse-outline" size={48} color="#9CA3AF" />
        </View>
        <Text className="text-lg font-semibold text-gray-900 mb-2 text-center">
          No Clinical Events Logged
        </Text>
        <Text className="text-sm text-gray-500 text-center">
          {procedure.procedure_status === 'scheduled'
            ? 'Clinical events will be recorded during and after the procedure.'
            : 'No clinical events have been logged for this procedure.'}
        </Text>
      </View>
    );
  }

  return (
    <View className="p-4">
      {/* Header Stats */}
      <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              Total Events
            </Text>
            <Text className="text-2xl font-bold text-gray-900">
              {clinicalEvents.length}
            </Text>
          </View>

          <View className="flex-1">
            <Text className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              Critical Events
            </Text>
            <Text className="text-2xl font-bold text-red-600">
              {clinicalEvents.filter(e => e.severity >= 2).length}
            </Text>
          </View>

          <View className="flex-1">
            <Text className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              Routine Events
            </Text>
            <Text className="text-2xl font-bold text-gray-600">
              {clinicalEvents.filter(e => e.severity === 0).length}
            </Text>
          </View>
        </View>
      </View>

      {/* Timeline Header */}
      <View className="flex-row items-center mb-4 px-2">
        <MaterialCommunityIcons name="timeline-clock" size={20} color="#2563EB" />
        <Text className="text-base font-bold text-gray-900 ml-2">
          Clinical Timeline
        </Text>
        <Text className="text-xs text-gray-500 ml-auto">
          Most Recent First
        </Text>
      </View>

      {/* Clinical Events Timeline */}
      <View>
        {sortedEvents.map((event, index) => {
          const { date, time } = formatTimestamp(event.time);
          const severityBadge = getSeverityBadge(event.severity);
          const eventIcon = getEventTypeIcon(event.type);
          const isLastItem = index === sortedEvents.length - 1;

          return (
            <View key={event.id || index} className="flex-row mb-4">
              {/* Timeline Line */}
              <View className="items-center mr-4">
                <View
                  className={`w-10 h-10 rounded-full items-center justify-center ${
                    event.severity >= 2
                      ? 'bg-red-100'
                      : event.severity === 1
                        ? 'bg-orange-100'
                        : 'bg-gray-100'
                  }`}
                >
                  <MaterialCommunityIcons
                    name={eventIcon as any}
                    size={20}
                    color={
                      event.severity >= 2
                        ? '#EF4444'
                        : event.severity === 1
                          ? '#F97316'
                          : '#6B7280'
                    }
                  />
                </View>
                {!isLastItem && (
                  <View className="w-0.5 flex-1 bg-gray-200 mt-2" style={{ minHeight: 40 }} />
                )}
              </View>

              {/* Event Card */}
              <View className="flex-1 bg-white rounded-xl border border-gray-200 p-4 mb-2">
                {/* Header */}
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1 mr-2">
                    <View className="flex-row items-center mb-1">
                      <Text className="text-sm font-bold text-gray-900 capitalize">
                        {event.type.replace(/_/g, ' ')}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-500">
                      {date} at {time}
                    </Text>
                  </View>

                  {/* Severity Badge */}
                  <View className={`px-2 py-1 rounded-md ${severityBadge.bg}`}>
                    <Text className={`text-xs font-semibold ${severityBadge.text}`}>
                      {severityBadge.label}
                    </Text>
                  </View>
                </View>

                {/* Actor Information */}
                {event.actor_name && (
                  <View className="flex-row items-center mb-3 pb-3 border-b border-gray-100">
                    <MaterialCommunityIcons
                      name="account-circle"
                      size={16}
                      color="#6B7280"
                    />
                    <Text className="text-sm text-gray-700 ml-2">
                      {event.actor_name}
                    </Text>
                    {event.role && (
                      <View className="bg-blue-50 px-2 py-0.5 rounded ml-2">
                        <Text className="text-xs text-blue-700 font-medium capitalize">
                          {event.role}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Event Content */}
                <Text className="text-sm text-gray-700 leading-6">
                  {parseContent(event.content)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Footer Note */}
      <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-2">
        <View className="flex-row items-start">
          <MaterialCommunityIcons name="information-outline" size={18} color="#2563EB" />
          <View className="ml-3 flex-1">
            <Text className="text-sm font-semibold text-blue-900 mb-1">
              Clinical Events Log
            </Text>
            <Text className="text-xs text-blue-800">
              This chronological log contains all clinical events, observations, and actions
              recorded during the procedure. Events are color-coded by severity level.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default ClinicalDetailsTab;