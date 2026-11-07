/**
 * Smart Document Generation Service for MediApp
 * Handles automated document creation, templates, and before/after photo management
 */

import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

import {
  BeforeAfterPhotoSet,
  DoctorDocumentCategory,
  DocumentCategoryMeta,
  DocumentGenerationRequest,
  DocumentGenerationResponse,
  DocumentTemplate,
  PhotoAngle,
  PhotoReference,
  UploadSuggestion,
} from '@/types/DoctorDocuments';
import { logger } from '@/utils';

class SmartDocumentGenerationService {
  private static instance: SmartDocumentGenerationService;
  private readonly TEMPLATES_KEY = '@doctor_document_templates';
  private readonly LICENSES_KEY = '@medical_licenses';
  private readonly CERTIFICATIONS_KEY = '@board_certifications';
  private readonly BEFORE_AFTER_KEY = '@before_after_photos';

  public static getInstance(): SmartDocumentGenerationService {
    if (!SmartDocumentGenerationService.instance) {
      SmartDocumentGenerationService.instance =
        new SmartDocumentGenerationService();
    }
    return SmartDocumentGenerationService.instance;
  }

  /**
   * Get all available document templates
   */
  public getDocumentTemplates(): DocumentTemplate[] {
    return [
      {
        id: 'medical-license-summary',
        name: 'Medical License Summary',
        category: DoctorDocumentCategory.MEDICAL_LICENSE,
        description:
          'Professional summary of all medical licenses and certifications',
        required_fields: ['doctor_name', 'primary_specialty', 'practice_name'],
        optional_fields: [
          'secondary_specialties',
          'hospital_affiliations',
          'years_experience',
        ],
        template_content: this.getMedicalLicenseSummaryTemplate(),
        preview_url: 'templates/medical-license-summary-preview.pdf',
      },
      {
        id: 'board-certification-verification',
        name: 'Board Certification Verification',
        category: DoctorDocumentCategory.BOARD_CERTIFICATIONS,
        description: 'Official verification document for board certifications',
        required_fields: [
          'doctor_name',
          'certification_board',
          'certification_date',
          'specialty',
        ],
        optional_fields: [
          'sub_specialty',
          'expiration_date',
          'certificate_number',
        ],
        template_content: this.getBoardCertificationTemplate(),
        preview_url: 'templates/board-certification-preview.pdf',
      },
      {
        id: 'treatment-outcome-report',
        name: 'Treatment Outcome Report',
        category: DoctorDocumentCategory.TREATMENT_OUTCOMES,
        description:
          'Comprehensive report of treatment outcomes and patient satisfaction',
        required_fields: ['procedure_name', 'outcome_metrics', 'patient_count'],
        optional_fields: [
          'follow_up_period',
          'complications',
          'satisfaction_score',
        ],
        template_content: this.getTreatmentOutcomeTemplate(),
        preview_url: 'templates/treatment-outcome-preview.pdf',
      },
      {
        id: 'case-study-template',
        name: 'Medical Case Study',
        category: DoctorDocumentCategory.CASE_STUDIES,
        description: 'Structured template for documenting medical cases',
        required_fields: [
          'case_title',
          'patient_demographics',
          'diagnosis',
          'treatment',
          'outcome',
        ],
        optional_fields: [
          'complications',
          'follow_up',
          'lessons_learned',
          'references',
        ],
        template_content: this.getCaseStudyTemplate(),
        preview_url: 'templates/case-study-preview.pdf',
      },
      {
        id: 'continuing-education-certificate',
        name: 'CE Credits Summary',
        category: DoctorDocumentCategory.CONTINUING_EDUCATION,
        description: 'Summary of continuing education credits and activities',
        required_fields: ['doctor_name', 'medical_licence', 'reporting_period'],
        optional_fields: [
          'total_credits',
          'activity_breakdown',
          'specialty_credits',
        ],
        template_content: this.getContinuingEducationTemplate(),
        preview_url: 'templates/ce-summary-preview.pdf',
      },
    ];
  }

