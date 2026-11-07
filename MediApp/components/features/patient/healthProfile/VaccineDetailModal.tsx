import React from 'react';
import { Text } from 'react-native';
import { format } from 'date-fns';
import {
  DetailCard,
  DetailCardRow,
  StatusBadge,
} from '@/components/shared/ui/Modal';

interface VaccineDetailModalProps {
  vaccine: {
    vaccine: string;
    date: string;
    doctor_name?: string;
    healthcare_provider_name?: string;
    notes?: string;
  };
}

export const VaccineDetailModal: React.FC<VaccineDetailModalProps> = ({
  vaccine,
}) => {
  return (
    <>
      <DetailCard>
        <DetailCardRow
          icon="calendar"
          label="Date Administered"
          value={format(new Date(vaccine.date), 'MMMM dd, yyyy')}
          showDivider={false}
        />

        {vaccine.doctor_name && (
          <DetailCardRow
            icon="doctor"
            label="Administered By"
            value={`Dr. ${vaccine.doctor_name}`}
          />
        )}

        {vaccine.healthcare_provider_name && (
          <DetailCardRow
            icon="hospital-building"
            label="Location"
            value={vaccine.healthcare_provider_name}
          />
        )}

        {vaccine.notes && (
          <DetailCardRow
            icon="note-text"
            label="Notes"
            value={
              <Text className="text-sm text-gray-700 leading-5">
                {vaccine.notes}
              </Text>
            }
          />
        )}
      </DetailCard>

      <StatusBadge
        label="Vaccination Complete"
        icon="check-circle"
        variant="success"
      />
    </>
  );
};
