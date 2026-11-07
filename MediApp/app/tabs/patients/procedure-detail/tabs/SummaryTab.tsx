import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { MedicalProcedure } from '@/services';

interface SummaryTabProps {
  procedure: MedicalProcedure;
}

const SummaryTab: React.FC<SummaryTabProps> = ({ procedure }) => {
  // Check if procedure has summary
  const hasSummary = procedure.summary;
  const hasDescription = procedure.procedure_description;

  // Parse summary if it's a JSON string or object
  const parseSummary = () => {
    if (!procedure.summary) return null;

    if (typeof procedure.summary === 'string') {
      try {
        return JSON.parse(procedure.summary);
      } catch {
        return { narrative: procedure.summary };
      }
    }
    return procedure.summary;
  };

  const results = parseSummary();

  // Extract risk assessment and medical narrative if available
  const riskAssessment = results?.risk_assessment;
  const medicalNarrative = results?.medical_narrative || results?.narrative;
  const criticalInsights = results?.critical_insights || [];

  const getRiskBadge = (risk: string) => {
    const riskConfig: Record<string, { bg: string; text: string; border: string; icon: string }> = {
      STABLE: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        icon: 'check-circle',
      },
      GUARDED: {
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        border: 'border-yellow-200',
        icon: 'alert',
      },
      CRITICAL: {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        icon: 'alert-circle',
      },
    };

    const config = riskConfig[risk?.toUpperCase()] || riskConfig.STABLE;

    return (
      <View className={`${config.bg} border ${config.border} rounded-xl p-4 flex-row items-center`}>
        <MaterialCommunityIcons name={config.icon as any} size={24} color={config.text.replace('text-', '#')} />
        <View className="ml-3 flex-1">
          <Text className="text-xs text-gray-600 uppercase tracking-wide">Risk Assessment</Text>
          <Text className={`text-lg font-bold ${config.text} mt-1`}>{risk?.toUpperCase()}</Text>
        </View>
      </View>
    );
  };

  // Empty state
  if (!hasSummary && !hasDescription) {
    return (
      <View className="flex-1 items-center justify-center py-16 px-6">
        <View className="bg-gray-100 rounded-full p-6 mb-4">
          <MaterialCommunityIcons name="file-document-outline" size={48} color="#9CA3AF" />
        </View>
        <Text className="text-lg font-semibold text-gray-900 mb-2 text-center">
          No Summary Available
        </Text>
        <Text className="text-sm text-gray-500 text-center">
          {procedure.procedure_status === 'scheduled'
            ? 'Summary will be generated after the procedure is completed.'
            : 'No summary has been generated for this procedure yet.'}
        </Text>
      </View>
    );
  }

  return (
    <View className="p-4">
      {/* Risk Assessment Badge */}
      {riskAssessment && (
        <View className="mb-4">
          {getRiskBadge(riskAssessment)}
        </View>
      )}

      {/* Medical Narrative */}
      {medicalNarrative && (
        <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <View className="flex-row items-center mb-3">
            <MaterialCommunityIcons name="text-box-outline" size={20} color="#3B82F6" />
            <Text className="text-lg font-bold text-gray-900 ml-2">
              Medical Narrative
            </Text>
          </View>
          <Text className="text-base text-gray-700 leading-7">
            {medicalNarrative}
          </Text>
        </View>
      )}

      {/* Critical Insights */}
      {criticalInsights && criticalInsights.length > 0 && (
        <View className="bg-white rounded-xl border border-red-200 p-4 mb-4">
          <View className="flex-row items-center mb-4">
            <MaterialCommunityIcons name="alert-octagon" size={20} color="#EF4444" />
            <Text className="text-lg font-bold text-red-900 ml-2">
              Critical Insights
            </Text>
          </View>

          {criticalInsights.map((insight: any, index: number) => (
            <View
              key={index}
              className="bg-red-50 rounded-lg p-3 mb-3 last:mb-0"
            >
              <View className="flex-row items-start mb-2">
                <View className="flex-1">
                  <Text className="text-xs text-red-600 font-semibold uppercase">
                    {insight.source || 'Event'}
                  </Text>
                  {insight.time && (
                    <Text className="text-xs text-gray-500 mt-1">
                      {new Date(insight.time).toLocaleString()}
                    </Text>
                  )}
                </View>
                {insight.severity && (
                  <View className={`px-2 py-1 rounded-md ${
                    insight.severity >= 3
                      ? 'bg-red-200'
                      : insight.severity === 2
                        ? 'bg-orange-200'
                        : 'bg-yellow-200'
                  }`}>
                    <Text className={`text-xs font-bold ${
                      insight.severity >= 3
                        ? 'text-red-900'
                        : insight.severity === 2
                          ? 'text-orange-900'
                          : 'text-yellow-900'
                    }`}>
                      Severity: {insight.severity}
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-sm text-red-900">
                {insight.event || insight.description}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Procedure Description */}
      {hasDescription && (
        <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <View className="flex-row items-center mb-3">
            <MaterialCommunityIcons name="information-outline" size={20} color="#6B7280" />
            <Text className="text-lg font-bold text-gray-900 ml-2">
              Procedure Description
            </Text>
          </View>
          <Text className="text-sm text-gray-700 leading-6">
            {procedure.procedure_description}
          </Text>
        </View>
      )}

      {/* Summary (if string/text and no structured data) */}
      {hasSummary && typeof procedure.summary === 'string' && !results?.medical_narrative && (
        <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <View className="flex-row items-center mb-3">
            <MaterialCommunityIcons name="clipboard-check-outline" size={20} color="#10B981" />
            <Text className="text-lg font-bold text-gray-900 ml-2">
              Summary
            </Text>
          </View>
          <Text className="text-sm text-gray-700 leading-6">
            {procedure.summary}
          </Text>
        </View>
      )}

      {/* Generated At timestamp */}
      {results?.generated_at && (
        <View className="bg-gray-50 rounded-xl p-3 mt-2">
          <Text className="text-xs text-gray-500 text-center">
            Summary generated on {new Date(results.generated_at).toLocaleString()}
          </Text>
        </View>
      )}
    </View>
  );
};

export default SummaryTab;