  /**
   * Generate a document from a template
   */
  public async generateDocument(
    request: DocumentGenerationRequest
  ): Promise<DocumentGenerationResponse> {
    try {
      logger.info('Starting document generation', {
        component: 'SmartDocumentGenerationService',
        templateId: request.template_id,
        doctorId: request.doctor_id,
      });

      const template = this.getDocumentTemplates().find(
        t => t.id === request.template_id
      );
      if (!template) {
        throw new Error(`Template not found: ${request.template_id}`);
      }

      // Validate required fields
      for (const field of template.required_fields) {
        if (!request.field_data[field]) {
          throw new Error(`Required field missing: ${field}`);
        }
      }

      // Generate document content
      const generatedContent = this.processTemplate(
        template.template_content,
        request.field_data
      );

      // Create document file
      const documentId = `generated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fileName = `${template.name.replace(/\s+/g, '_')}_${documentId}.${request.output_format}`;

      const documentsDir = `${FileSystem.documentDirectory}generated_documents/`;
      const dirInfo = await FileSystem.getInfoAsync(documentsDir);

      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(documentsDir, {
          intermediates: true,
        });
      }

      const filePath = `${documentsDir}${fileName}`;

      // Save generated content based on format
      if (request.output_format === 'html') {
        await FileSystem.writeAsStringAsync(filePath, generatedContent);
      } else {
        // For PDF/DOCX, convert HTML to respective format (mock implementation)
        const convertedContent = await this.convertToFormat(
          generatedContent,
          request.output_format
        );
        await FileSystem.writeAsStringAsync(filePath, convertedContent, {
          encoding: 'base64',
        });
      }

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      const fileSize = fileInfo.exists ? fileInfo.size || 0 : 0;

      logger.info('Document generated successfully', {
        component: 'SmartDocumentGenerationService',
        documentId,
        fileName,
        fileSize: fileSize,
      });

      return {
        document_id: documentId,
        generated_url: filePath,
        status: 'completed',
        file_size: fileSize,
        preview_url: `${filePath}_preview.jpg`,
        message: 'Document generated successfully',
      };
    } catch (error) {
      logger.error('Failed to generate document', error as Error, {
        component: 'SmartDocumentGenerationService',
        templateId: request.template_id,
      });

      return {
        document_id: '',
        generated_url: '',
        status: 'failed',
        message: `Generation failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Process template with field data
   */
  private processTemplate(
    template: string,
    fieldData: Record<string, any>
  ): string {
    let processed = template;

    Object.entries(fieldData).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      processed = processed.replace(
        new RegExp(placeholder, 'g'),
        String(value)
      );
    });

    // Add current date
    processed = processed.replace(
      /{{current_date}}/g,
      new Date().toLocaleDateString()
    );

    return processed;
  }

  /**
   * Convert HTML content to other formats (mock implementation)
   */
  private async convertToFormat(
    htmlContent: string,
    format: 'pdf' | 'docx'
  ): Promise<string> {
    // Mock conversion - in production, use libraries like puppeteer for PDF or docx for Word
    const mockData = Buffer.from(htmlContent, 'utf-8').toString('base64');
    return mockData;
  }

