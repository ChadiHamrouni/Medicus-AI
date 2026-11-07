import {
  EmergencyContact,
  MedicalData,
  PatientAdditionalInfoData,
  PatientMetadata,
  PatientProfileResponse,
} from '@/types';
import { env, logger, authenticatedFetch } from '@/utils';

const API_BASE_URL = env.medicusUserApiBaseUrl;

/**
 * Update patient profile information
 */
export const updatePatientProfile = async (
  profileData: Partial<PatientProfileResponse>,
  patient_id?: number
): Promise<PatientProfileResponse> => {
  try {
    logger.info('Updating patient profile', {
      component: 'MedicusUserService',
      profileData,
      fieldsToUpdate: Object.keys(profileData),
    });

    const patientId = patient_id;

    // Structure the data according to PatientProfileUpdateRequest format
    const updateRequest: any = {};

    // Basic info updates - direct mapping for most fields
    if (profileData.first_name !== undefined) {
      updateRequest.first_name = profileData.first_name;
    }
    if (profileData.last_name !== undefined) {
      updateRequest.last_name = profileData.last_name;
    }
    if (profileData.dob !== undefined) {
      updateRequest.dob = profileData.dob;
    }
    if (profileData.gender !== undefined) {
      updateRequest.gender = profileData.gender;
    }
    if (profileData.country_id !== undefined) {
      updateRequest.country_id = profileData.country_id;
    }

    // Address updates - structure as address object
    const addressInfo: any = {};
    if (profileData.address !== undefined) {
      addressInfo.address = profileData.address;
    }
    if (profileData.city !== undefined) {
      addressInfo.city = profileData.city;
    }
    if (profileData.state !== undefined) {
      addressInfo.state = profileData.state;
    }
    if (profileData.zip_code !== undefined) {
      addressInfo.zip_code = profileData.zip_code;
    }
    if (profileData.country_id !== undefined) {
      addressInfo.country_id = profileData.country_id;
    }

    if (Object.keys(addressInfo).length > 0) {
      updateRequest.address = addressInfo;
    }

    // Emergency contact updates - pass through directly
    if (profileData.emergency_contact !== undefined) {
      updateRequest.emergency_contact = profileData.emergency_contact;
    }

    // Contact info updates - structure as contact object
    const contactInfo: any = {};
    if (profileData.email !== undefined) {
      contactInfo.email = profileData.email;
    }
    if (profileData.phone_number !== undefined) {
      contactInfo.phone_number = profileData.phone_number;
    }
    if (profileData.whatsapp_number !== undefined) {
      contactInfo.whatsapp_number = profileData.whatsapp_number;
    }

    if (Object.keys(contactInfo).length > 0) {
      updateRequest.contact = contactInfo;
    }

    // Medical data updates - structure as medical_data object
    const medicalData: any = {};
    if (profileData.medical_conditions !== undefined) {
      medicalData.medical_conditions = profileData.medical_conditions;
    }
    if (profileData.allergies !== undefined) {
      medicalData.allergies = profileData.allergies;
    }
    if (profileData.medications !== undefined) {
      medicalData.medications = profileData.medications;
    }

    if (Object.keys(medicalData).length > 0) {
      updateRequest.medical_data = medicalData;
    }

    logger.info('Structured update request', {
      component: 'MedicusUserService',
      updateRequest,
      patientId,
      hasEmergencyContact: !!updateRequest.emergency_contact,
    });

    // Update the patient using the patient ID
    const response = await authenticatedFetch(
      `${API_BASE_URL}/patients/${patientId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updateRequest),
      }
    );

    if (!response.ok) {
      const responseText = await response.text();
      logger.error(
        `PUT /patients/${patientId} failed: ${response.status} ${response.statusText}. ${responseText}`,
        undefined,
        {
          component: 'MedicusUserService',
          status: response.status,
          statusText: response.statusText,
          responseText,
          updateRequest,
          patientId,
        }
      );

      // Special handling for validation errors (500 with missing required fields)
      if (
        response.status === 500 &&
        responseText.includes('validation errors')
      ) {
        logger.warn('Backend patient data validation failed during update', {
          component: 'MedicusUserService',
          patientId,
          issue: 'Missing required fields or validation error',
          suggestion: 'Check backend patient data structure',
        });

        throw new Error(
          'Failed to update patient profile due to validation errors. Please ensure all required fields are provided.'
        );
      }

      let errorMessage = `Failed to update contact info: ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData?.detail || errorData?.message || errorMessage;
      } catch {
        errorMessage = responseText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const updatedProfile = await response.json();

    logger.info('Patient profile updated successfully', {
      component: 'MedicusUserService',
      profileId: updatedProfile.id,
      patientId,
      updatedFields: Object.keys(profileData),
    });

    return updatedProfile;
  } catch (error) {
    logger.error('Failed to update patient profile', error as Error, {
      component: 'MedicusUserService',
      profileData,
    });
    throw error;
  }
};

/**
 * Update patient medical data (health conditions, allergies, etc.)
 */
export const updatePatientMedicalData = async (
  patientId: number,
  medicalData: {
    medical_conditions?: string[];
    allergies?: string;
    blood_type?: string;
    other_conditions?: string;
    family_history?: string;
    medications?: string[];
    [key: string]: any;
  }
): Promise<{ success: boolean; message: string; data: any }> => {
  try {
    logger.info('Updating patient medical data', {
      component: 'MedicusUserService',
      patientId,
      medicalDataKeys: Object.keys(medicalData),
    });

    const response = await authenticatedFetch(
      `${API_BASE_URL}/patients/${patientId}/medical-data`,
      {
        method: 'PUT',
        body: JSON.stringify(medicalData),
      }
    );

    if (!response.ok) {
      const responseText = await response.text();
      logger.error(
        `PUT /patients/${patientId}/medical-data failed: ${response.status} ${response.statusText}. ${responseText}`,
        undefined,
        {
          component: 'MedicusUserService',
          status: response.status,
          statusText: response.statusText,
          responseText,
          patientId,
        }
      );

      let errorMessage = `Failed to update medical data: ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData?.detail || errorData?.message || errorMessage;
      } catch {
        errorMessage = responseText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const result = await response.json();

    logger.info('Patient medical data updated successfully', {
      component: 'MedicusUserService',
      patientId,
      updatedFields: Object.keys(medicalData),
    });

    return result;
  } catch (error) {
    logger.error('Failed to update patient medical data', error as Error, {
      component: 'MedicusUserService',
      patientId,
      medicalData,
    });
    throw error;
  }
};

/**
 * Update patient medical data (allergies, chronic conditions, medications)
 */
export const updatePatientMedical = async (
  patientId: number,
  medicalData: MedicalData
): Promise<any> => {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/patients/${patientId}/medical-data`,
    {
      method: 'PUT',
      body: JSON.stringify(medicalData),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update medical data: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Update patient emergency contact information
 */
export const updatePatientEmergencyContact = async (
  patientId: number,
  emergencyContact: EmergencyContact
): Promise<any> => {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/patients/${patientId}/emergency-contact`,
    {
      method: 'PUT',
      body: JSON.stringify(emergencyContact),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to update emergency contact: ${response.statusText}`
    );
  }

  return response.json();
};

/**
 * Update patient metadata (insurance, language preferences)
 */
export const updatePatientMetadata = async (
  patientId: number,
  metadata: PatientMetadata
): Promise<any> => {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/patients/${patientId}/metadata`,
    {
      method: 'PUT',
      body: JSON.stringify(metadata),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update metadata: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Update all patient additional information in one call
 */
export const updatePatientAdditionalInfo = async (
  patientId: number,
  data: PatientAdditionalInfoData
): Promise<void> => {
  // Prepare medical data
  const medicalData: MedicalData = {};
  if (data.chronicConditions) {
    medicalData.chronic_conditions = data.chronicConditions
      .split(',')
      .map(c => c.trim());
  }
  if (data.allergies) {
    medicalData.allergies = data.allergies;
  }
  if (data.medications) {
    medicalData.medications = data.medications.split(',').map(m => m.trim());
  }

  // Prepare emergency contact
  const emergencyContact: EmergencyContact = {};
  if (data.emergencyContact || data.emergencyPhone) {
    emergencyContact.primary_contact = {
      name: data.emergencyContact,
      phone: data.emergencyPhone,
    };
  }

  // Prepare metadata
  const metadata: PatientMetadata = {};
  if (data.insuranceProvider) {
    metadata.insurance_provider = data.insuranceProvider;
  }
  if (data.insuranceId) {
    metadata.insurance_member_id = data.insuranceId;
  }
  if (data.preferredLanguage) {
    metadata.preferred_language = data.preferredLanguage;
  }

  // Update each section if it has data
  const promises = [];

  if (Object.keys(medicalData).length > 0) {
    promises.push(updatePatientMedical(patientId, medicalData));
  }

  if (emergencyContact.primary_contact) {
    promises.push(updatePatientEmergencyContact(patientId, emergencyContact));
  }

  if (Object.keys(metadata).length > 0) {
    promises.push(updatePatientMetadata(patientId, metadata));
  }

  // Execute all updates
  await Promise.all(promises);
};
