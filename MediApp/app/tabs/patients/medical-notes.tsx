import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StandardScreenLayout } from '@/components/shared/layout';
import { useMedicalNotes } from '@/hooks/patient/useMedicalNotes';
import { useAuthContext } from '@/contexts/AuthContext';
import { useDependents } from '@/contexts/DependentsContext';
import { MedicalNote } from '@/services';

// SOAP Section Component
const SOAPSection: React.FC<{
  title: string;
  icon: string;
  color: string;
  children: React.ReactNode;
}> = ({ title, icon, color, children }) => {
  return (
    <View className="mb-4">
      <View className="flex-row items-center mb-2">
        <MaterialCommunityIcons name={icon as any} size={18} color={color} />
        <Text className="text-base font-bold text-gray-900 ml-2">{title}</Text>
      </View>
      <View className="bg-gray-50 rounded-xl p-3 border border-gray-200">
        {children}
      </View>
    </View>
  );
};

// Note Card Component
const NoteCard: React.FC<{ note: MedicalNote }> = ({ note }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const { subjective, objective, assessment, plan } = note.note_details;

  const renderArrayItems = (items: string[] | undefined, fallback: string) => {
    if (!items || items.length === 0)
      return <Text className="text-sm text-gray-600">{fallback}</Text>;
    return (
      <View>
        {items.map((item, index) => (
          <View key={index} className="flex-row items-start mb-1">
            <Text className="text-gray-600 mr-2">•</Text>
            <Text className="text-sm text-gray-900 flex-1">{item}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderTextOrFallback = (text: string | undefined, fallback: string) => {
    return (
      <Text className="text-sm text-gray-900">
        {text || <Text className="text-gray-600">{fallback}</Text>}
      </Text>
    );
  };

  return (
    <View className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-black/5 mb-4 overflow-hidden">
      {/* Header */}
      <LinearGradient
        colors={['#FEF3C7', '#FDE68A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.8}
        >
          <View className="flex-row items-center justify-between p-4">
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-900 mb-1">
                SOAP Note
              </Text>
              <Text className="text-sm text-gray-700">
                {new Date(note.note_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <MaterialCommunityIcons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={24}
              color="#92400E"
            />
          </View>
        </TouchableOpacity>
      </LinearGradient>

      {/* Doctor Info - Always Visible */}
      <View className="px-4 py-3 border-b border-gray-100">
        <View className="flex-row items-center">
          <MaterialCommunityIcons name="doctor" size={18} color="#D97706" />
          <View className="ml-3">
            <Text className="text-xs text-gray-500">Provider</Text>
            <Text className="text-sm font-semibold text-gray-900">
              Dr. {note.doctor_name}
            </Text>
          </View>
        </View>
      </View>

      {/* Chief Complaint - Always Visible */}
      <View className="px-4 py-3 bg-amber-50 border-b border-gray-100">
        <Text className="text-xs text-gray-500 mb-1">Chief Complaint</Text>
        <Text className="text-sm font-medium text-gray-900">
          {subjective.chief_complaint}
        </Text>
      </View>

      {/* Expandable SOAP Details */}
      {isExpanded && (
        <View className="px-4 py-4">
          {/* SUBJECTIVE */}
          <SOAPSection title="Subjective" icon="account-voice" color="#D97706">
            {subjective.hpi && (
              <View className="mb-3">
                <Text className="text-xs text-gray-500 mb-1">
                  History of Present Illness
                </Text>
                {renderTextOrFallback(subjective.hpi, 'Not documented')}
              </View>
            )}

            {subjective.ros && (
              <View className="mb-3">
                <Text className="text-xs text-gray-500 mb-1">
                  Review of Systems
                </Text>
                {renderTextOrFallback(subjective.ros, 'Not documented')}
              </View>
            )}

            {subjective.medical_history && (
              <View className="mb-3">
                <Text className="text-xs text-gray-500 mb-1">
                  Medical History
                </Text>
                {renderTextOrFallback(
                  subjective.medical_history,
                  'No significant history'
                )}
              </View>
            )}

            {subjective.medications && subjective.medications.length > 0 && (
              <View className="mb-3">
                <Text className="text-xs text-gray-500 mb-1">
                  Current Medications
                </Text>
                {renderArrayItems(subjective.medications, 'None')}
              </View>
            )}

            {subjective.allergies && subjective.allergies.length > 0 && (
              <View className="mb-3">
                <Text className="text-xs text-gray-500 mb-1">Allergies</Text>
                {renderArrayItems(subjective.allergies, 'No known allergies')}
              </View>
            )}

            {subjective.patient_quotes &&
              subjective.patient_quotes.length > 0 && (
                <View>
                  <Text className="text-xs text-gray-500 mb-1">
                    Patient Quotes
                  </Text>
                  {subjective.patient_quotes.map((quote, index) => (
                    <View key={index} className="mb-2">
                      <Text className="text-sm italic text-gray-700">
                        &quot;{quote}&quot;
                      </Text>
                    </View>
                  ))}
                </View>
              )}
          </SOAPSection>

          {/* OBJECTIVE */}
          {objective && (objective.vital_signs || objective.physical_exam) && (
            <SOAPSection title="Objective" icon="stethoscope" color="#059669">
              {objective.vital_signs && (
                <View className="mb-3">
                  <Text className="text-xs text-gray-500 mb-1">
                    Vital Signs
                  </Text>
                  {renderTextOrFallback(
                    objective.vital_signs,
                    'Not documented'
                  )}
                </View>
              )}

              {objective.physical_exam && (
                <View>
                  <Text className="text-xs text-gray-500 mb-1">
                    Physical Exam
                  </Text>
                  {renderTextOrFallback(
                    objective.physical_exam,
                    'Not documented'
                  )}
                </View>
              )}
            </SOAPSection>
          )}

          {/* ASSESSMENT */}
          {assessment &&
            (assessment.diagnosis ||
              assessment.differential_diagnosis ||
              assessment.progress ||
              assessment.summary) && (
              <SOAPSection
                title="Assessment"
                icon="clipboard-text"
                color="#2563EB"
              >
                {assessment.diagnosis && (
                  <View className="mb-3">
                    <Text className="text-xs text-gray-500 mb-1">
                      Diagnosis
                    </Text>
                    {renderTextOrFallback(
                      assessment.diagnosis,
                      'Not documented'
                    )}
                  </View>
                )}

                {assessment.differential_diagnosis &&
                  assessment.differential_diagnosis.length > 0 && (
                    <View className="mb-3">
                      <Text className="text-xs text-gray-500 mb-1">
                        Differential Diagnosis
                      </Text>
                      {renderArrayItems(
                        assessment.differential_diagnosis,
                        'None'
                      )}
                    </View>
                  )}

                {assessment.progress && (
                  <View className="mb-3">
                    <Text className="text-xs text-gray-500 mb-1">Progress</Text>
                    {renderTextOrFallback(
                      assessment.progress,
                      'Not documented'
                    )}
                  </View>
                )}

                {assessment.summary && (
                  <View>
                    <Text className="text-xs text-gray-500 mb-1">Summary</Text>
                    {renderTextOrFallback(assessment.summary, 'Not documented')}
                  </View>
                )}
              </SOAPSection>
            )}

          {/* PLAN */}
          {plan &&
            (plan.treatment ||
              plan.medications ||
              plan.further_tests ||
              plan.referrals ||
              plan.patient_education ||
              plan.follow_up ||
              plan.goals) && (
              <SOAPSection
                title="Plan"
                icon="file-document-edit"
                color="#7C3AED"
              >
                {plan.treatment && (
                  <View className="mb-3">
                    <Text className="text-xs text-gray-500 mb-1">
                      Treatment
                    </Text>
                    {renderTextOrFallback(plan.treatment, 'Not documented')}
                  </View>
                )}

                {plan.medications && plan.medications.length > 0 && (
                  <View className="mb-3">
                    <Text className="text-xs text-gray-500 mb-1">
                      Medications
                    </Text>
                    {renderArrayItems(plan.medications, 'None prescribed')}
                  </View>
                )}

                {plan.further_tests && plan.further_tests.length > 0 && (
                  <View className="mb-3">
                    <Text className="text-xs text-gray-500 mb-1">
                      Further Tests
                    </Text>
                    {renderArrayItems(plan.further_tests, 'None ordered')}
                  </View>
                )}

                {plan.referrals && plan.referrals.length > 0 && (
                  <View className="mb-3">
                    <Text className="text-xs text-gray-500 mb-1">
                      Referrals
                    </Text>
                    {renderArrayItems(plan.referrals, 'None')}
                  </View>
                )}

                {plan.patient_education &&
                  plan.patient_education.length > 0 && (
                    <View className="mb-3">
                      <Text className="text-xs text-gray-500 mb-1">
                        Patient Education
                      </Text>
                      {renderArrayItems(plan.patient_education, 'None')}
                    </View>
                  )}

                {plan.follow_up && (
                  <View className="mb-3">
                    <Text className="text-xs text-gray-500 mb-1">
                      Follow-Up
                    </Text>
                    {renderTextOrFallback(plan.follow_up, 'Not specified')}
                  </View>
                )}

                {plan.goals && plan.goals.length > 0 && (
                  <View>
                    <Text className="text-xs text-gray-500 mb-1">
                      Treatment Goals
                    </Text>
                    {renderArrayItems(plan.goals, 'None specified')}
                  </View>
                )}
              </SOAPSection>
            )}
        </View>
      )}

      {/* Expand/Collapse Hint */}
      {!isExpanded && (
        <View className="px-4 py-3 border-t border-gray-100">
          <Text className="text-xs text-center text-gray-500">
            Tap to view full SOAP note
          </Text>
        </View>
      )}
    </View>
  );
};

// Empty State Component
const EmptyState: React.FC = () => {
  return (
    <View className="items-center justify-center py-16 px-6">
      <View className="bg-gray-100 rounded-full p-6 mb-4">
        <MaterialCommunityIcons
          name="note-text-outline"
          size={48}
          color="#9CA3AF"
        />
      </View>
      <Text className="text-lg font-semibold text-gray-900 mb-2 text-center">
        No Medical Notes
      </Text>
      <Text className="text-sm text-gray-500 text-center">
        Your clinical notes from visits will appear here.
      </Text>
    </View>
  );
};

// Loading Skeleton
const NotesSkeleton: React.FC = () => {
  return (
    <View className="px-4 pt-4">
      {[1, 2, 3].map(i => (
        <View
          key={i}
          className="bg-white rounded-2xl border border-gray-100 mb-4 p-5"
        >
          <View className="bg-gray-200 h-6 w-2/3 rounded mb-3" />
          <View className="bg-gray-200 h-4 w-1/2 rounded mb-4" />
          <View className="bg-gray-200 h-16 w-full rounded" />
        </View>
      ))}
    </View>
  );
};

// Main Notes Screen
const MedicalNotesScreen: React.FC = () => {
  const { authState } = useAuthContext();
  const { selectedDependent } = useDependents();

  // Determine patient ID based on selected dependent
  const patientId =
    selectedDependent === 'main'
      ? authState.patientProfile?.id || null
      : typeof selectedDependent === 'number'
        ? selectedDependent
        : null;

  const { notes, total, isLoading, refetch } = useMedicalNotes(patientId);

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <StandardScreenLayout title="Medical Notes" bottomSpacingColor="bg-gray-50">
      {/* Header Stats */}
      <View className="bg-white border-b border-gray-200 px-4 py-3">
        <View className="flex-row items-center">
          <MaterialCommunityIcons
            name="note-multiple"
            size={20}
            color="#D97706"
          />
          <Text className="text-sm text-gray-600 ml-2">
            {total} {total === 1 ? 'note' : 'notes'} on record
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 bg-gray-50"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isLoading}
            onRefresh={handleRefresh}
          />
        }
      >
        {isLoading && !refreshing ? (
          <NotesSkeleton />
        ) : (
          <View className="px-4 pt-4 pb-8">
            {notes.length > 0 ? (
              <>
                {notes.map(note => (
                  <NoteCard key={note.id} note={note} />
                ))}

                {/* Info Notice */}
                <View className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mt-2">
                  <View className="flex-row items-start">
                    <MaterialCommunityIcons
                      name="information-outline"
                      size={18}
                      color="#D97706"
                    />
                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-semibold text-gray-900 mb-1">
                        Clinical Documentation
                      </Text>
                      <Text className="text-xs text-gray-600">
                        These SOAP notes are created by your healthcare
                        providers during clinical visits. They provide a
                        comprehensive record of your medical encounters.
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            ) : (
              <EmptyState />
            )}
          </View>
        )}
      </ScrollView>
    </StandardScreenLayout>
  );
};

export default MedicalNotesScreen;