  /**
   * Manage Before/After Photos
   */
  public async captureBeforeAfterPhoto(
    photoSet: Partial<BeforeAfterPhotoSet>,
    angle: PhotoAngle,
    photoType: 'before' | 'after' | 'follow-up'
  ): Promise<PhotoReference | null> {
    try {
      // Request camera permissions
      const cameraPermission =
        await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPermission.granted) {
        Alert.alert(
          'Permission Required',
          'Camera access is needed to capture photos.'
        );
        return null;
      }

      // Launch camera with optimal settings for medical photos
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1.0,
        aspect: [4, 3],
        exif: true,
      });

      if (result.canceled) {
        return null;
      }

      const asset = result.assets[0];

      // Generate secure photo reference
      const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store photo securely in app's document directory
      const photosDir = `${FileSystem.documentDirectory}before_after_photos/`;
      const dirInfo = await FileSystem.getInfoAsync(photosDir);

      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(photosDir, { intermediates: true });
      }

      const secureFileName = `${photoId}_${angle}_${photoType}.jpg`;
      const secureFilePath = `${photosDir}${secureFileName}`;

      // Copy the photo to our secure directory
      await FileSystem.copyAsync({
        from: asset.uri,
        to: secureFilePath,
      });

      // Create thumbnail
      const thumbnailPath = await this.createThumbnail(secureFilePath);

      const photoReference: PhotoReference = {
        id: photoId,
        photo_url: secureFilePath,
        thumbnail_url: thumbnailPath,
        angle,
        upload_date: new Date().toISOString(),
        file_size: asset.fileSize || 0,
        dimensions: {
          width: asset.width || 0,
          height: asset.height || 0,
        },
      };

      logger.info('Before/after photo captured', {
        component: 'SmartDocumentGenerationService',
        photoId,
        angle,
        photoType,
      });

      return photoReference;
    } catch (error) {
      logger.error('Failed to capture before/after photo', error as Error, {
        component: 'SmartDocumentGenerationService',
      });

      Alert.alert('Photo Error', 'Failed to capture photo. Please try again.');
      return null;
    }
  }

  /**
   * Create thumbnail for photo
   */
  private async createThumbnail(photoPath: string): Promise<string> {
    // Mock thumbnail creation - in production, use image processing library
    const thumbnailPath = photoPath.replace('.jpg', '_thumb.jpg');
    await FileSystem.copyAsync({
      from: photoPath,
      to: thumbnailPath,
    });
    return thumbnailPath;
  }

  /**
   * Get smart upload suggestions based on doctor's profile
   */
  public getUploadSuggestions(
    doctorSpecialty: string,
    existingDocuments: string[]
  ): UploadSuggestion[] {
    const suggestions: UploadSuggestion[] = [];

    // Essential credentials
    if (!existingDocuments.includes('medical-license')) {
      suggestions.push({
        category: DoctorDocumentCategory.MEDICAL_LICENSE,
        title: 'Upload Medical License',
        description:
          'Your medical license is required for profile verification',
        priority: 'high',
        reason: 'Required for verification',
        estimated_time_minutes: 5,
        template_available: true,
      });
    }

    if (!existingDocuments.includes('board-certifications')) {
      suggestions.push({
        category: DoctorDocumentCategory.BOARD_CERTIFICATIONS,
        title: 'Add Board Certifications',
        description:
          'Showcase your board certifications to build patient trust',
        priority: 'high',
        reason: 'Increases patient confidence',
        estimated_time_minutes: 10,
        template_available: true,
      });
    }

    // Specialty-specific suggestions
    if (
      doctorSpecialty === 'Plastic Surgery' ||
      doctorSpecialty === 'Dermatology'
    ) {
      if (!existingDocuments.includes('before-after-photos')) {
        suggestions.push({
          category: DoctorDocumentCategory.BEFORE_AFTER_PHOTOS,
          title: 'Add Before/After Photos',
          description:
            'Showcase your surgical outcomes with professional photos',
          priority: 'high',
          reason: 'Essential for cosmetic specialties',
          estimated_time_minutes: 30,
          template_available: false,
        });
      }
    }

    if (!existingDocuments.includes('case-studies')) {
      suggestions.push({
        category: DoctorDocumentCategory.CASE_STUDIES,
        title: 'Document Case Studies',
        description: 'Share interesting cases to demonstrate expertise',
        priority: 'medium',
        reason: 'Demonstrates clinical expertise',
        estimated_time_minutes: 45,
        template_available: true,
      });
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Get document category metadata
   */
  public getDocumentCategoryMetadata(): DocumentCategoryMeta[] {
    return [
      {
        category: DoctorDocumentCategory.MEDICAL_LICENSE,
        display_name: 'Medical License',
        description: 'State medical license documentation',
        icon: 'certificate',
        required_for_verification: true,
        expiration_tracking: true,
        auto_reminder_days: 90,
        upload_guidelines: [
          'Upload clear, high-resolution scans',
          'Include all pages of the license',
          'Ensure license is current and not expired',
        ],
        common_file_types: ['PDF', 'JPG', 'PNG'],
      },
      {
        category: DoctorDocumentCategory.BOARD_CERTIFICATIONS,
        display_name: 'Board Certifications',
        description: 'Board certification documents',
        icon: 'school',
        required_for_verification: true,
        expiration_tracking: true,
        auto_reminder_days: 180,
        upload_guidelines: [
          'Upload original certification documents',
          'Include any sub-specialty certifications',
          'Verify certification status with board',
        ],
        common_file_types: ['PDF', 'JPG'],
      },
      {
        category: DoctorDocumentCategory.BEFORE_AFTER_PHOTOS,
        display_name: 'Before/After Photos',
        description: 'Treatment outcome photography',
        icon: 'camera-account',
        required_for_verification: false,
        expiration_tracking: false,
        upload_guidelines: [
          'Ensure patient consent is obtained',
          'Use consistent lighting and angles',
          'Maintain patient privacy and anonymity',
          'Use professional photography standards',
        ],
        common_file_types: ['JPG', 'PNG'],
      },
      {
        category: DoctorDocumentCategory.CASE_STUDIES,
        display_name: 'Case Studies',
        description: 'Clinical case documentation',
        icon: 'file-document-outline',
        required_for_verification: false,
        expiration_tracking: false,
        upload_guidelines: [
          'Remove all patient identifying information',
          'Follow medical privacy guidelines',
          'Include clinical details and outcomes',
        ],
        common_file_types: ['PDF', 'DOCX'],
      },
    ];
  }

  // Template Content Methods
  private getMedicalLicenseSummaryTemplate(): string {
    return `
      <h1>Medical License Summary</h1>
      <h2>{{doctor_name}}</h2>
      
      <div class="section">
        <h3>Primary Practice Information</h3>
        <p><strong>Primary Specialty:</strong> {{primary_specialty}}</p>
        <p><strong>Practice Name:</strong> {{practice_name}}</p>
        {{#secondary_specialties}}<p><strong>Secondary Specialties:</strong> {{secondary_specialties}}</p>{{/secondary_specialties}}
        {{#years_experience}}<p><strong>Years of Experience:</strong> {{years_experience}}</p>{{/years_experience}}
      </div>
      
      <div class="section">
        <h3>License Information</h3>
        <!-- License details will be populated from stored data -->
      </div>
      
      <div class="footer">
        <p><em>Generated on {{current_date}}</em></p>
      </div>
    `;
  }

  private getBoardCertificationTemplate(): string {
    return `
      <h1>Board Certification Verification</h1>
      
      <div class="section">
        <h3>Physician Information</h3>
        <p><strong>Name:</strong> {{doctor_name}}</p>
        <p><strong>Specialty:</strong> {{specialty}}</p>
        {{#sub_specialty}}<p><strong>Sub-Specialty:</strong> {{sub_specialty}}</p>{{/sub_specialty}}
      </div>
      
      <div class="section">
        <h3>Certification Details</h3>
        <p><strong>Certifying Board:</strong> {{certification_board}}</p>
        <p><strong>Certification Date:</strong> {{certification_date}}</p>
        {{#expiration_date}}<p><strong>Expiration Date:</strong> {{expiration_date}}</p>{{/expiration_date}}
        {{#certificate_number}}<p><strong>Certificate Number:</strong> {{certificate_number}}</p>{{/certificate_number}}
      </div>
      
      <div class="footer">
        <p><em>This document certifies the board certification status as of {{current_date}}</em></p>
      </div>
    `;
  }

  private getTreatmentOutcomeTemplate(): string {
    return `
      <h1>Treatment Outcome Report</h1>
      
      <div class="section">
        <h3>Procedure Information</h3>
        <p><strong>Procedure Name:</strong> {{procedure_name}}</p>
        <p><strong>Patient Count:</strong> {{patient_count}}</p>
        {{#follow_up_period}}<p><strong>Follow-up Period:</strong> {{follow_up_period}}</p>{{/follow_up_period}}
      </div>
      
      <div class="section">
        <h3>Outcome Metrics</h3>
        <p>{{outcome_metrics}}</p>
        {{#satisfaction_score}}<p><strong>Patient Satisfaction:</strong> {{satisfaction_score}}</p>{{/satisfaction_score}}
        {{#complications}}<p><strong>Complications:</strong> {{complications}}</p>{{/complications}}
      </div>
      
      <div class="footer">
        <p><em>Report generated on {{current_date}}</em></p>
      </div>
    `;
  }

  private getCaseStudyTemplate(): string {
    return `
      <h1>Medical Case Study</h1>
      <h2>{{case_title}}</h2>
      
      <div class="section">
        <h3>Patient Demographics</h3>
        <p>{{patient_demographics}}</p>
      </div>
      
      <div class="section">
        <h3>Diagnosis</h3>
        <p>{{diagnosis}}</p>
      </div>
      
      <div class="section">
        <h3>Treatment</h3>
        <p>{{treatment}}</p>
      </div>
      
      <div class="section">
        <h3>Outcome</h3>
        <p>{{outcome}}</p>
      </div>
      
      {{#complications}}
      <div class="section">
        <h3>Complications</h3>
        <p>{{complications}}</p>
      </div>
      {{/complications}}
      
      {{#follow_up}}
      <div class="section">
        <h3>Follow-up</h3>
        <p>{{follow_up}}</p>
      </div>
      {{/follow_up}}
      
      {{#lessons_learned}}
      <div class="section">
        <h3>Lessons Learned</h3>
        <p>{{lessons_learned}}</p>
      </div>
      {{/lessons_learned}}
      
      <div class="footer">
        <p><em>Case study documented on {{current_date}}</em></p>
      </div>
    `;
  }

  private getContinuingEducationTemplate(): string {
    return `
      <h1>Continuing Education Credits Summary</h1>
      
      <div class="section">
        <h3>Physician Information</h3>
        <p><strong>Name:</strong> {{doctor_name}}</p>
        <p><strong>License Number:</strong> {{medical_licence}}</p>
        <p><strong>Reporting Period:</strong> {{reporting_period}}</p>
      </div>
      
      <div class="section">
        <h3>Credit Summary</h3>
        {{#total_credits}}<p><strong>Total Credits Earned:</strong> {{total_credits}}</p>{{/total_credits}}
        {{#specialty_credits}}<p><strong>Specialty Credits:</strong> {{specialty_credits}}</p>{{/specialty_credits}}
      </div>
      
      {{#activity_breakdown}}
      <div class="section">
        <h3>Activity Breakdown</h3>
        <p>{{activity_breakdown}}</p>
      </div>
      {{/activity_breakdown}}
      
      <div class="footer">
        <p><em>Summary generated on {{current_date}}</em></p>
      </div>
    `;
  }
}

// Export singleton instance
export const smartDocumentGenerationService =
  SmartDocumentGenerationService.getInstance();

export default SmartDocumentGenerationService;
