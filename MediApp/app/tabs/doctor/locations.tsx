import React from 'react';
import { StandardScreenLayout } from '@/components/shared/layout';
import { AdditionalLocationsForm } from '@/components/shared/Profile/AdditionalLocationsForm';

const LocationsScreen: React.FC = () => {
  return (
    <StandardScreenLayout title="Locations">
      <AdditionalLocationsForm />
    </StandardScreenLayout>
  );
};

export default LocationsScreen;
