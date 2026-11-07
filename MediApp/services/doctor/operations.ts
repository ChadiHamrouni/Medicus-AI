import {
  AdditionalLinksRequest,
  ContactInfo,
  DoctorLocation,
  DoctorUpdateRequest,
  MedicalProceduresRequest,
  PracticeInfoData,
  ProfessionalInfoRequest,
  WorkingHoursRequest,
} from '@/types';
import { env, logger, authenticatedFetch } from '@/utils';

const API_BASE_URL = env.medicusUserApiBaseUrl;

/**
 * Update doctor additional info
 */
export const updateDoctorAdditionalInfo = async (
  additionalData: DoctorUpdateRequest
): Promise<void> => {
  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/doctor/additional-info`,
      {
        method: 'PUT',
        body: JSON.stringify(additionalData),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to update doctor additional info: ${response.status}`
      );
    }

    logger.info('Doctor additional info updated successfully', {
      component: 'MedicusUserService',
    });
  } catch (error) {
    logger.error('Failed to update doctor additional info', error as Error, {
      component: 'MedicusUserService',
    });
    throw error;
  }
};

/**
 * Update doctor additional links
 */
export const updateDoctorAdditionalLinks = async (
  linksData: AdditionalLinksRequest
): Promise<void> => {
  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/doctor/additional-links`,
      {
        method: 'PUT',
        body: JSON.stringify(linksData),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to update doctor additional links: ${response.status}`
      );
    }

    logger.info('Doctor additional links updated successfully', {
      component: 'MedicusUserService',
    });
  } catch (error) {
    logger.error('Failed to update doctor additional links', error as Error, {
      component: 'MedicusUserService',
    });
    throw error;
  }
};

/**
 * Update doctor contact info
 */
export const updateDoctorContactInfo = async (
  contactData: ContactInfo
): Promise<void> => {
  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/doctor/contact-info`,
      {
        method: 'PUT',
        body: JSON.stringify(contactData),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to update doctor contact info: ${response.status}`
      );
    }

    logger.info('Doctor contact info updated successfully', {
      component: 'MedicusUserService',
    });
  } catch (error) {
    logger.error('Failed to update doctor contact info', error as Error, {
      component: 'MedicusUserService',
    });
    throw error;
  }
};

/**
 * Update doctor working hours
 */
export const updateDoctorWorkingHours = async (
  data: WorkingHoursRequest
): Promise<void> => {
  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/doctor/working-hours`,
      {
        method: 'PUT',
        body: JSON.stringify(data.working_hours),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to update doctor working hours: ${response.status}`
      );
    }

    logger.info('Doctor working hours updated successfully', {
      component: 'MedicusUserService',
    });
  } catch (error) {
    logger.error('Failed to update doctor working hours', error as Error, {
      component: 'MedicusUserService',
    });
    throw error;
  }
};

/**
 * Update doctor procedures
 */
export const updateDoctorProcedures = async (
  proceduresData: MedicalProceduresRequest
): Promise<void> => {
  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/doctor/procedures`,
      {
        method: 'PUT',
        body: JSON.stringify(proceduresData),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update doctor procedures: ${response.status}`);
    }

    logger.info('Doctor procedures updated successfully', {
      component: 'MedicusUserService',
    });
  } catch (error) {
    logger.error('Failed to update doctor procedures', error as Error, {
      component: 'MedicusUserService',
    });
    throw error;
  }
};

/**
 * Update doctor working hours
 */
export const updateDoctorPracticeInformation = async (
  practiceInfoData: PracticeInfoData
): Promise<void> => {
  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/doctor/practice-info`,
      {
        method: 'PUT',
        body: JSON.stringify(practiceInfoData),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to update doctor practice information: ${response.status}`
      );
    }

    logger.info('Doctor practice information updated successfully', {
      component: 'MedicusUserService',
    });
  } catch (error) {
    logger.error(
      'Failed to update doctor practice information',
      error as Error,
      {
        component: 'MedicusUserService',
      }
    );
    throw error;
  }
};

/**
 * Update doctor locations
 */
export const updateDoctorLocations = async (
  locations: DoctorLocation[]
): Promise<void> => {
  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/doctor/locations`,
      {
        method: 'PUT',
        body: JSON.stringify(locations),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update doctor locations: ${response.status}`);
    }

    logger.info('Doctor locations updated successfully', {
      component: 'MedicusUserService',
    });
  } catch (error) {
    logger.error('Failed to update doctor locations', error as Error, {
      component: 'MedicusUserService',
    });
    throw error;
  }
};

export const updateDoctorProfessionalInfo = async (
  professionalData: ProfessionalInfoRequest
): Promise<void> => {
  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/doctor/professional-info`,
      {
        method: 'PUT',
        body: JSON.stringify(professionalData),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to update doctor professional info: ${response.status}`
      );
    }

    logger.info('Doctor professional info updated successfully', {
      component: 'MedicusUserService',
    });
  } catch (error) {
    logger.error('Failed to update doctor professional info', error as Error, {
      component: 'MedicusUserService',
    });
    throw error;
  }
};
