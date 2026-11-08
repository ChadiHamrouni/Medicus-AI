import React from 'react';
import {
  ProfileCard,
  ProfileRow,
} from '@/components/shared/ui/ProfileNavigation';
import { PatientSection } from './PatientSectionsConfig';

interface PatientSectionGroupProps {
  sections: PatientSection[];
  sectionKeys: string[];
  isViewingAsDoctor?: boolean;
  className?: string;
}

const NOT_IMPLEMENTED = new Set([
  'patient_status',
  'appointment_reminders',
  'emergency_access',
  'insurance',
]);

export const PatientSectionGroup: React.FC<PatientSectionGroupProps> = ({
  sections,
  sectionKeys,
  isViewingAsDoctor = false,
  className = 'mt-3 mx-4',
}) => {
  // Sections without a working screen yet are hidden (listed in the README roadmap).
  const filteredSections = sectionKeys
    .map(key => sections.find(s => s.key === key))
    .filter((s): s is PatientSection => !!s && !NOT_IMPLEMENTED.has(s.key));

  return (
    <ProfileCard className={className}>
      {filteredSections.map((section, index, arr) => {
        const isLast = index === arr.length - 1;
        return (
          <ProfileRow
            key={section.key}
            title={section.title}
            description={section.description}
            href={section.route}
            icon={section.icon}
            isLast={isLast}
            badge={!isViewingAsDoctor ? section.badge : undefined}
          />
        );
      })}
    </ProfileCard>
  );
};
