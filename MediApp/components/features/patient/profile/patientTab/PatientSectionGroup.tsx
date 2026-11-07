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

export const PatientSectionGroup: React.FC<PatientSectionGroupProps> = ({
  sections,
  sectionKeys,
  isViewingAsDoctor = false,
  className = 'mt-3 mx-4',
}) => {
  const filteredSections = sectionKeys
    .map(key => sections.find(s => s.key === key))
    .filter((s): s is PatientSection => !!s);

  return (
    <ProfileCard className={className}>
      {filteredSections.map((section, index, arr) => {
        const isLast = index === arr.length - 1;
        const isDisabled =
          section.key === 'patient_status' ||
          section.key === 'appointment_reminders' ||
          section.key === 'emergency_access' ||
          section.key === 'insurance';

        return (
          <ProfileRow
            key={section.key}
            title={section.title}
            description={section.description}
            href={section.route}
            icon={section.icon}
            isLast={isLast}
            badge={
              !isViewingAsDoctor && !isDisabled ? section.badge : undefined
            }
            disabled={isDisabled}
            showComingSoon={isDisabled}
          />
        );
      })}
    </ProfileCard>
  );
};
