import { MedicationData } from '@/stores/patientStore';
import { logger } from '../infrastructure/logger';

interface DoctorInfo {
  id: number;
  name: string;
  specialty?: string;
  first_name?: string;
  last_name?: string;
}

// Cache for doctor information to avoid repeated API calls
const doctorCache = new Map<number, DoctorInfo>();

export class MedicationUtils {
  /**
   * Format doctor display name from medication data
   */
  static formatDoctorName = (doctorId: string): string => {
    const numericId = parseInt(doctorId, 10);
    const doctorInfo = doctorCache.get(numericId);
    if (doctorInfo) {
      logger.info('Using cached doctor info', {
        component: 'MedicationUtils',
        doctorId,
        doctorName: doctorInfo.name,
        specialty: doctorInfo.specialty,
        cacheSize: doctorCache.size,
      });
      return doctorInfo.name;
    }

    logger.warn('Doctor not found in cache', {
      component: 'MedicationUtils',
      doctorId,
      fallbackName: `Doctor ${doctorId}`,
      cacheSize: doctorCache.size,
      cachedIds: Array.from(doctorCache.keys()),
    });
    return `Doctor ${doctorId}`;
  };

  /**
   * Fetch doctor information by ID and cache it
   */
  static async fetchAndCacheDoctorInfo(
    doctorId: number
  ): Promise<DoctorInfo | null> {
    try {
      // Check if already cached
      if (doctorCache.has(doctorId)) {
        return doctorCache.get(doctorId)!;
      }

      // Fetch from API (dynamic import to avoid circular dependency)
      const { getDoctorById } = await import('@/services');
      const doctorData = await getDoctorById(doctorId);

      // Format the doctor name with "Dr." prefix
      const fullName =
        doctorData.full_name ||
        doctorData.name ||
        `${doctorData.first_name || ''} ${doctorData.last_name || ''}`.trim();
      const formattedName = fullName
        ? `Dr. ${fullName}`
        : `Doctor ${doctorData.id}`;

      const doctorInfo: DoctorInfo = {
        id: doctorData.id,
        name: formattedName,
        specialty: doctorData.specialty || doctorData.specialty_name,
        first_name: doctorData.first_name,
        last_name: doctorData.last_name,
      };

      // Cache the result
      doctorCache.set(doctorId, doctorInfo);

      logger.info('Doctor information cached', {
        component: 'MedicationUtils',
        doctorId,
        doctorName: doctorInfo.name,
        specialty: doctorInfo.specialty,
        originalName: doctorData.full_name || doctorData.name,
      });

      return doctorInfo;
    } catch (error) {
      logger.error('Failed to fetch doctor information', error as Error, {
        component: 'MedicationUtils',
        doctorId,
      });
      return null;
    }
  }

  /**
   * Format doctor display name
   */
  static async formatDoctorNameAsync(
    medication: MedicationData
  ): Promise<string> {
    // Extract doctor ID from the "Doctor X" format
    const match = medication.prescribed_by.match(/Doctor (\d+)/);
    if (match) {
      const doctorId = parseInt(match[1]);
      const doctorInfo = await this.fetchAndCacheDoctorInfo(doctorId);
      if (doctorInfo) {
        return doctorInfo.name;
      }
    }

    // Fallback to the original format
    return medication.prescribed_by;
  }

  /**
   * Group medications by doctor
   */
  static groupMedicationsByDoctor(
    medications: MedicationData[]
  ): Map<string, MedicationData[]> {
    const grouped = new Map<string, MedicationData[]>();

    medications.forEach(medication => {
      const doctorName = this.formatDoctorName(medication.prescribed_by);
      if (!grouped.has(doctorName)) {
        grouped.set(doctorName, []);
      }
      grouped.get(doctorName)!.push(medication);
    });

    return grouped;
  }

  /**
   * Group medications by date prescribed
   */
  static groupMedicationsByDate(
    medications: MedicationData[]
  ): Map<string, MedicationData[]> {
    const grouped = new Map<string, MedicationData[]>();

    medications.forEach(medication => {
      const date = medication.date_prescribed;
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(medication);
    });

    return grouped;
  }

  /**
   * Sort medications by date prescribed (newest first)
   */
  static sortMedicationsByDate(
    medications: MedicationData[]
  ): MedicationData[] {
    return [...medications].sort((a, b) => {
      const dateA = new Date(a.date_prescribed);
      const dateB = new Date(b.date_prescribed);
      return dateB.getTime() - dateA.getTime();
    });
  }

  /**
   * Filter medications by status
   */
  static filterMedicationsByStatus(
    medications: MedicationData[],
    status: 'active' | 'inactive' | 'completed'
  ): MedicationData[] {
    return medications.filter(medication => medication.status === status);
  }

  /**
   * Search medications by name
   */
  static searchMedicationsByName(
    medications: MedicationData[],
    searchTerm: string
  ): MedicationData[] {
    const term = searchTerm.toLowerCase();
    return medications.filter(
      medication =>
        medication.name.toLowerCase().includes(term) ||
        medication.category.toLowerCase().includes(term) ||
        medication.purpose.toLowerCase().includes(term)
    );
  }

  /**
   * Cache doctor information
   */
  static cacheDoctorInfo(doctorId: number, doctorInfo: DoctorInfo): void {
    doctorCache.set(doctorId, doctorInfo);
  }

  /**
   * Get cached doctor information
   */
  static getCachedDoctorInfo(doctorId: number): DoctorInfo | undefined {
    return doctorCache.get(doctorId);
  }

  /**
   * Clear doctor cache
   */
  static clearDoctorCache(): void {
    doctorCache.clear();
  }

  /**
   * Preload doctor names for a list of medications
   */
  static async preloadDoctorNames(
    medications: MedicationData[]
  ): Promise<void> {
    const doctorIds = new Set<number>();

    // Extract unique doctor IDs
    medications.forEach(medication => {
      const match = medication.prescribed_by.match(/Doctor (\d+)/);
      if (match) {
        doctorIds.add(parseInt(match[1]));
      }
    });

    // Fetch all doctor information in parallel
    const promises = Array.from(doctorIds).map(doctorId =>
      this.fetchAndCacheDoctorInfo(doctorId)
    );

    try {
      await Promise.all(promises);
      logger.info('Doctor names preloaded successfully', {
        component: 'MedicationUtils',
        doctorCount: doctorIds.size,
      });
    } catch (error) {
      logger.error('Failed to preload some doctor names', error as Error, {
        component: 'MedicationUtils',
        doctorCount: doctorIds.size,
      });
    }
  }
}
