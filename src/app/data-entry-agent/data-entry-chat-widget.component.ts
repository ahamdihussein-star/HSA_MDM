import { Component, OnInit, OnDestroy, ChangeDetectorRef, TemplateRef, ViewChild, ElementRef, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { DataEntryAgentService, ExtractedData } from '../services/data-entry-agent.service';
import { TranslateService } from '@ngx-translate/core';
import { DemoDataGeneratorService, DemoCompany } from '../services/demo-data-generator.service';
import { SessionStagingService } from '../services/session-staging.service';
import { AutoTranslateService } from '../services/auto-translate.service';
import { Subject, Subscription } from 'rxjs';
import { NzModalService } from 'ng-zorro-antd/modal';
import { 
  CUSTOMER_TYPE_OPTIONS,
  SALES_ORG_OPTIONS,
  DISTRIBUTION_CHANNEL_OPTIONS,
  DIVISION_OPTIONS,
  CITY_OPTIONS,
  COUNTRY_OPTIONS,
  getCitiesByCountry
} from '../shared/lookup-data';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type: 'text' | 'loading' | 'progress' | 'dropdown' | 'contact-form' | 'confirmation' | 'actions';
  data?: any;
}

@Component({
  selector: 'app-data-entry-chat-widget',
  templateUrl: './data-entry-chat-widget.component.html',
  styleUrls: ['./data-entry-chat-widget.component.scss']
})
export class DataEntryChatWidgetComponent implements OnInit, OnDestroy {
  @ViewChild('documentModalTemplate', { static: false }) documentModalTemplate!: TemplateRef<any>;
  @ViewChild('directFileInput', { static: false }) directFileInput!: ElementRef<HTMLInputElement>;
  
  isOpen = false;
  isMinimized = true;
  messages: ChatMessage[] = [];
  newMessage = '';
  loading = false;
  
  // Performance optimizations
  private scrollTimeout: any = null;
  private currentAIRequest: Subscription | null = null;
  private destroyed$ = new Subject<void>();
  private readonly MAX_MESSAGES = 30;
  
  // Field tracking
  private fieldAttempts: { [key: string]: number } = {};
  private maxFieldAttempts = 3;
  private currentMissingField: string | null = null;
  private awaitingConfirmation = false;
  private awaitingDataReview = false;
  private currentLang: 'ar' | 'en' = 'en';
  
  // Document upload - ✅ NOW USING DATABASE ONLY
  pendingRetryFiles: File[] = [];  // ✅ Store files for retry on error
  showDocumentModal = false;
  currentCompanyId: string | null = null;  // ✅ Track current company in DB
  
  // ⚠️ DEPRECATED - Kept for backward compatibility only - DO NOT USE!
  // All document operations now use database (sessionStaging) instead
  private uploadedFiles: File[] = [];  // ❌ DEPRECATED - Use database
  private unifiedModalDocuments: any[] = [];  // ❌ DEPRECATED - Use database
  pendingFiles: File[] = [];
  documentMetadataForm!: FormGroup;
  currentDocumentStep: 'upload' | 'review' = 'upload';
  
  // ✅ Background governance - Company document management
  private currentCompanyDocuments: {
    companyId: string;
    companyName: string;
    documents: File[];
    extractedData: any;
  } | null = null;
  
  private allCompaniesDocuments: Map<string, any> = new Map();
  
  // Metadata extraction progress
  showMetadataExtractionProgress = false;
  metadataExtractionProgress = 0;
  metadataExtractionStatus = '';
  modalKey = 0; // Force modal re-render
  
  // New flow progress bar
  showProgressBar = false;
  progressValue = 0;
  progressStatus = '';
  private modalInstance: any = null; // Track modal instance
  
  // Contact form
  contactForm!: FormGroup;
  showContactForm = false;
  contactsAdded: any[] = [];
  
  // Edit form
  editForm!: FormGroup;
  showEditForm = false;
  
  // Missing fields form properties
  missingFieldsForm!: FormGroup;
  showMissingFieldsForm = false;
  currentMissingFields: string[] = [];
  
  // Unified Modal properties
  unifiedModalForm!: FormGroup;
  showUnifiedModal = false;
  extractedDataReadOnly = true; // Toggle for edit mode
  unifiedModalData: any = {
    extractedFields: [],
    missingFields: [],
    contacts: []
  };
  // Demo data properties
  currentDemoCompany: DemoCompany | null = null;
  private keyboardListener: ((event: KeyboardEvent) => void) | null = null;
  private lastSpaceTime: number = 0;
  private spaceClickCount: number = 0;

  // Document management for unified modal - ✅ REMOVED - NOW USING DATABASE ONLY
  showDocumentReplace = false;
  isReprocessingDocuments = false;
  originalExtractedData: any = {};

  // Document preview properties (similar to new-request.component.ts)
  showDocumentPreviewModal = false;
  previewDocumentUrl: string | null = null;
  previewDocumentType: 'pdf' | 'image' | 'other' = 'other';
  currentPreviewDocument: any = null;

  // Contact modal properties (Innovative Design)
  showContactModal = false;
  contactModalForm!: FormGroup;
  contactModalTitle = '';
  isEditingContact = false;
  editingContactIndex = -1;

  // Lookup data for dropdowns
  customerTypeOptions = CUSTOMER_TYPE_OPTIONS;
  countryOptions = COUNTRY_OPTIONS;
  salesOrgOptions = SALES_ORG_OPTIONS;
  distributionChannelOptions = DISTRIBUTION_CHANNEL_OPTIONS;
  divisionOptions = DIVISION_OPTIONS;
  cityOptions: any[] = [];
  currentExtractedFields: string[] = []; // ✅ For dynamic edit form
  
  // Accumulated files
  accumulatedFiles: File[] = [];
  showAccumulatedFiles = false;
  
  // Progress tracking
  extractionProgress = 0;
  currentProcessingFile = '';
  showProgress = false;
  // Fallback quick actions bar visibility
  showInlineQuickActions = false;

  // Countries and document types for metadata modal
  countriesList: string[] = ['Egypt', 'Saudi Arabia', 'United Arab Emirates', 'Yemen'];
  private documentTypes: { [key: string]: string[] } = {
    'Egypt': ['Commercial Registration', 'Tax Card', 'Power of Attorney', 'Other'],
    'Saudi Arabia': ['Commercial Registration', 'VAT Certificate', 'License', 'Other'],
    'United Arab Emirates': ['Trade License', 'Tax Registration', 'Authority Letter', 'Other'],
    'Yemen': ['Business License', 'Tax Document', 'Authorization', 'Other']
  };

  constructor(
    private agentService: DataEntryAgentService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private modalService: NzModalService,
    private demoDataGenerator: DemoDataGeneratorService,
    private translate: TranslateService,
    private sessionStaging: SessionStagingService,
    private autoTranslate: AutoTranslateService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    console.log('🧪 [Chat] ngOnInit called');
    console.log('🧪 [Chat] countriesList:', this.countriesList);
    console.log('🧪 [Chat] documentTypes:', this.documentTypes);
    try {
      const savedLang = sessionStorage.getItem('language');
      this.currentLang = savedLang === 'ar' ? 'ar' : 'en';
      console.log('🌐 [Chat] Initial language =', this.currentLang);
    } catch {}
    this.initializeChat();
    // Chat starts minimized by default - user needs to click to open

    // Setup keyboard auto-fill
    this.setupKeyboardAutoFill();
  }

  ngOnDestroy(): void {
    this.cleanup();
    if (this.keyboardListener && isPlatformBrowser(this.platformId)) {
      document.removeEventListener('keydown', this.keyboardListener, true);
    }
    // Remove modal listener if attached
    try {
      const modalContent = document.querySelector('.ant-modal-content');
      if (modalContent && this.modalKeyboardListener) {
        modalContent.removeEventListener('keydown', this.modalKeyboardListener as any);
      }
    } catch {}
  }

  private initializeForms(): void {
    console.log('🔧 [FORMS] Initializing forms...');
    
    // Initialize document metadata form to avoid undefined in template
    this.documentMetadataForm = this.fb.group({
      documents: this.fb.array([])
    });

    // Contact form with proper validation
    this.contactForm = this.fb.group({
      name: ['', Validators.required],
      jobTitle: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      mobile: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{10,15}$/)]],
      landline: ['', Validators.pattern(/^\+?[0-9]{7,15}$/)],
      preferredLanguage: ['Arabic', Validators.required]
    });

    // Contact modal form (Innovative Design)
    this.contactModalForm = this.fb.group({
      name: ['', Validators.required],
      jobTitle: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      mobile: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{10,15}$/)]],
      landline: ['', Validators.pattern(/^\+?[0-9]{7,15}$/)],
      preferredLanguage: ['Arabic', Validators.required]
    });

    // ✅ Edit form - تأكد من initialization صح
    this.editForm = this.fb.group({
      firstName: [''],        // ✅ بدون Validators علشان كل الحقول optional في التعديل
      firstNameAR: [''],
      tax: [''],
      CustomerType: [''],
      ownerName: [''],
      buildingNumber: [''],
      street: [''],
      country: [''],
      city: [''],
      salesOrganization: [''],
      distributionChannel: [''],
      division: ['']
    });
    
    // Missing fields form for incomplete data only
    this.missingFieldsForm = this.fb.group({
      firstName: [''],
      firstNameAR: [''],
      tax: [''],
      CustomerType: [''],
      ownerName: [''],
      buildingNumber: [''],
      street: [''],
      country: [''],
      city: [''],
      salesOrganization: [''],
      distributionChannel: [''],
      division: ['']
    });
    
    // Unified modal form - Initialize with normal values, not disabled objects
    this.unifiedModalForm = this.fb.group({
      // Company Information
      firstName: [''],
      firstNameAR: [''],
      tax: [''],
      CustomerType: [''],
      ownerName: [''],
      
      // Address Information
      buildingNumber: [''],
      street: [''],
      country: [''],
      city: [''],
      
      // Sales Information
      salesOrganization: [''],
      distributionChannel: [''],
      division: [''],
      
      // Contacts FormArray
      contacts: this.fb.array([])
    });

    // Watch country changes to update city options
    this.unifiedModalForm.get('country')?.valueChanges.subscribe(country => {
      this.updateCityOptions(country);
    });
    
    console.log('✅ [FORMS] Forms initialized:', {
      documentMetadataForm: !!this.documentMetadataForm,
      contactForm: !!this.contactForm,
      editForm: !!this.editForm,
      missingFieldsForm: !!this.missingFieldsForm
    });
  }

  get isDocumentFormValid(): boolean {
    return !!this.documentMetadataForm && this.documentMetadataForm.valid;
  }

  private initializeChat(): void {
    // Use requestIdleCallback for better performance, fallback to immediate execution
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
      this.addWelcomeMessage();
      });
    } else {
      this.addWelcomeMessage();
    }
  }

  private cleanup(): void {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    
    if (this.currentAIRequest) {
      this.currentAIRequest.unsubscribe();
    }
    
    this.destroyed$.next();
    this.destroyed$.complete();
    
    this.messages = [];
    this.accumulatedFiles = [];
    
    // ✅ Clear database session on destroy
    if (this.currentCompanyId) {
      this.sessionStaging.clearSession().catch(err => console.warn('Session cleanup failed:', err));
    }
  }

  private addWelcomeMessage(): void {
    const welcomeMessage: ChatMessage = {
      id: `welcome_${Date.now()}`,
      role: 'assistant',
      content: this.agentService.getWelcomeMessage(),
      timestamp: new Date(),
      type: 'text'
    };
    this.addMessage(welcomeMessage);
  }


  getCurrentUserName(): string {
    const user = this.agentService.getCurrentUser();
    return user?.fullName || 'Data Entry User';
  }

  toggleChat(): void {
    if (this.isMinimized) {
      // Open from minimized state
      this.isMinimized = false;
      this.isOpen = true;
    } else {
      // Toggle open/close when not minimized
      this.isOpen = !this.isOpen;
    }
  }

  minimizeChat(): void {
    this.isMinimized = true;
    this.isOpen = false;
  }

  closeChat(): void {
    this.isOpen = false;
    this.isMinimized = false;
  }


  // ✅ File upload methods for modal
  triggerFileUpload(): void {
    console.log('📎 [Upload] Triggering file upload...');
    if (this.directFileInput && this.directFileInput.nativeElement) {
      console.log('✅ Using ViewChild reference');
      this.directFileInput.nativeElement.click();
      return;
    }
    const fileInput = document.getElementById('directFileInput') as HTMLInputElement;
    if (fileInput) {
      console.log('✅ Using getElementById fallback');
      fileInput.click();
      return;
    }
    // Absolute fallback: create a temporary input and trigger it
    try {
      console.warn('⚠️ Falling back to dynamic input creation');
      const tempInput = document.createElement('input');
      tempInput.type = 'file';
      tempInput.accept = 'image/*';
      (tempInput as any).multiple = true;
      tempInput.style.display = 'none';
      tempInput.addEventListener('change', (e) => this.onFileSelected(e));
      document.body.appendChild(tempInput);
      tempInput.click();
      // Clean up after a short delay
      setTimeout(() => {
        try { document.body.removeChild(tempInput); } catch {}
      }, 1000);
      return;
    } catch {
      console.error('❌ Could not find file input element');
    }
  }

  // Direct file selection handler with localization and auto-processing
  onFileSelected(event: any): void {
    if (!event?.target?.files || event.target.files.length === 0) {
      console.warn('No files selected');
      return;
    }

    const files = Array.from(event.target.files) as File[];

    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024;

      if (!isValidType) {
        this.addMessage({
          id: `error_${Date.now()}`,
          role: 'assistant',
          content: this.translate.instant('agent.autoProcessing.fileNotImage', { filename: file.name }),
          timestamp: new Date(),
          type: 'text'
        });
        return false;
      }

      if (!isValidSize) {
        this.addMessage({
          id: `error_${Date.now()}`,
          role: 'assistant',
          content: this.translate.instant('agent.autoProcessing.fileTooLarge', { filename: file.name }),
          timestamp: new Date(),
          type: 'text'
        });
        return false;
      }

      return true;
    });

    if (validFiles.length > 0) {
      this.processDocumentsDirectly(validFiles);
    }

    // Clear input
    try { event.target.value = ''; } catch {}
  }

  private async processDocumentsDirectly(files: File[]): Promise<void> {
    try {
      console.log('⚡ Processing documents automatically...');

      const fileNames = files.map(f => f.name).join(', ');
      this.addMessage({
        id: `upload_${Date.now()}`,
        role: 'user',
        content: `📤 ${this.translate.instant('agent.autoProcessing.uploadSuccess', { count: files.length })}: ${fileNames}`,
        timestamp: new Date(),
        type: 'text'
      });

      const progressMessage = this.addMessage({
        id: `progress_${Date.now()}`,
        role: 'assistant',
        content: `🤖 ${this.translate.instant('agent.autoProcessing.processing')}

⚡ ${this.translate.instant('agent.autoProcessing.detecting')}`,
        timestamp: new Date(),
        type: 'loading'
      });

      const extractedData = await Promise.race([
        this.agentService.uploadAndProcessDocuments(files),
        new Promise<ExtractedData>((_, reject) => setTimeout(() => reject(new Error('Processing timeout')), 60000))
      ]);

      // Remove loading message
      this.messages = this.messages.filter(m => m.id !== progressMessage.id);

      // ✅ Save to database first
      console.log('💾 [DB FLOW] Saving extracted data to database...');
      await this.saveToSessionStaging(extractedData, files);
      
      // ✅ Show modal with data from database
      await this.showUnifiedModalFromDatabase(extractedData);
      
    } catch (error: any) {
      console.error('❌ Auto-processing error:', error);
      
      // Remove loading message
      this.messages = this.messages.filter(m => m.type === 'loading');
      
      // ✅ Check if we have partial extracted data
      const extractedData = this.agentService.getExtractedData();
      const hasPartialData = extractedData && (
        extractedData.firstName || 
        extractedData.tax || 
        extractedData.country ||
        extractedData.city
      );
      
      // ✅ Calculate how many required fields were extracted
      const requiredFields = [
        'firstName', 'firstNameAR', 'tax', 'CustomerType', 
        'ownerName', 'buildingNumber', 'street', 'country', 
        'city', 'salesOrganization', 'distributionChannel', 'division'
      ];
      
      const extractedFieldsCount = requiredFields.filter(field => {
        const value = (extractedData as any)?.[field];
        return value && value.toString().trim() !== '';
      }).length;
      
      const extractionSuccessRate = extractedFieldsCount / requiredFields.length;
      
      console.log('🔍 [ERROR RECOVERY] Checking for partial data:', {
        hasPartialData,
        extractedFieldsCount,
        totalRequired: requiredFields.length,
        successRate: `${(extractionSuccessRate * 100).toFixed(1)}%`,
        extractedFields: hasPartialData ? Object.keys(extractedData).filter(k => (extractedData as any)[k]) : []
      });
      
      // ✅ If we extracted 8+ fields (66%+), consider it successful even if there was an error
      // This prevents showing internet error when OpenAI actually succeeded in extracting most data
      if (extractedFieldsCount >= 8) {
        console.log('✅ [ERROR RECOVERY] Extracted enough fields, treating as success');
        
        this.addMessage({
          id: `partial_success_${Date.now()}`,
          role: 'assistant',
          content: `✅ تم استخراج معظم البيانات بنجاح!\nMost data extracted successfully!\n\n📊 تم استخراج ${extractedFieldsCount} من ${requiredFields.length} حقل\nExtracted ${extractedFieldsCount} out of ${requiredFields.length} fields`,
          timestamp: new Date(),
          type: 'text'
        });
        
        // ✅ Continue with the modal as if it was successful
        await this.showUnifiedModalFromDatabase(extractedData);
        return;
      }
      
      // ✅ If less than 8 fields extracted, show error message
      // Check if it's a CORS or network error
      const isCorsOrNetworkError = 
        error?.status === 0 || 
        error?.message?.includes('CORS') ||
        error?.message?.includes('timeout') ||
        error?.message?.includes('Network') ||
        error?.name === 'HttpErrorResponse';
      
      let errorMessage = isCorsOrNetworkError
        ? `❌ حدث خطأ في التواصل مع نموذج الذكاء الاصطناعي\nAI communication error occurred\n\n🌐 يرجى التحقق من اتصال الإنترنت\nPlease check your internet connection`
        : `❌ فشلت معالجة المستندات\nDocument processing failed`;
      
      // ✅ If we have partial data, show it
      if (hasPartialData) {
        const extractedFields = Object.keys(extractedData)
          .filter(k => (extractedData as any)[k] && k !== 'contacts')
          .map(k => `• ${k}: ${(extractedData as any)[k]}`)
          .join('\n');
        
        errorMessage += `\n\n📋 بيانات جزئية تم استخراجها:\nPartial Data Extracted:\n${extractedFields}\n\n💡 الخيارات المتاحة:\nAvailable Options:`;
      }
      
      // ✅ Add error message with smart options (using 'text' instead of 'label' for buttons)
      const buttons = hasPartialData ? [
        {
          text: '🔄 إعادة المحاولة لاستخراج المزيد\n🔄 Try Again to Extract More',
          action: 'retry_upload',
          style: 'primary'
        },
        {
          text: '✅ المتابعة بالبيانات الجزئية\n✅ Continue with Partial Data',
          action: 'continue_with_partial_data',
          style: 'default'
        },
        {
          text: '❌ إلغاء\n❌ Cancel',
          action: 'cancel_upload',
          style: 'default'
        }
      ] : [
        {
          text: '🔄 إعادة المحاولة\n🔄 Try Again',
          action: 'retry_upload',
          style: 'primary'
        },
        {
          text: '❌ إلغاء\n❌ Cancel',
          action: 'cancel_upload',
          style: 'default'
        }
      ];
      
      this.addMessage({
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
        type: 'confirmation',
        data: {
          buttons,
          extractedData: hasPartialData ? extractedData : undefined,
          files
        }
      });
      
      // Store files for retry
      this.pendingRetryFiles = files;
    }
  }

  // ✅ NEW: Show modal with data loaded from database
  private async showUnifiedModalFromDatabase(extractedData: ExtractedData): Promise<void> {
    console.log('💾 [DB FLOW] Loading company data from database...');
    
    const companyId = this.generateCompanyId(extractedData);
    const sessionId = this.sessionStaging['sessionId']; // Get session ID from service
    
    console.log('💾 [DB FLOW] Loading company:', companyId);
    
    try {
      // ✅ Load company data from database
      const companyData = await this.sessionStaging.getCompany(companyId);
      
      console.log('✅ [DB FLOW] Company data loaded:', companyData);
      console.log('📄 [DB FLOW] Documents from DB:', companyData.documents?.length || 0);
      
      // ✅ Convert base64 documents back to File objects for display
      const documentsFromDB = companyData.documents || [];
      const fileObjects: File[] = [];
      
      for (const doc of documentsFromDB) {
        // Convert base64 to File object
        const base64Data = doc.document_content.split(',')[1] || doc.document_content;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: doc.document_type });
        const file = new File([blob], doc.document_name, { type: doc.document_type });
        fileObjects.push(file);
      }
      
      console.log('✅ [DB FLOW] Converted documents to File objects:', fileObjects.length);
      
      // ✅ Update current company ID
      this.currentCompanyId = companyId;
      
      // ✅ Store documents in unifiedModalData for getDocumentsList()
      this.unifiedModalData.documents = documentsFromDB.map((doc: any, index: number) => ({
        value: {
          id: `db-doc-${index}`,
          name: doc.document_name,
          type: this.getDocumentType({ type: doc.document_type || '' }),
          mime: doc.document_type,
          size: doc.document_size || 0,
          uploadedAt: doc.created_at || new Date().toISOString(),
          contentBase64: doc.document_content || ''
        }
      }));
      
      console.log('✅ [DB FLOW] Documents stored in unifiedModalData:', this.unifiedModalData.documents.length);
      
      // ✅ Build extracted data object from database
      const extractedDataFromDB = {
        firstName: companyData.first_name || '',
        firstNameAR: companyData.first_name_ar || '',
        tax: companyData.tax_number || '',
        CustomerType: companyData.customer_type || '',
        ownerName: companyData.company_owner || '',
        CompanyOwner: companyData.company_owner || '',
        buildingNumber: companyData.building_number || '',
        street: companyData.street || '',
        country: companyData.country || '',
        city: companyData.city || '',
        salesOrganization: companyData.sales_org || '',
        distributionChannel: companyData.distribution_channel || '',
        division: companyData.division || '',
        registrationNumber: companyData.registration_number || '',
        legalForm: companyData.legal_form || '',
        contacts: companyData.contacts || []
      };
      
      console.log('📊 [DB FLOW] Built extracted data from DB:', extractedDataFromDB);
      
      // ✅ Auto-translate Arabic name if missing
      if (extractedDataFromDB.firstName && !extractedDataFromDB.firstNameAR) {
        console.log('🔤 [AUTO-TRANSLATE] Translating company name to Arabic...');
        const arabicName = this.autoTranslate.translateCompanyName(extractedDataFromDB.firstName);
        if (arabicName && arabicName !== extractedDataFromDB.firstName) {
          extractedDataFromDB.firstNameAR = arabicName; // ✅ Update the object for missing fields check
          console.log('✅ [AUTO-TRANSLATE] Company name translated:', { 
            english: extractedDataFromDB.firstName, 
            arabic: arabicName 
          });
        }
      }
      
      // ✅ Smart detection of CustomerType if missing
      if (!extractedDataFromDB.CustomerType && extractedDataFromDB.legalForm) {
        const detectedType = this.detectCustomerType(extractedDataFromDB.legalForm, extractedDataFromDB.firstName);
        if (detectedType) {
          extractedDataFromDB.CustomerType = detectedType; // ✅ Update the object for missing fields check
          console.log('✅ [SMART-DETECT] Customer type detected:', detectedType);
        }
      }
      
      // ✅ NEW SIMPLE LOGIC: Calculate extracted and missing fields
      const allFields = [
        'firstName', 'firstNameAR', 'tax', 'CustomerType', 'ownerName',
        'buildingNumber', 'street', 'country', 'city', 'salesOrganization',
        'distributionChannel', 'division', 'registrationNumber', 'legalForm'
      ];
      
      // Count all extracted fields (including sales data)
      const extractedFields = allFields.filter(field => {
        const value = (extractedDataFromDB as any)[field];
        return value && value !== '';
      });
      
      console.log(`📊 [SIMPLE LOGIC] Total extracted fields: ${extractedFields.length}`);
      
      // Use simple logic for missing fields (core fields only)
      const missingFields = this.checkMissingFields(extractedDataFromDB);
      
      console.log(`📊 [SIMPLE LOGIC] Missing fields count: ${missingFields.length}`);
      
      // ✅ Update unifiedModalData with extracted/missing fields
      this.unifiedModalData.extractedFields = extractedFields.map(f => ({ field: f, value: (extractedDataFromDB as any)[f] }));
      this.unifiedModalData.missingFields = missingFields;
      this.unifiedModalData.contacts = companyData.contacts || [];
      
      // ✅ Fill form with extracted data (use extractedDataFromDB which has correct field names)
      console.log('📝 [DB FLOW] Patching form with extracted data:', extractedDataFromDB);
      this.unifiedModalForm.patchValue({
        firstName: extractedDataFromDB.firstName || '',
        firstNameAR: extractedDataFromDB.firstNameAR || '',  // ✅ Fixed: AR not Ar
        tax: extractedDataFromDB.tax || '',
        CustomerType: extractedDataFromDB.CustomerType || '',
        ownerName: extractedDataFromDB.ownerName || extractedDataFromDB.CompanyOwner || '',  // ✅ Fixed: ownerName not CompanyOwner
        buildingNumber: extractedDataFromDB.buildingNumber || '',
        street: extractedDataFromDB.street || '',
        country: extractedDataFromDB.country || '',
        city: extractedDataFromDB.city || '',
        salesOrganization: extractedDataFromDB.salesOrganization || '',  // ✅ Fixed: salesOrganization not SalesOrgOption
        distributionChannel: extractedDataFromDB.distributionChannel || '',  // ✅ Fixed: distributionChannel not DistributionChannelOption
        division: extractedDataFromDB.division || ''  // ✅ Fixed: division not DivisionOption
      });
      
      console.log('✅ [DB FLOW] Form patched. Current form value:', this.unifiedModalForm.value);
      
      // ✅ Update dropdown options based on country
      if (extractedDataFromDB.country) {
        console.log('🌍 [DB FLOW] Updating city options for country:', extractedDataFromDB.country);
        this.updateCityOptions(extractedDataFromDB.country);
      }
      
      // ✅ Auto-translate company name to Arabic if missing
      if (extractedDataFromDB.firstName && !extractedDataFromDB.firstNameAR) {
        console.log('🔤 [AUTO-TRANSLATE] Translating company name to Arabic...');
        const arabicName = this.autoTranslate.translateCompanyName(extractedDataFromDB.firstName);
        if (arabicName && arabicName !== extractedDataFromDB.firstName) {
          this.unifiedModalForm.patchValue({ firstNameAR: arabicName }, { emitEvent: false });
          console.log('✅ [AUTO-TRANSLATE] Company name translated:', { 
            english: extractedDataFromDB.firstName, 
            arabic: arabicName 
          });
        }
      }
      
      // ✅ Smart detection of CustomerType if missing
      if (!extractedDataFromDB.CustomerType && extractedDataFromDB.legalForm) {
        const detectedType = this.detectCustomerType(extractedDataFromDB.legalForm, extractedDataFromDB.firstName);
        if (detectedType) {
          this.unifiedModalForm.patchValue({ CustomerType: detectedType }, { emitEvent: false });
          console.log('✅ [SMART-DETECT] Customer type detected:', detectedType);
        }
      }
      
      // ✅ Set fields as read-only (extracted data should be locked)
      this.extractedDataReadOnly = true;
      
      // ✅ Show modal
      this.showUnifiedModal = true;
      this.cdr.detectChanges();
      
      console.log('✅ [DB FLOW] Modal shown with database data');
      console.log('📄 [DB FLOW] Final documents count:', this.unifiedModalData.documents.length);
      
    } catch (error) {
      console.error('❌ [DB FLOW] Error loading from database:', error);
      // Show error message to user
      this.addMessage({
        id: `db_error_${Date.now()}`,
        role: 'assistant',
        content: `❌ Error loading company data from database. Please try again.`,
        timestamp: new Date(),
        type: 'text'
      });
    }
  }

  private async animateProgressBar(): Promise<void> {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        this.progressValue += Math.random() * 15;
        if (this.progressValue >= 100) {
          this.progressValue = 100;
          this.progressStatus = 'Data processing complete!';
          clearInterval(interval);
          setTimeout(resolve, 500);
        } else {
          this.progressStatus = `Processing... ${Math.floor(this.progressValue)}%`;
        }
        this.cdr.detectChanges();
      }, 200);
    });
  }

  private showCompanyChoiceDialog(extractedData: ExtractedData, newFiles?: File[]): void {
    const currentCompanyName = this.unifiedModalForm?.get('firstName')?.value || 'Unknown';
    const currentCountry = this.unifiedModalForm?.get('country')?.value || 'Unknown';
    const newCompanyName = extractedData?.firstName || 'Unknown';
    const newCountry = extractedData?.country || 'Unknown';
    
    console.log('🔔 [NEW FLOW] Preparing choice dialog:', {
      currentCompany: currentCompanyName,
      currentCountry: currentCountry,
      newCompany: newCompanyName,
      newCountry: newCountry,
      newFilesCount: newFiles?.length || 0
    });
    
    // Add message to chat about different companies
    this.addMessage({
      id: `different_company_${Date.now()}`,
      role: 'assistant',
      content: `⚠️ Different Companies Detected!\n\n` +
               `📍 Current Company: **${currentCompanyName}** (${currentCountry})\n` +
               `📄 New Document Company: **${newCompanyName}** (${newCountry})\n\n` +
               `Which company would you like to continue with?`,
      timestamp: new Date(),
      type: 'confirmation',
      data: {
        buttons: [
          { 
            text: `✅ ${this.translate.instant('agent.buttons.keepCurrent')} (${currentCompanyName})`, 
            action: 'keep_current_company',
            data: { extractedData, newFiles }
          },
          { 
            text: `🔄 ${this.translate.instant('agent.buttons.switchToNew')} (${newCompanyName})`, 
            action: 'switch_to_new_company',
            data: { extractedData, newFiles }  // ✅ الآن بيبعت الاتنين
          },
          { 
            text: `📄 ${this.translate.instant('agent.buttons.ignoreDifference')}`, 
            action: 'continue_both_companies',
            data: { extractedData, newFiles }
          }
        ]
      }
    });
  }

  private clearUnifiedFormData(): void {
    console.log('🧹 [NEW FLOW] Clearing unified form data');
    
    // Reset all form fields
    this.unifiedModalForm.reset({
      firstName: '',
      firstNameAr: '',
      tax: '',
      CustomerType: '',
      CompanyOwner: '',
      buildingNumber: '',
      street: '',
      country: '',
      city: '',
      SalesOrgOption: '',
      DistributionChannelOption: '',
      DivisionOption: ''
    });
    
    // Clear contacts completely
    const contactsArray = this.unifiedModalForm.get('contacts') as FormArray;
    while (contactsArray.length !== 0) {
      contactsArray.removeAt(0);
    }
    
    // ✅ Clear service documents (for extraction cache only)
    console.log('🗑️ [NEW FLOW] Clearing service extraction cache');
    this.agentService.clearAllDocuments();
    
    // ✅ Clear current company ID (database reference)
    this.currentCompanyId = null;
    
    // ✅ Clear background governance data
    this.currentCompanyDocuments = null;
    // Note: Keep allCompaniesDocuments for audit trail
    
    // Clear extracted data completely
    this.unifiedModalData = {
      extractedFields: [],
      missingFields: [],
      contacts: [],
      documents: []
    };
    
    // Clear current demo company
    this.currentDemoCompany = null;
    
    // Force UI update
    this.cdr.detectChanges();
    
    console.log('✅ [NEW FLOW] Form data cleared successfully');
    console.log('📄 [NEW FLOW] Current company cleared - now using database only');
  }

  private async handleDocumentAddition(newFiles: File[]): Promise<void> {
    console.log('📄 [NEW FLOW] Handling document addition with:', newFiles.map(f => f.name));
    
    try {
      // Add processing message to chat (like when starting conversation)
      const fileNames = newFiles.map(f => f.name).join(', ');
      this.addMessage({
        id: `upload_${Date.now()}`,
        role: 'user',
        content: `📤 Uploaded ${newFiles.length} document(s): ${fileNames}`,
        timestamp: new Date(),
        type: 'text'
      });

      // ✅ Show progress bar and animation
      console.log('📊 [PROGRESS] Showing progress bar for document addition');
      this.showProgressBar = true;
      this.progressValue = 0;
      this.progressStatus = 'Processing documents with AI...';
      this.cdr.detectChanges();
      console.log('📊 [PROGRESS] Progress bar state:', { showProgressBar: this.showProgressBar, progressValue: this.progressValue });

      // ✅ Animate progress bar
      console.log('📊 [PROGRESS] Starting progress bar animation');
      await this.animateProgressBar();
      console.log('📊 [PROGRESS] Progress bar animation completed');
      
      // Process new documents with OCR (FULL mode - extract fresh data from new documents)
      // Get existing form data to pass to extraction
      const existingFormData = this.unifiedModalForm?.value ? {
        firstName: this.unifiedModalForm.value.firstName || '',
        firstNameAR: this.unifiedModalForm.value.firstNameAR || '',
        tax: this.unifiedModalForm.value.tax || '',
        CustomerType: this.unifiedModalForm.value.CustomerType || '',
        ownerName: this.unifiedModalForm.value.ownerName || '',
        buildingNumber: this.unifiedModalForm.value.buildingNumber || '',
        street: this.unifiedModalForm.value.street || '',
        country: this.unifiedModalForm.value.country || '',
        city: this.unifiedModalForm.value.city || '',
        salesOrganization: this.unifiedModalForm.value.salesOrganization || '',
        distributionChannel: this.unifiedModalForm.value.distributionChannel || '',
        division: this.unifiedModalForm.value.division || ''
      } : undefined;
      
      console.log('📋 [NEW FLOW] Existing form data for extraction:', existingFormData);
      
      // Set existing data in service
      if (existingFormData) {
        this.agentService['extractedData'] = existingFormData as any;
      }
      
      const extractedData = await this.agentService.uploadAndProcessDocuments(newFiles, undefined, false); // ✅ FULL mode for new documents
      console.log('🔍 [NEW FLOW] New documents processed (FULL MODE), extracted data:', extractedData);
      
      // ✅ Hide progress bar
      this.showProgressBar = false;
      this.cdr.detectChanges();
      
      // ✅ Save to database
      console.log('💾 [DB FLOW] Saving added documents to database...');
      await this.saveToSessionStaging(extractedData, newFiles);
      
      // ✅ Reload modal from database to show updated documents
      console.log('🔄 [DB FLOW] Reloading modal from database...');
      await this.showUnifiedModalFromDatabase(extractedData);
      
    } catch (error: any) {
      console.error('❌ [NEW FLOW] Document addition error:', error);
      
      // ✅ Hide progress bar on error
      this.showProgressBar = false;
      this.cdr.detectChanges();
      
      // ✅ Check if we have partial extracted data from the new documents
      const extractedData = this.agentService.getExtractedData();
      const requiredFields = [
        'firstName', 'firstNameAR', 'tax', 'CustomerType', 
        'ownerName', 'buildingNumber', 'street', 'country', 
        'city', 'salesOrganization', 'distributionChannel', 'division'
      ];
      
      const extractedFieldsCount = requiredFields.filter(field => {
        const value = (extractedData as any)?.[field];
        return value && value.toString().trim() !== '';
      }).length;
      
      console.log('🔍 [NEW FLOW ERROR RECOVERY] Extracted fields count:', extractedFieldsCount);
      
      // ✅ If we extracted 8+ fields (66%+), consider it successful even if there was an error
      if (extractedFieldsCount >= 8) {
        console.log('✅ [NEW FLOW ERROR RECOVERY] Extracted enough fields, treating as success');
        
        this.addMessage({
          id: `addition_partial_success_${Date.now()}`,
          role: 'assistant',
          content: `✅ تم استخراج معظم البيانات بنجاح!\nMost data extracted successfully!\n\n📊 تم استخراج ${extractedFieldsCount} من ${requiredFields.length} حقل\nExtracted ${extractedFieldsCount} out of ${requiredFields.length} fields`,
          timestamp: new Date(),
          type: 'text'
        });
        
        // Save and reload modal
        await this.saveToSessionStaging(extractedData, newFiles);
        await this.showUnifiedModalFromDatabase(extractedData);
        return;
      }
      
      // ✅ If less than 8 fields extracted, show error message
      // Check if it's a CORS or network error
      const isCorsOrNetworkError = 
        error?.status === 0 || 
        error?.message?.includes('CORS') ||
        error?.message?.includes('timeout') ||
        error?.message?.includes('Network') ||
        error?.name === 'HttpErrorResponse';
      
      const errorMessage = isCorsOrNetworkError
        ? `❌ حدث خطأ في التواصل مع نموذج الذكاء الاصطناعي\nAI communication error occurred\n\n🌐 يرجى التحقق من اتصال الإنترنت\nPlease check your internet connection\n\n💡 يرجى المحاولة مرة أخرى\nPlease try again later`
        : `❌ فشلت إعادة معالجة المستندات. يرجى المحاولة مرة أخرى.\nReprocessing failed. Please try again.`;
      
      this.addMessage({
        id: `addition_error_${Date.now()}`,
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
        type: 'text'
      });
    }
  }

  onModalFileSelected(event: any): void {
    const files: FileList = event?.target?.files;
    console.log('🧪 [MODAL] Files selected:', files?.length ?? 0);
    if (!files || files.length === 0) return;

    // Add files to pending files
    for (let i = 0; i < files.length; i++) {
      this.pendingFiles.push(files[i]);
    }
    
    // Initialize document form with the selected files
    this.initializeDocumentForm();
    
    console.log('✅ [MODAL] Files added to pending:', this.pendingFiles.length);
    
    // Process new documents with OCR and merge data
    const newFiles = Array.from(files) as File[];
    this.processNewDocumentsInModal(newFiles);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        this.pendingFiles.push(files[i]);
      }
      this.initializeDocumentForm();
    }
  }

  removePendingFile(index: number): void {
    this.pendingFiles.splice(index, 1);
    if (this.pendingFiles.length === 0) {
      this.documentMetadataForm.reset();
    }
  }

  private openDocumentModalWithService(): void {
    // Close any existing modal
    if (this.modalInstance) {
      this.modalInstance.destroy();
    }

    this.modalInstance = this.modalService.create({
      nzTitle: this.translate.instant('agent.documentModal.title'),
      nzContent: this.documentModalTemplate,
      nzWidth: '800px',
      nzFooter: null,
      nzOnCancel: () => {
        this.closeDocumentModal();
      }
    });

    // Handle modal close
    this.modalInstance.afterClose.subscribe(() => {
      this.modalInstance = null;
    });

    // Use requestIdleCallback for better performance
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.debugModalLayoutCheck('openDocumentModalWithService');
      });
    } else {
      // Fallback: use microtask for immediate execution without blocking
      Promise.resolve().then(() => {
        this.debugModalLayoutCheck('openDocumentModalWithService');
      });
    }
  }

  private initializeDocumentForm(): void {
    console.log('🧪 [Chat] initializeDocumentForm() start. pendingFiles =', this.pendingFiles.map(f => f.name));
    
    // Clear existing form
    this.documentMetadataForm = this.fb.group({
      documents: this.fb.array([])
    });

    const documentsArray = this.documentMetadataForm.get('documents') as FormArray;
    
    // Clear any existing form controls
    while (documentsArray.length !== 0) {
      documentsArray.removeAt(0);
    }
    
    this.pendingFiles.forEach(file => {
      const detectedInfo = this.detectDocumentInfo(file.name);
      console.log('🧪 [Chat] detected info for', file.name, '=', detectedInfo);
      
      // Get country from extracted data if not detected from filename
      let country = detectedInfo?.country || '';
      if (!country && this.unifiedModalForm) {
        country = this.unifiedModalForm.get('country')?.value || 'Saudi Arabia'; // Default fallback
        console.log(`🧪 [Chat] Using country from form/extracted data: ${country}`);
      }
      
      const documentGroup = this.fb.group({
        name: [file.name],
        country: [country, Validators.required],
        type: [detectedInfo?.type || '', Validators.required],
        description: [this.generateSmartDescription(file.name, detectedInfo)]
    });
      
      documentsArray.push(documentGroup);
    });
    
    console.log('🧪 [Chat] documentsFA length =', documentsArray.length);
    console.log('🧪 [Chat] documentMetadataForm valid =', this.documentMetadataForm.valid);
    
    // Force change detection to ensure form is updated
    this.cdr.markForCheck();
  }

  private detectDocumentInfo(filename: string): { country?: string; type?: string } | null {
    const lowerName = filename.toLowerCase();
    
    let country = '';
    let type = '';
    
    // Detect country
    if (lowerName.includes('egypt') || lowerName.includes('مصر')) country = 'Egypt';
    else if (lowerName.includes('saudi') || lowerName.includes('سعود')) country = 'Saudi Arabia';
    else if (lowerName.includes('uae') || lowerName.includes('إمارات')) country = 'United Arab Emirates';
    else if (lowerName.includes('yemen') || lowerName.includes('يمن')) country = 'Yemen';
    
    // Detect document type
    if (lowerName.includes('commercial') || lowerName.includes('تجاري')) type = 'Commercial Registration';
    else if (lowerName.includes('tax') || lowerName.includes('ضريب')) type = 'Tax Card';
    else if (lowerName.includes('license') || lowerName.includes('رخصة')) type = 'Business License';
    
    return (country || type) ? { country, type } : null;
  }

  private generateSmartDescription(filename: string, detectedInfo: any): string {
    let description = `Document: ${filename}`;
    if (detectedInfo?.country) description += ` (${detectedInfo.country})`;
    if (detectedInfo?.type) description += ` - ${detectedInfo.type}`;
    return description;
  }

  

  private async processDocumentsWithMetadata(files: File[], metadata: Array<{ country?: string; type: string; description: string }>): Promise<void> {
    try {
      console.log('🧪 [Chat] processDocumentsWithMetadata start. files =', files.map(f => f.name), ' metadata count =', metadata.length);
      // User message
      const fileNames = files.map(f => f.name).join(', ');
      this.addMessage({
        id: `upload_${Date.now()}`,
        role: 'user',
        content: this.translate.instant('agent.messages.filesUploaded', { count: files.length, files: fileNames }),
        timestamp: new Date(),
        type: 'text'
      });

      // Progress message
      const progressMessage = this.addMessage({
        id: `progress_${Date.now()}`,
        role: 'assistant',
        content: this.translate.instant('agent.processingDocuments'),
        timestamp: new Date(),
        type: 'loading'
      });

      // Process with timeout
      const extractedData = await Promise.race([
        this.agentService.uploadAndProcessDocuments(files, metadata),
        new Promise<ExtractedData>((_, reject) => 
          setTimeout(() => reject(new Error('Processing timeout')), 60000)
        )
      ]);
      console.log('🧪 [Chat] processDocumentsWithMetadata success. Extracted keys =', Object.keys(extractedData || {}));

      // Remove progress
      this.messages = this.messages.filter(m => m.id !== progressMessage.id);

      // Display results and wait for user review
      this.displayExtractedDataWithLabels(extractedData);

      // Set flag to wait for user confirmation
      this.awaitingDataReview = true;

    } catch (error: any) {
      console.error('❌ [Chat] processDocumentsWithMetadata error:', error);
      this.messages = this.messages.filter(m => m.type === 'loading');
      
      this.addMessage({
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: this.translate.instant('agent.errors.uploadError', { error: error.message }),
        timestamp: new Date(),
        type: 'text'
      });
    }
  }

  private displayExtractedDataWithLabels(data: ExtractedData): void {
    // Structured review component message
    const fields = [
      { key: 'firstName', label: 'Company Name' },
      // Skip Arabic name field to avoid RTL display issues
      { key: 'tax', label: 'Tax Number' },
      { key: 'CustomerType', label: 'Customer Type' },
      { key: 'ownerName', label: 'Owner Name' },
      { key: 'buildingNumber', label: 'Building' },
      { key: 'street', label: 'Street' },
      { key: 'country', label: 'Country' },
      { key: 'city', label: 'City' },
      { key: 'salesOrganization', label: 'Sales Org' },
      { key: 'distributionChannel', label: 'Distribution' },
      { key: 'division', label: 'Division' }
    ];

    this.addMessage({
      id: `review_${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      type: 'confirmation',
      data: {
        component: 'review',
        extractedData: data,
        fields,
        buttons: [
          { 
            text: this.translate.instant('agent.buttons.reviewAndComplete'), 
            action: 'open_unified_modal',
            class: 'modern-btn btn-primary'
          }
        ]
      }
    });
    
    this.awaitingDataReview = true;
  }

  // Legacy generator kept for fallback; not used with component rendering.
  private generateConfirmationMessage(_extractedData: any): string { return ''; }

  private checkMissingFields(data: ExtractedData): string[] {
    // ✅ NEW SIMPLE LOGIC: Core required fields only (7 fields - firstName and firstNameAR are optional)
    const coreRequiredFields = [
      'tax', 'CustomerType', 'ownerName',
      'buildingNumber', 'street', 'country', 'city'
    ];
    
    // Count how many core fields are actually filled
    const filledCoreFields = coreRequiredFields.filter(field => {
      const value = (data as any)[field];
      return value && (typeof value === 'string' ? value.trim() !== '' : true);
    });
    
    console.log(`🔍 [SIMPLE LOGIC] Core fields: ${coreRequiredFields.length} required, ${filledCoreFields.length} filled`);
    
    // If all 7 core fields are filled, no missing data
    if (filledCoreFields.length >= 7) {
      console.log('✅ [SIMPLE LOGIC] All core fields filled - no missing data');
      return [];
    }
    
    // If not all filled, return the missing ones
    const missingFields = coreRequiredFields.filter(field => {
      const value = (data as any)[field];
      return !value || (typeof value === 'string' && value.trim() === '');
    });
    
    console.log(`⚠️ [SIMPLE LOGIC] Missing ${missingFields.length} core fields:`, missingFields);
    return missingFields;
  }


  private askForMissingField(field: string): void {
    // Prevent infinite loops
    if (!this.fieldAttempts[field]) {
      this.fieldAttempts[field] = 0;
    }
    
    this.fieldAttempts[field]++;
    
    if (this.fieldAttempts[field] > this.maxFieldAttempts) {
      console.error(`Max attempts for field: ${field}`);
      this.skipToNextField(field);
      return;
    }

    this.currentMissingField = field;
    const fieldLabel = this.agentService.getFieldLabel(field);
    
    if (this.isDropdownField(field)) {
      this.askForDropdownSelection(field, fieldLabel);
    } else if (field === 'contacts') {
      // Skip contacts - optional
      this.skipToNextField(field);
    } else {
      this.askForTextInput(field, fieldLabel);
    }
  }

  private isDropdownField(field: string): boolean {
    return ['CustomerType', 'country', 'city', 'salesOrganization', 
            'distributionChannel', 'division'].includes(field);
  }

  private askForDropdownSelection(field: string, fieldLabel: string): void {
    const options = this.agentService.getDropdownOptions(field);
    
    if (options.length === 0) {
      this.askForTextInput(field, fieldLabel);
      return;
    }

    // Simple message without listing all options
    const content = this.t(`📋 ${fieldLabel}\nاختر من القائمة:`, `📋 ${fieldLabel}\nSelect from list:`);

    this.addMessage({
      id: `dropdown_${field}_${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: new Date(),
      type: 'dropdown',
      data: {
        field,
        options,
        fieldLabel
      }
    });
  }

  private askForTextInput(field: string, fieldLabel: string): void {
    const examples: any = {
      'ownerName': 'مثال / Example: محمد أحمد علي',
      'buildingNumber': 'مثال / Example: 123',
      'street': 'مثال / Example: شارع الملك فهد'
    };

    const example = examples[field] || '';
    
    this.addMessage({
      id: `text_${field}_${Date.now()}`,
      role: 'assistant',
      content: this.translate.instant('agent.messages.enterValue', { fieldLabel, example }),
      timestamp: new Date(),
      type: 'text'
    });
  }

  onDropdownSelection(field: string, selected: any): void {
    console.log('🧪 [Chat] onDropdownSelection called:', { field, selected });
    
    const value = selected && selected.value !== undefined ? selected.value : selected;
    console.log('🧪 [Chat] Extracted value:', value);
    
    this.agentService.updateExtractedDataField(field, value);
    console.log('🧪 [Chat] Field updated in service');
    
    this.addMessage({
      id: `dropdown_selected_${Date.now()}`,
      role: 'assistant',
      content: this.translate.instant('agent.messages.selected', { value: selected?.label || value }),
      timestamp: new Date(),
      type: 'text'
    });
    console.log('🧪 [Chat] Confirmation message added');
    
    // Move to next field
    const extractedData = this.agentService.getExtractedData();
    console.log('🧪 [Chat] Current extracted data:', extractedData);
    
    const missingFields = this.checkMissingFields(extractedData);
    console.log('🧪 [Chat] Missing fields after selection:', missingFields);
    
    if (missingFields.length > 0) {
      console.log('🧪 [Chat] Moving to next field:', missingFields[0]);
      // Use microtask for better performance
      Promise.resolve().then(() => this.askForMissingField(missingFields[0]));
    } else {
      console.log('🧪 [Chat] All fields complete, showing confirmation');
      this.confirmDataBeforeSubmission();
    }
  }

  private askForContactForm(): void {
    console.log('👥 [CONTACT] askForContactForm called');
    console.log('👥 [CONTACT] contactForm exists:', !!this.contactForm);
    
    // ✅ Check if form exists
    if (!this.contactForm) {
      console.error('❌ [CONTACT] contactForm is undefined! Reinitializing...');
      this.initializeForms();
    }
    
    this.showContactForm = true;
    this.cdr.detectChanges();
    
    console.log('✅ [CONTACT] Contact form opened. showContactForm =', this.showContactForm);
    
    this.addMessage({
      id: `contact_${Date.now()}`,
      role: 'assistant',
      content: this.translate.instant('agent.messages.addContactInstruction'),
      timestamp: new Date(),
      type: 'contact-form'
    });
  }

  // Exposed method for template button
  openContactForm(): void {
    console.log('👥 [CONTACT] Opening contact form');
    console.log('👥 [CONTACT] contactForm exists:', !!this.contactForm);
    console.log('👥 [CONTACT] contactForm value:', this.contactForm?.value);
    
    // ✅ Check if form exists
    if (!this.contactForm) {
      console.error('❌ [CONTACT] contactForm is undefined! Reinitializing...');
      this.initializeForms();
    }
    
    this.showContactForm = true;
    this.cdr.detectChanges();
    
    console.log('✅ [CONTACT] Contact form opened. showContactForm =', this.showContactForm);
    this.contactForm.reset({ preferredLanguage: 'Arabic' });
  }

  saveContactForm(): void {
    if (this.contactForm.valid) {
      const contact = this.contactForm.value;
      this.contactsAdded.push(contact);
      
      // CRITICAL: Update extracted data
      const currentData = this.agentService.getExtractedData();
      if (!currentData.contacts) {
        (currentData as any).contacts = [];
      }
      (currentData as any).contacts.push({
        name: contact.name,
        nameAr: contact.nameAr || '',
        jobTitle: contact.jobTitle,
        email: contact.email,
        mobile: contact.mobile,
        landline: contact.landline || '',
        preferredLanguage: contact.preferredLanguage || 'Arabic'
      });
      console.log('✅ [CONTACT] Contact added to extracted data:', contact);
      console.log('✅ [CONTACT] Total contacts:', (currentData as any).contacts.length);
      
      this.addMessage({
        id: `contact_saved_${Date.now()}`,
        role: 'assistant',
        content: this.translate.instant('agent.messages.contactAdded', { name: contact.name }),
        timestamp: new Date(),
        type: 'confirmation',
        data: {
          buttons: [
            { text: this.translate.instant('agent.buttons.yes'), action: 'add_another_contact' },
            { text: this.translate.instant('agent.buttons.continueAfterContact'), action: 'continue_after_contact' }
          ]
        }
      });
      
      this.contactForm.reset({ preferredLanguage: 'Arabic' });
      this.showContactForm = false;
    }
  }

  private skipToNextField(currentField: string): void {
    const extractedData = this.agentService.getExtractedData();
    const missingFields = this.checkMissingFields(extractedData);
    const nextIndex = missingFields.indexOf(currentField) + 1;
    
    if (nextIndex < missingFields.length) {
      this.askForMissingField(missingFields[nextIndex]);
    } else {
      this.confirmDataBeforeSubmission();
    }
  }

  private confirmDataBeforeSubmission(): void {
    this.addMessage({
      id: `confirm_${Date.now()}`,
      role: 'assistant',
      content: this.t(
        '✅ جميع البيانات مكتملة!\nسيتم الآن التحقق من عدم وجود تكرار ثم إرسال الطلب.\nهل تريد المتابعة؟',
        '✅ All data complete!\nWill now check for duplicates then submit the request.\nDo you want to proceed?'
      ),
      timestamp: new Date(),
      type: 'confirmation',
      data: {
        buttons: [
          { text: this.t('✅ نعم، أرسل', '✅ Yes, submit'), action: 'submit_request' },
          { text: this.t('✏️ مراجعة البيانات', '✏️ Review data'), action: 'review_data' }
        ]
      }
    });
  }

  async sendMessage(message?: string): Promise<void> {
    const userMessage = message || this.newMessage.trim();
    if (!userMessage) return;

    // Auto-detect language from user input (no flow change)
    try {
      const detected = this.detectUserLanguage(userMessage);
      if (detected && detected !== this.currentLang) {
        this.setLang(detected);
      }
    } catch {}

    // Add user message
    this.addMessage({
      id: `user_${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
      type: 'text'
    });

    this.newMessage = '';
    this.loading = true;

    try {
      // First, check if user wants to review/modify data (intelligent intent detection)
      const intent = await this.detectModalIntent(userMessage);
      
      if (intent.action === 'open_modal_review') {
        console.log('🎯 [INTENT] User wants to review data - opening modal');
        this.extractedDataReadOnly = true;
        this.showUnifiedModal = true;
        this.cdr.detectChanges();
        
        this.addMessage({
          id: `modal_opened_${Date.now()}`,
          role: 'assistant',
          content: this.t('✅ تم فتح نموذج المراجعة', '✅ Review form opened'),
          timestamp: new Date(),
          type: 'text'
        });
        return;
      } else if (intent.action === 'open_modal_edit') {
        console.log('🎯 [INTENT] User wants to edit data - opening modal in edit mode');
        this.extractedDataReadOnly = false;
        this.showUnifiedModal = true;
        this.cdr.detectChanges();
        
        this.addMessage({
          id: `modal_opened_${Date.now()}`,
          role: 'assistant',
          content: this.t('✅ تم فتح نموذج التعديل', '✅ Edit form opened'),
          timestamp: new Date(),
          type: 'text'
        });
        return;
      }
      
      // Handle field responses
      if (this.currentMissingField) {
        await this.handleFieldResponse(userMessage);
      } else if (this.awaitingDataReview) {
        await this.handleDataReviewResponse(userMessage);
      } else if (this.awaitingConfirmation) {
        await this.handleConfirmationResponse(userMessage);
      } else {
        await this.handleGeneralMessage(userMessage);
      }
    } catch (error: any) {
      this.addMessage({
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: this.t('❌ حدث خطأ', '❌ An error occurred'),
        timestamp: new Date(),
        type: 'text'
      });
    } finally {
      this.loading = false;
    }
  }

  private async handleFieldResponse(userMessage: string): Promise<void> {
    const field = this.currentMissingField!;
    
    // Handle dropdown selection
    if (this.isDropdownField(field)) {
      const options = this.agentService.getDropdownOptions(field);
      
      // Check if user typed a number
      const numberSelection = parseInt(userMessage);
      if (!isNaN(numberSelection) && numberSelection > 0 && numberSelection <= options.length) {
        const selected = options[numberSelection - 1];
        this.agentService.updateExtractedDataField(field, selected.value);
        
        this.addMessage({
          id: `confirmed_${Date.now()}`,
          role: 'assistant',
          content: this.t(`✅ تم اختيار: ${selected.label}`, `✅ Selected: ${selected.label}`),
          timestamp: new Date(),
          type: 'text'
        });
      } else {
        // Try to match text
        const matched = options.find(opt => 
          opt.label.toLowerCase().includes(userMessage.toLowerCase())
        );
        
        if (matched) {
          this.agentService.updateExtractedDataField(field, matched.value);
          
          this.addMessage({
            id: `confirmed_${Date.now()}`,
            role: 'assistant',
            content: this.t(`✅ تم اختيار: ${matched.label}`, `✅ Selected: ${matched.label}`),
            timestamp: new Date(),
            type: 'text'
          });
        } else {
          // Ask again
          this.askForMissingField(field);
          return;
        }
      }
    } else {
      // Text field
      this.agentService.updateExtractedDataField(field, userMessage);
      
      this.addMessage({
        id: `confirmed_${Date.now()}`,
        role: 'assistant',
        content: this.t(`✅ تم حفظ: ${userMessage}`, `✅ Saved: ${userMessage}`),
        timestamp: new Date(),
        type: 'text'
      });
    }

    // Reset attempts
    this.fieldAttempts[field] = 0;
    this.currentMissingField = null;

    // Check for next missing field
    const extractedData = this.agentService.getExtractedData();
    const missingFields = this.checkMissingFields(extractedData);
    
    if (missingFields.length > 0) {
      setTimeout(() => {
        this.askForMissingField(missingFields[0]);
      }, 1000);
    } else {
      this.confirmDataBeforeSubmission();
    }
  }

  private async handleDataReviewResponse(userMessage: string): Promise<void> {
    console.log('🧪 [Chat] handleDataReviewResponse called with:', userMessage);
    
    const lower = userMessage.toLowerCase();
    
    if (lower.includes('نعم') || lower.includes('yes') || lower === 'y') {
      // User confirmed the extracted data is correct
      this.addMessage({
        id: `data_confirmed_${Date.now()}`,
        role: 'assistant',
        content: this.translate.instant('agent.messages.dataConfirmed'),
        timestamp: new Date(),
        type: 'text'
      });
      
      this.awaitingDataReview = false;
      
      // Continue with missing fields check
      setTimeout(() => {
        const extractedData = this.agentService.getExtractedData();
        const missingFields = this.checkMissingFields(extractedData);
        if (missingFields.length > 0) {
          this.askForMissingField(missingFields[0]);
        } else {
          this.confirmDataBeforeSubmission();
        }
      }, 1000);
      
    } else if (lower.includes('لا') || lower.includes('no') || lower === 'n') {
      // User doesn't want to edit - show missing fields form with detailed info
      const extractedData = this.agentService.getExtractedData();
      const missingFields = this.checkMissingFields(extractedData);
      
      // Create detailed missing fields message
      const missingFieldsList = missingFields
        .filter(field => field !== 'contacts') // Exclude contacts from this list
        .map(field => {
          const fieldLabels: { [key: string]: string } = {
            'firstName': 'Company Name (English)',
            'firstNameAR': 'Company Name (Arabic)',
            'tax': 'Tax Number',
            'CustomerType': 'Customer Type',
            'ownerName': 'Owner Name',
            'buildingNumber': 'Building Number',
            'street': 'Street',
            'country': 'Country',
            'city': 'City',
            'salesOrganization': 'Sales Organization',
            'distributionChannel': 'Distribution Channel',
            'division': 'Division'
          };
          return `• ${fieldLabels[field] || field}`;
        })
        .join('\n');

      this.addMessage({
        id: `missing_fields_info_${Date.now()}`,
        role: 'assistant',
        content: `📊 **مراجعة البيانات / Data Review**

**البيانات المستخرجة (✅ Complete):**
• Company Name: ${extractedData.firstName || 'N/A'}
• Tax Number: ${extractedData.tax || 'N/A'}
• Customer Type: ${extractedData.CustomerType || 'N/A'}
• Country: ${extractedData.country || 'N/A'}

**البيانات الناقصة (❌ Missing):**
${missingFieldsList}

📝 يرجى ملء البيانات الناقصة لإكمال الطلب.
Please fill the missing data to complete the request.`,
        timestamp: new Date(),
        type: 'text'
      });
      
      // ✅ Auto-open missing fields form instead of showing button
      // Use requestIdleCallback for better performance
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          const extractedData = this.agentService.getExtractedData();
          const missingFields = this.checkMissingFields(extractedData);
          
          if (missingFields.length > 0) {
            console.log('🚀 [AUTO] Auto-opening missing fields form for:', missingFields);
            
            // ✅ Open missing fields form automatically
            this.openMissingFieldsForm(missingFields);
            
            // Add message explaining what happened
            this.addMessage({
              id: `auto_opened_form_${Date.now()}`,
              role: 'assistant',
              content: `🚀 **فتح النموذج تلقائياً / Auto-opened Form**
    
    تم فتح نموذج البيانات الناقصة تلقائياً.
    The missing data form has been opened automatically.`,
              timestamp: new Date(),
              type: 'text'
            });
          } else {
            this.confirmDataBeforeSubmission();
          }
        });
      } else {
        // Fallback: use microtask
        Promise.resolve().then(() => {
          const extractedData = this.agentService.getExtractedData();
          const missingFields = this.checkMissingFields(extractedData);
          
          if (missingFields.length > 0) {
            this.openMissingFieldsForm(missingFields);
          } else {
            this.confirmDataBeforeSubmission();
          }
        });
      }
      
      this.awaitingDataReview = false;
      
    } else {
      // Default to confirmation if unclear response
      this.addMessage({
        id: `clarify_data_${Date.now()}`,
        role: 'assistant',
        content: 'هل البيانات صحيحة أم تريد تعديلها؟ / Is the data correct or do you want to edit it? (نعم/yes أو لا/no)',
        timestamp: new Date(),
        type: 'text'
      });
    }
  }

  private async handleConfirmationResponse(userMessage: string): Promise<void> {
    const lower = userMessage.toLowerCase();
    
    if (lower.includes('نعم') || lower.includes('yes') || lower === 'y') {
      await this.finalizeAndSubmit();
    } else if (lower.includes('لا') || lower.includes('no') || lower === 'n') {
      this.addMessage({
        id: `cancelled_${Date.now()}`,
        role: 'assistant',
        content: this.translate.instant('agent.messages.dataCancelled'),
        timestamp: new Date(),
        type: 'text'
      });
    }
    
    this.awaitingConfirmation = false;
  }

  private async handleGeneralMessage(userMessage: string): Promise<void> {
    const loadingMessage = this.addMessage({
      id: `loading_${Date.now()}`,
      role: 'assistant',
      content: this.translate.instant('agent.processing'),
      timestamp: new Date(),
      type: 'loading'
    });

    try {
      const response = await Promise.race([
        this.agentService.sendMessage(userMessage),
        new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 30000)
        )
      ]);

      this.messages = this.messages.filter(m => m.id !== loadingMessage.id);
      
      this.addMessage({
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        type: 'text'
      });
    } catch (error) {
      this.messages = this.messages.filter(m => m.id !== loadingMessage.id);
      throw error;
    }
  }

  private async finalizeAndSubmit(): Promise<void> {
    try {
      // Validate required fields before submission
      const extractedData = this.agentService.getExtractedData();
      const requiredFields = ['firstName', 'firstNameAR', 'tax', 'CustomerType', 'country', 'city'];
      const missingRequired = requiredFields.filter(field => !(extractedData as any)[field]);
      if (missingRequired.length > 0) {
        this.addMessage({
          id: `validation_error_${Date.now()}`,
          role: 'assistant',
          content: `❌ **Cannot submit - Missing required fields:**\n${missingRequired.map(f => `• ${f}`).join('\n')}\n\nPlease complete all required fields first.`,
          timestamp: new Date(),
          type: 'text'
        });
        return;
      }
      // Contacts are optional now – no validation required
      // Check duplicates
      const duplicateCheck = await this.agentService.checkForDuplicates();
      
      if (duplicateCheck.isDuplicate && duplicateCheck.existingRecord) {
        this.addMessage({
          id: `duplicate_${Date.now()}`,
          role: 'assistant',
          content: this.translate.instant('agent.duplicateFound.message', {
            name: duplicateCheck.existingRecord.firstName || duplicateCheck.existingRecord.name || 'N/A',
            tax: duplicateCheck.existingRecord.tax || 'N/A',
            type: duplicateCheck.existingRecord.CustomerType || duplicateCheck.existingRecord.customerType || 'N/A',
            status: duplicateCheck.existingRecord.status || 'Active'
          }),
          timestamp: new Date(),
          type: 'text'
        });
        return;
      }

      // Submit
      const loadingMsg = this.addMessage({
        id: `submitting_${Date.now()}`,
        role: 'assistant',
        content: '📤 جاري الإرسال / Submitting...',
        timestamp: new Date(),
        type: 'loading'
      });

      const response = await this.agentService.submitCustomerRequest();
      
      this.messages = this.messages.filter(m => m.id !== loadingMsg.id);
      
      if (response && response.id) {
        this.addMessage({
          id: `success_${Date.now()}`,
          role: 'assistant',
          content: `✅ ${this.translate.instant('agent.messages.submittedSuccessfully', { id: response.id })}\n\n🎯 ${this.translate.instant('agent.messages.requestSubmittedForReview')}`,
          timestamp: new Date(),
          type: 'text'
        });
        
        // CRITICAL: Reset after success
        this.agentService.reset();
        this.contactsAdded = [];
        this.fieldAttempts = {} as any;
        this.currentMissingField = null;
        
        // ✅ Clear database session after successful submission
        if (this.currentCompanyId) {
          this.sessionStaging.clearSession().catch(err => console.warn('Session cleanup failed:', err));
          this.currentCompanyId = null;
        }
        this.awaitingConfirmation = false;
        this.awaitingDataReview = false;
        console.log('🔄 [RESET] All data reset after successful submission');
        setTimeout(() => {
          this.addMessage({
            id: `ready_${Date.now()}`,
            role: 'assistant',
            content: '👋 Ready for the next customer! Upload documents or start manual entry.',
            timestamp: new Date(),
            type: 'text'
          });
        }, 2000);
        // Conversation completed successfully
      }
    } catch (error: any) {
      this.addMessage({
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: this.translate.instant('agent.messages.submissionFailed', { error: error.message }),
        timestamp: new Date(),
        type: 'text'
      });
    }
  }

  onEnterKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  async onButtonClick(action: string, data?: any): Promise<void> {
    console.log('🎯 [BUTTON] Button clicked:', action, data ?? '');
    
    switch(action) {
      case 'upload':
        // Trigger file input directly (no modal)
        this.triggerFileUpload();
        break;
      case 'manual':
        this.startManualEntry();
        break;
      case 'help':
        this.showHelp();
        break;
      case 'confirm_extraction':
        this.proceedAfterExtraction();
        break;
      case 'data_review_yes':
        console.log('🎯 [BUTTON] User confirmed extracted data');
        this.handleDataReviewResponse('نعم');
        break;
        case 'keep_current_company':
          console.log('✅ [NEW FLOW] User chose to keep current company');
          this.showUnifiedModal = true;
          this.cdr.detectChanges();
          break;
        case 'review_data_again':
          console.log('📋 [INTENT] User wants to review data again');
          this.showUnifiedModal = true;
          this.cdr.detectChanges();
          break;
        case 'modify_fields':
          console.log('✏️ [INTENT] User wants to modify fields');
          this.extractedDataReadOnly = false; // Enable edit mode
          this.showUnifiedModal = true;
          this.cdr.detectChanges();
          break;
        case 'continue_with_data':
          console.log('✅ [INTENT] User wants to continue with current data');
          // No action needed, data is already ready
          break;
        case 'switch_to_new_company':
          console.log('✅ [NEW FLOW] User chose new company - clearing old data');
          this.clearUnifiedFormData();
          
          // ✅ Save new company data to database
          if (data?.extractedData && data?.newFiles) {
            try {
              console.log('💾 [DB] Saving new company to database...');
              await this.saveToSessionStaging(data.extractedData, data.newFiles);
              console.log('✅ [DB] New company saved successfully');
              
              // ✅ Now show modal with data from database
              await this.showUnifiedModalFromDatabase(data.extractedData);
            } catch (error) {
              console.error('❌ [DB] Failed to save/load from database:', error);
              // Show error message
              this.addMessage({
                id: `db_error_${Date.now()}`,
                role: 'assistant',
                content: `❌ Error saving company data. Please try uploading again.`,
                timestamp: new Date(),
                type: 'text'
              });
            }
          }
          break;
        
        case 'retry_upload':
          console.log('🔄 [RETRY] User clicked Try Again - retrying upload');
          if (this.pendingRetryFiles && this.pendingRetryFiles.length > 0) {
            await this.processDocumentsDirectly(this.pendingRetryFiles);
            this.pendingRetryFiles = [];
          } else {
            console.warn('⚠️ [RETRY] No pending files to retry');
          }
          break;
        
        case 'cancel_upload':
          console.log('❌ [CANCEL] User cancelled upload retry');
          this.pendingRetryFiles = [];
          this.addMessage({
            id: `cancelled_${Date.now()}`,
            role: 'assistant',
            content: this.translate.instant('agent.messages.uploadCancelled') || '❌ Upload cancelled',
            timestamp: new Date(),
            type: 'text'
          });
          break;
        
        case 'continue_with_partial_data':
          console.log('✅ [PARTIAL DATA] User chose to continue with partial extracted data');
          if (data?.extractedData && data?.files) {
            // ✅ Save partial data to database and show modal
            try {
              await this.saveToSessionStaging(data.extractedData, data.files);
              await this.showUnifiedModalFromDatabase(data.extractedData);
            } catch (error) {
              console.error('❌ [DB] Failed to save partial data:', error);
            }
            this.pendingRetryFiles = [];
            
            this.addMessage({
              id: `partial_continue_${Date.now()}`,
              role: 'assistant',
              content: this.translate.instant('agent.messages.continueWithPartialData') || 
                       '✅ Continuing with partial data. Please fill in the missing fields in the form.',
              timestamp: new Date(),
              type: 'text'
            });
          }
          break;
        case 'continue_both_companies':
          console.log('✅ [NEW FLOW] User chose to continue with both companies');
          // Save both companies to session staging (optional - don't block on failure)
          if (data?.extractedData && data?.newFiles) {
            try {
              await this.saveToSessionStaging(data.extractedData, data.newFiles);
            } catch (error) {
              console.warn('⚠️ [SESSION] Session staging failed (non-critical):', error);
              // Continue anyway - session staging is optional
            }
          }
          this.handleBothCompaniesChoice(data?.extractedData, data?.newFiles);
        break;
      case 'data_review_no':
        console.log('🎯 [BUTTON] User wants to edit extracted data');
        this.handleDataReviewResponse('لا');
        break;
      case 'edit_extraction':
        console.log('🎯 [BUTTON] Calling editExtractedData()...');
        this.editExtractedData();
        console.log('🎯 [BUTTON] editExtractedData() completed');
        break;
      case 'add_another_contact':
        this.askForContactForm();
        break;
      case 'continue_after_contact':
        this.continueAfterContacts();
        break;
      case 'submit_request':
        this.finalizeAndSubmit();
        break;
      case 'review_data':
        this.reviewAllData();
        break;
      case 'open_missing_fields_form':
        console.log('🎯 [BUTTON] Opening missing fields form with data:', data);
        this.openMissingFieldsForm(data?.missingFields || []);
        break;
      case 'open_unified_modal':
        console.log('🎯 [BUTTON] Opening unified modal');
        this.openUnifiedModal();
        break;
      default:
        console.warn('⚠️ [BUTTON] Unknown action:', action);
    }
  }

  private startManualEntry(): void {
    // Reset data
    this.agentService.reset();
    
    this.addMessage({
      id: `manual_${Date.now()}`,
      role: 'assistant',
      content: this.translate.instant('agent.messages.manualEntry'),
      timestamp: new Date(),
      type: 'text'
    });

    // Start with first field
    const extractedData = this.agentService.getExtractedData();
    const missingFields = this.checkMissingFields(extractedData);
    
    if (missingFields.length > 0) {
      setTimeout(() => {
        this.askForMissingField(missingFields[0]);
      }, 1000);
    }
  }

  private showHelp(): void {
    this.addMessage({
      id: `help_${Date.now()}`,
      role: 'assistant',
      content: this.translate.instant('agent.messages.help'),
      timestamp: new Date(),
      type: 'text'
    });
  }

  // Demo auto-fill setup (double space)
  private setupKeyboardAutoFill(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    console.log('Setting up keyboard auto-fill for data entry');
    // Don't generate initial demo company - it will be set from the form company name
    // this.currentDemoCompany = this.demoDataGenerator.generateDemoData();
    // Create keyboard listener using capture to beat modal handlers
    this.keyboardListener = (event: KeyboardEvent) => {
      // Only work when unified modal is open
      if (!this.showUnifiedModal) {
        return;
      }
      if (event.key === ' ' || event.code === 'Space') {
        const now = Date.now();
        if (now - this.lastSpaceTime < 500) {
          this.spaceClickCount++;
          if (this.spaceClickCount >= 2) {
            event.preventDefault();
            event.stopPropagation();
            this.handleAutoFillKeypress();
            this.spaceClickCount = 0;
          }
        } else {
          this.spaceClickCount = 1;
        }
        this.lastSpaceTime = now;
      }
    };
    // Attach with capture=true to intercept before modal consumes
    document.addEventListener('keydown', this.keyboardListener, true);
    console.log('✅ Keyboard auto-fill setup complete');
  }

  private modalKeyboardListener: ((event: KeyboardEvent) => void) | null = null;

  private attachModalKeyboardListener(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    // Wait for modal to render
    setTimeout(() => {
      const modalContent = document.querySelector('.ant-modal-content');
      if (modalContent) {
        console.log('Attaching keyboard listener to modal content');
        // Remove existing listener if any
        if (this.modalKeyboardListener) {
          modalContent.removeEventListener('keydown', this.modalKeyboardListener as any);
        }
        this.modalKeyboardListener = (event: KeyboardEvent) => {
          if (event.key === ' ' || event.code === 'Space') {
            const now = Date.now();
            if (now - this.lastSpaceTime < 500) {
              this.spaceClickCount++;
              if (this.spaceClickCount >= 2) {
                event.preventDefault();
                event.stopPropagation();
                this.handleAutoFillKeypress();
                this.spaceClickCount = 0;
              }
    } else {
              this.spaceClickCount = 1;
            }
            this.lastSpaceTime = now;
          }
        };
        modalContent.addEventListener('keydown', this.modalKeyboardListener as any);
        console.log('✅ Modal keyboard listener attached');
      } else {
        console.warn('Modal content not found');
      }
    }, 100);
  }

  private handleAutoFillKeypress(): void {
    const activeElement = document.activeElement as HTMLElement;
    if (!activeElement || !this.currentDemoCompany) return;
    const fieldName = this.getFieldNameFromElement(activeElement);
    if (!fieldName) return;
    const demoValue = this.getDemoValueForField(fieldName);
    if (demoValue !== null && demoValue !== undefined) {
      this.fillFieldWithValue(fieldName, demoValue);
      this.addVisualFeedback(activeElement);
    }
  }

  private getFieldNameFromElement(element: HTMLElement): string | null {
    const formControlName = element.getAttribute('formControlName');
    if (formControlName) return formControlName;
    const name = element.getAttribute('name');
    if (name) return name;
    const id = element.getAttribute('id');
    if (id) return id;
    let parent = element.parentElement;
    while (parent && parent.tagName !== 'FORM') {
      const parentFormControlName = parent.getAttribute('formControlName');
      if (parentFormControlName) return parentFormControlName;
      parent = parent.parentElement;
    }
    return null;
  }

  private getDemoValueForField(fieldName: string): any {
    if (!this.currentDemoCompany) return null;
    const map: { [key: string]: any } = {
      firstName: this.currentDemoCompany.name,
      firstNameAR: this.currentDemoCompany.nameAr,
      tax: this.currentDemoCompany.taxNumber,
      CustomerType: this.currentDemoCompany.customerType,
      ownerName: this.currentDemoCompany.ownerName,
      buildingNumber: this.currentDemoCompany.buildingNumber,
      street: this.currentDemoCompany.street,
      country: this.currentDemoCompany.country,
      city: this.currentDemoCompany.city,
      salesOrganization: this.currentDemoCompany.salesOrg,
      distributionChannel: this.currentDemoCompany.distributionChannel,
      division: this.currentDemoCompany.division,
      CompanyOwnerFullName: this.currentDemoCompany.ownerName,
      CompanyOwner: this.currentDemoCompany.ownerName,
      taxNumber: this.currentDemoCompany.taxNumber,
      SalesOrgOption: this.currentDemoCompany.salesOrg,
      DistributionChannelOption: this.currentDemoCompany.distributionChannel,
      DivisionOption: this.currentDemoCompany.division,
      // Contact field mappings (use first contact as default)
      name: this.currentDemoCompany.contacts[0]?.name,
      jobTitle: this.currentDemoCompany.contacts[0]?.jobTitle,
      email: this.currentDemoCompany.contacts[0]?.email,
      mobile: this.currentDemoCompany.contacts[0]?.mobile,
      landline: this.currentDemoCompany.contacts[0]?.landline,
      preferredLanguage: this.currentDemoCompany.contacts[0]?.preferredLanguage
    };
    return map[fieldName] || null;
  }

  private fillFieldWithValue(fieldName: string, demoValue: any): void {
    // Unified Modal
    if (this.showUnifiedModal && this.unifiedModalForm) {
      const control = this.unifiedModalForm.get(fieldName);
      if (control && control.enabled && !control.value) {
        control.patchValue(demoValue);
        control.markAsTouched();
        control.updateValueAndValidity();
        if (fieldName === 'country') {
          this.updateCityOptions(demoValue);
        }
      }
      // Contacts array
      const contactsArray = this.unifiedModalForm.get('contacts') as FormArray;
      if (contactsArray && contactsArray.length > 0) {
        for (let i = 0; i < contactsArray.length; i++) {
          const contactControl = contactsArray.at(i).get(fieldName);
          if (contactControl && !contactControl.value) {
            const contact = this.currentDemoCompany?.contacts[i] || this.currentDemoCompany?.contacts[0];
            if (contact) {
              const contactValue = (contact as any)[fieldName];
              if (contactValue) {
                contactControl.patchValue(contactValue);
                contactControl.markAsTouched();
                break;
              }
            }
          }
        }
      }
    }
    // Missing Fields Form
    else if (this.showMissingFieldsForm && this.missingFieldsForm) {
      const control = this.missingFieldsForm.get(fieldName);
      if (control && !control.value) {
        control.patchValue(demoValue);
        control.markAsTouched();
      }
    }
    // Contact Form
    else if (this.showContactForm && this.contactForm) {
      const control = this.contactForm.get(fieldName);
      if (control && !control.value) {
        const contact = this.currentDemoCompany?.contacts[0];
        if (contact) {
          const contactValue = (contact as any)[fieldName];
          if (contactValue) {
            control.patchValue(contactValue);
            control.markAsTouched();
          }
        }
      }
    }
  }

  private addVisualFeedback(element: HTMLElement): void {
    if (element) {
      element.style.transition = 'all 0.3s ease';
      element.style.background = '#e6f7ff';
      element.style.border = '2px solid #1890ff';
      element.style.boxShadow = '0 0 8px rgba(24, 144, 255, 0.3)';
      setTimeout(() => {
        element.style.background = '';
        element.style.border = '';
        element.style.boxShadow = '';
      }, 1500);
    }
  }

  fillWithDemoData(): void {
    try {
      // Ensure modal and form are ready
      if (!this.showUnifiedModal) {
        this.openUnifiedModal();
        this.cdr.detectChanges();
      }
      if (!this.unifiedModalForm) {
        setTimeout(() => this.fillWithDemoData(), 50);
        return;
      }

      if (!this.currentDemoCompany) {
        this.currentDemoCompany = this.demoDataGenerator.generateDemoData();
      }
      
      if (this.showUnifiedModal && this.unifiedModalForm) {
        // Patch main form fields
        this.unifiedModalForm.patchValue({
          firstName: this.currentDemoCompany.name,
          firstNameAR: this.currentDemoCompany.nameAr,
          tax: this.currentDemoCompany.taxNumber,
          CustomerType: this.currentDemoCompany.customerType,
          ownerName: this.currentDemoCompany.ownerName,
          buildingNumber: this.currentDemoCompany.buildingNumber,
          street: this.currentDemoCompany.street,
          country: this.currentDemoCompany.country,
          city: this.currentDemoCompany.city,
          salesOrganization: this.currentDemoCompany.salesOrg,
          distributionChannel: this.currentDemoCompany.distributionChannel,
          division: this.currentDemoCompany.division
        });
        
        // Update city options based on country
        this.updateCityOptions(this.currentDemoCompany.country);
        
        // Handle contacts
        const contactsArray = this.unifiedModalForm.get('contacts') as FormArray;
        
        // Clear existing contacts
        while (contactsArray.length !== 0) {
          contactsArray.removeAt(0);
        }
        
        // Add demo contacts
        this.currentDemoCompany.contacts.forEach((contact, index) => {
          this.addContactToUnifiedForm();
          const idx = contactsArray.length - 1;
          contactsArray.at(idx).patchValue({
            name: contact.name,
            jobTitle: contact.jobTitle,
            email: contact.email,
            mobile: contact.mobile,
            landline: contact.landline,
            preferredLanguage: contact.preferredLanguage
          });
        });
        
        // Force change detection
        this.cdr.detectChanges();
      }
    } catch (e) {
      // Silent error handling
    }
  }

  getCurrentDemoCompany(): DemoCompany | null {
    return this.demoDataGenerator.getLastUsedCompany();
  }

  getRemainingDemoCompanies(): number {
    return this.demoDataGenerator.getRemainingCompaniesCount();
  }

  resetDemoGenerator(): void {
    this.demoDataGenerator.resetGenerator();
  }

  private proceedAfterExtraction(): void {
    console.log('🚀 [EXTRACTION] proceedAfterExtraction called');
    
    // ✅ Always ask user to review extracted data first
    this.awaitingDataReview = true;
    
    this.addMessage({
      id: `data_review_${Date.now()}`,
      role: 'assistant',
      content: `📊 **مراجعة البيانات المستخرجة / Review Extracted Data**

هل البيانات المستخرجة صحيحة؟ / Is the extracted data correct?`,
      timestamp: new Date(),
      type: 'confirmation',
      data: {
        buttons: [
          { text: '✅ نعم، صحيح / Yes, correct', action: 'data_review_yes' },
          { text: '✏️ تعديل / Edit', action: 'data_review_no' }
        ]
      }
    });
  }

  private editExtractedData(): void {
    console.log('🔧 [EDIT] editExtractedData called');
    
    try {
      // ✅ Check if form exists
      if (!this.editForm) {
        console.error('❌ [EDIT] editForm is undefined! Reinitializing...');
        this.initializeForms();
      }
      
      // Get extracted data
      const extractedData = this.agentService.getExtractedData();
      console.log('🔧 [EDIT] Extracted data:', extractedData);
      
      // ✅ Get only extracted fields (non-empty values)
      const extractedFields = [
        'firstName', 'firstNameAR', 'tax', 'CustomerType', 'ownerName',
        'buildingNumber', 'street', 'country', 'city', 
        'salesOrganization', 'distributionChannel', 'division'
      ].filter(field => {
        const value = (extractedData as any)[field];
        return value && value.toString().trim() !== '';
      });
      
      console.log('🔧 [EDIT] Extracted fields only:', extractedFields);
      
      // ✅ Create dynamic form with only extracted fields
      this.createDynamicEditForm(extractedFields, extractedData);
      
      console.log('🔧 [EDIT] Dynamic form created with fields:', extractedFields);
      
      // ✅ Show modal immediately
      this.showEditForm = true;
      
      // ✅ Use single change detection after modal is shown
      this.cdr.detectChanges();
      
      console.log('✅ [EDIT] Modal opened. showEditForm =', this.showEditForm);
      
      // ✅ Add message showing only extracted data
      const extractedFieldsCount = extractedFields.length;
      
      // ✅ Create extracted fields list for display
      const extractedFieldsList = extractedFields
        .map(field => {
          const fieldLabels: { [key: string]: string } = {
            'firstName': 'Company Name (English)',
            'firstNameAR': 'Company Name (Arabic)',
            'tax': 'Tax Number',
            'CustomerType': 'Customer Type',
            'ownerName': 'Owner Name',
            'buildingNumber': 'Building Number',
            'street': 'Street',
            'country': 'Country',
            'city': 'City',
            'salesOrganization': 'Sales Organization',
            'distributionChannel': 'Distribution Channel',
            'division': 'Division'
          };
          return `• ${fieldLabels[field] || field}: ${(extractedData as any)[field]}`;
        })
        .join('\n');

    this.addMessage({
      id: `edit_${Date.now()}`,
      role: 'assistant',
        content: `✏️ **تعديل البيانات المستخرجة / Edit Extracted Data**

📊 **البيانات المستخرجة فقط / Extracted Data Only:**
${extractedFieldsCount} fields were extracted from the document.

✅ **البيانات المستخرجة:**
${extractedFieldsList}

📝 **النموذج المنبثق يحتوي على:**
• البيانات المستخرجة فقط (قابلة للتعديل)
• لا توجد حقول فارغة أو غير مستخرجة

يرجى مراجعة وتعديل البيانات في النموذج المنبثق.
Please review and edit the extracted data in the popup form.`,
        timestamp: new Date(),
        type: 'text'
      });
      
    } catch (error: any) {
      console.error('❌ [EDIT] Error in editExtractedData:', error);
      this.addMessage({
        id: `edit_error_${Date.now()}`,
        role: 'assistant',
        content: this.translate.instant('agent.messages.editFormError', { error: error.message }),
      timestamp: new Date(),
      type: 'text'
    });
    }
  }

  private continueAfterContacts(): void {
    const extractedData = this.agentService.getExtractedData();
    const missingFields = this.checkMissingFields(extractedData)
      .filter(f => f !== 'contacts');
    
    if (missingFields.length > 0) {
      this.askForMissingField(missingFields[0]);
    } else {
      this.confirmDataBeforeSubmission();
    }
  }

  private reviewAllData(): void {
    const data = this.agentService.getExtractedData();
    
    let content = `📊 **مراجعة البيانات الكاملة / Full Data Review:**\n\n`;
    
    // Company Info
    content += `**🏢 الشركة / Company:**\n`;
    content += `• الاسم (EN): ${data.firstName}\n`;
    content += `• الاسم (AR): ${data.firstNameAR}\n`;
    content += `• الرقم الضريبي: ${data.tax}\n`;
    content += `• النوع: ${data.CustomerType}\n`;
    content += `• المالك: ${data.ownerName}\n\n`;
    
    // Address
    content += `**📍 العنوان / Address:**\n`;
    content += `• المبنى: ${data.buildingNumber}\n`;
    content += `• الشارع: ${data.street}\n`;
    content += `• الدولة: ${data.country}\n`;
    content += `• المدينة: ${data.city}\n\n`;
    
    // Sales
    content += `**💼 المبيعات / Sales:**\n`;
    content += `• المنظمة: ${data.salesOrganization}\n`;
    content += `• القناة: ${data.distributionChannel}\n`;
    content += `• القسم: ${data.division}\n\n`;
    
    // Contacts
    if (data.contacts.length > 0) {
      content += `**👥 جهات الاتصال / Contacts:**\n`;
      data.contacts.forEach((c, i) => {
        content += `${i + 1}. ${c.name} - ${c.jobTitle} - ${c.mobile}\n`;
      });
    }

    this.addMessage({
      id: `review_${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: new Date(),
      type: 'text'
    });

    this.confirmDataBeforeSubmission();
  }

  formatMessage(content: string): string {
    // Keep HTML intact for structured messages
    if (content.includes('<div class="extraction-result">')) {
      return content;
    }
    // For regular messages, convert markdown
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  closeDocumentModal(): void {
    this.showDocumentModal = false;
    this.pendingFiles = [];
    this.documentMetadataForm.reset();
    this.currentDocumentStep = 'upload';
    
    // Close modal service instance if it exists
    if (this.modalInstance) {
      this.modalInstance.destroy();
      this.modalInstance = null;
    }
  }

  goToReviewStep(): void {
    if (this.pendingFiles.length > 0) {
      this.currentDocumentStep = 'review';
      this.initializeDocumentForm();
      this.cdr.detectChanges();
    }
  }

  goToUploadStep(): void {
    this.currentDocumentStep = 'upload';
    this.cdr.detectChanges();
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('directFileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    } else {
      console.warn('⚠️ Falling back to dynamic input creation');
      // Create a temporary file input
      const tempInput = document.createElement('input');
      tempInput.type = 'file';
      tempInput.multiple = true;
      tempInput.accept = 'image/*';
      tempInput.style.display = 'none';
      
      tempInput.onchange = (event: any) => {
        this.onFileSelected(event);
        document.body.removeChild(tempInput);
      };
      
      document.body.appendChild(tempInput);
      tempInput.click();
    }
  }

  closeContactForm(): void {
    this.showContactForm = false;
    this.contactForm.reset({ preferredLanguage: 'Arabic' });
  }

  saveEditForm(): void {
    console.log('💾 [EDIT] saveEditForm called');
    console.log('💾 [EDIT] Form valid?', this.editForm.valid);
    console.log('💾 [EDIT] Form value:', this.editForm.value);
    
    // ✅ لا تشترط validation - اسمح بالحفظ حتى لو في حقول فاضية
    const formData = this.editForm.value;
    
    // ✅ Update extracted data with form values (only non-empty values)
    Object.keys(formData).forEach(key => {
      const value = formData[key];
      if (value !== null && value !== undefined && value !== '') {
        console.log(`💾 [EDIT] Updating field: ${key} = ${value}`);
        this.agentService.updateExtractedDataField(key, value);
      }
    });
    
    console.log('💾 [EDIT] Updated extracted data:', this.agentService.getExtractedData());
    
    // ✅ Show success message
    this.addMessage({
      id: `edit_saved_${Date.now()}`,
      role: 'assistant',
      content: this.translate.instant('agent.messages.changesSaved'),
      timestamp: new Date(),
      type: 'text'
    });
    
    // ✅ Close modal
    this.showEditForm = false;
    this.cdr.detectChanges();
    
    // ✅ Continue with workflow
    setTimeout(() => {
      const extractedData = this.agentService.getExtractedData();
      const missingFields = this.checkMissingFields(extractedData);
      
      if (missingFields.length > 0) {
        console.log('💾 [EDIT] Missing fields found:', missingFields);
        this.askForMissingField(missingFields[0]);
      } else {
        console.log('💾 [EDIT] All fields complete');
        this.confirmDataBeforeSubmission();
      }
    }, 1000);
  }

  closeEditForm(): void {
    this.showEditForm = false;
    this.editForm.reset();
  }

  // Missing fields form methods
  private openMissingFieldsForm(missingFields: string[]): void {
    console.log('📝 [MISSING] Opening missing fields form for:', missingFields);
    
    try {
      // Store current missing fields
      this.currentMissingFields = missingFields;
      
      // Check if form exists
      if (!this.missingFieldsForm) {
        console.error('❌ [MISSING] missingFieldsForm is undefined! Reinitializing...');
        this.initializeForms();
      }
      
      // Clear form first
      this.missingFieldsForm.reset();
      
      // Get extracted data to pre-fill non-missing fields (for reference)
      const extractedData = this.agentService.getExtractedData();
      
      // Only pre-fill fields that are NOT missing (for reference)
      const nonMissingFields = ['firstName', 'firstNameAR', 'tax', 'CustomerType', 'ownerName',
        'buildingNumber', 'street', 'country', 'city', 'salesOrganization', 
        'distributionChannel', 'division'].filter(field => !missingFields.includes(field));
      
      const formData: any = {};
      nonMissingFields.forEach(field => {
        formData[field] = (extractedData as any)[field] || '';
      });
      
      // Set missing fields as empty (to be filled by user)
      missingFields.forEach(field => {
        formData[field] = '';
      });
      
      console.log('📝 [MISSING] Form data to patch:', formData);
      
      // Patch form values
      this.missingFieldsForm.patchValue(formData);
      
      // ✅ Disable non-missing fields (make them read-only for reference)
      nonMissingFields.forEach(field => {
        this.missingFieldsForm.get(field)?.disable();
        console.log(`📝 [MISSING] Disabled field: ${field} (non-missing, for reference)`);
      });
      
      console.log('📝 [MISSING] Form patched and fields configured successfully');
      
      // Force change detection
      this.cdr.detectChanges();
      
      // Show modal
      this.showMissingFieldsForm = true;
      this.cdr.detectChanges();
      
      console.log('✅ [MISSING] Missing fields modal opened');
      
      // Add instruction message
      this.addMessage({
        id: `missing_form_opened_${Date.now()}`,
        role: 'assistant',
        content: `📝 **إكمال البيانات الناقصة / Complete Missing Data**

يرجى ملء الحقول الناقصة في النموذج المنبثق. الحقول المملوءة مسبقاً هي للمرجع فقط.
Please fill the missing fields in the popup form. Pre-filled fields are for reference only.`,
        timestamp: new Date(),
        type: 'text'
      });
      
    } catch (error: any) {
      console.error('❌ [MISSING] Error opening missing fields form:', error);
      this.addMessage({
        id: `missing_form_error_${Date.now()}`,
        role: 'assistant',
        content: this.translate.instant('agent.messages.missingFormError', { error: error.message }),
        timestamp: new Date(),
        type: 'text'
      });
    }
  }

  saveMissingFieldsForm(): void {
    console.log('💾 [MISSING] saveMissingFieldsForm called');
    console.log('💾 [MISSING] Form value:', this.missingFieldsForm.value);
    
    const formData = this.missingFieldsForm.value;
    
    // Update extracted data with form values (only non-empty values)
    Object.keys(formData).forEach(key => {
      const value = formData[key];
      if (value !== null && value !== undefined && value !== '') {
        console.log(`💾 [MISSING] Updating field: ${key} = ${value}`);
        this.agentService.updateExtractedDataField(key, value);
      }
    });
    
    console.log('💾 [MISSING] Updated extracted data:', this.agentService.getExtractedData());
    
    // Show success message
    this.addMessage({
      id: `missing_saved_${Date.now()}`,
      role: 'assistant',
      content: this.translate.instant('agent.messages.missingDataSaved'),
      timestamp: new Date(),
      type: 'text'
    });
    
    // Close modal
    this.showMissingFieldsForm = false;
    this.cdr.detectChanges();
    
    // Continue with workflow
    setTimeout(() => {
      const extractedData = this.agentService.getExtractedData();
      const remainingMissingFields = this.checkMissingFields(extractedData);
      
      if (remainingMissingFields.length > 0) {
        console.log('💾 [MISSING] Still missing fields:', remainingMissingFields);
        this.askForMissingField(remainingMissingFields[0]);
      } else {
        console.log('💾 [MISSING] All fields complete');
        this.confirmDataBeforeSubmission();
      }
    }, 1000);
  }

  closeMissingFieldsForm(): void {
    this.showMissingFieldsForm = false;
    this.missingFieldsForm.reset();
    this.currentMissingFields = [];
  }

  // ✅ Helper methods for missing fields form
  hasMissingField(fields: string[]): boolean {
    return fields.some(field => this.currentMissingFields.includes(field));
  }

  getCompletedFields(): string[] {
    const allFields = ['firstName', 'firstNameAR', 'tax', 'CustomerType', 'ownerName',
      'buildingNumber', 'street', 'country', 'city', 'salesOrganization', 
      'distributionChannel', 'division'];
    return allFields.filter(field => !this.currentMissingFields.includes(field));
  }

  getFieldLabel(field: string): string {
    const labels: { [key: string]: string } = {
      'firstName': 'Company Name (English)',
      'firstNameAR': 'Company Name (Arabic)',
      'tax': 'Tax Number',
      'CustomerType': 'Customer Type',
      'ownerName': 'Owner Name',
      'buildingNumber': 'Building Number',
      'street': 'Street',
      'country': 'Country',
      'city': 'City',
      'salesOrganization': 'Sales Organization',
      'distributionChannel': 'Distribution Channel',
      'division': 'Division'
    };
    return labels[field] || field;
  }

  getFieldValue(field: string): string {
    const extractedData = this.agentService.getExtractedData();
    return (extractedData as any)[field] || 'N/A';
  }


  // ✅ Create dynamic edit form based on extracted fields
  private createDynamicEditForm(extractedFields: string[], extractedData: any): void {
    console.log('🔧 [DYNAMIC] Creating dynamic form for fields:', extractedFields);
    
    // Create form controls object dynamically with minimal operations
    const formControls: any = {};
    
    // Batch the form control creation
    for (const field of extractedFields) {
      formControls[field] = [extractedData[field] || '', []];
    }
    
    // Create new form group with only extracted fields
    this.editForm = this.fb.group(formControls);
    
    // Store extracted fields for template use
    this.currentExtractedFields = extractedFields;
    
    console.log('🔧 [DYNAMIC] Dynamic form created successfully');
  }

  // ✅ Helper methods for dynamic form rendering - optimized with Sets for O(1) lookup
  private fullWidthFieldsSet = new Set(['firstName', 'firstNameAR', 'street', 'ownerName']);
  private textFieldsSet = new Set(['firstName', 'firstNameAR', 'tax', 'ownerName', 'buildingNumber', 'street', 'city']);
  private selectFieldsSet = new Set(['CustomerType', 'country', 'salesOrganization', 'distributionChannel', 'division']);

  shouldBeFullWidth(field: string): boolean {
    return this.fullWidthFieldsSet.has(field);
  }

  isTextInput(field: string): boolean {
    return this.textFieldsSet.has(field);
  }

  isSelectInput(field: string): boolean {
    return this.selectFieldsSet.has(field);
  }

  // ✅ Optimized placeholder lookup with Map
  private placeholderMap = new Map([
    ['firstName', 'Company Name (English)'],
    ['firstNameAR', 'اسم الشركة (عربي)'],
    ['tax', 'Tax Number'],
    ['ownerName', 'Owner Name'],
    ['buildingNumber', 'Building Number'],
    ['street', 'Street Address'],
    ['city', 'City']
  ]);

  getFieldPlaceholder(field: string): string {
    return this.placeholderMap.get(field) || field;
  }

  // Use shared lookup lists for dropdowns in modals
  getSelectOptions(field: string): Array<{ value: string; label: string }> {
    switch (field) {
      case 'CustomerType':
        // CUSTOMER_TYPE_OPTIONS is an array of { value, label } in shared lookups
        return (this.customerTypeOptions as any[]).map((o: any) => ({ value: o.value || o, label: o.label || o }));
      case 'country':
        return (this.countryOptions as any[]).map((o: any) => ({ value: o.value || o, label: o.label || o }));
      case 'city': {
        const country = this.unifiedModalForm?.get('country')?.value || '';
        const cities = getCitiesByCountry(country);
        return (cities as any[]).map((c: any) => ({ value: c.value || c, label: c.label || c }));
      }
      case 'salesOrganization':
        return (this.salesOrgOptions as any[]).map((o: any) => ({ value: o.value, label: o.label }));
      case 'distributionChannel':
        return (this.distributionChannelOptions as any[]).map((o: any) => ({ value: o.value, label: o.label }));
      case 'division':
        return (this.divisionOptions as any[]).map((o: any) => ({ value: o.value, label: o.label }));
      default:
        return [];
    }
  }

  get documentsFA(): FormArray {
    // Reduced debugging - only return the array without excessive logging
    if (this.documentMetadataForm) {
      const documentsArray = this.documentMetadataForm.get('documents') as FormArray;
      return documentsArray || this.fb.array([]);
    }
    
    console.log('🔍 [DEBUG] documentMetadataForm is null, returning empty array');
    return this.fb.array([]);
  }

  // Smart document metadata detection with multiple attempts (like main extraction)
  async detectDocumentMetadataSmart(file: File): Promise<{ country?: string; type?: string }> {
    console.log('🔍 [SMART] Starting smart document metadata detection for:', file.name);
    
    // Show progress indicator
    this.showMetadataExtractionProgress = true;
    this.metadataExtractionProgress = 0;
    this.metadataExtractionStatus = `Analyzing ${file.name}...`;
    
    const attempts = [];
    const maxAttempts = 3;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`🔍 [SMART] Attempt ${attempt}/${maxAttempts} for ${file.name}`);
      
      // Update progress
      this.metadataExtractionProgress = (attempt - 1) * 33;
      this.metadataExtractionStatus = `Attempt ${attempt}/${maxAttempts} - Analyzing ${file.name}...`;
      this.cdr.detectChanges();
      
      try {
        // Create a temporary canvas to extract text
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        const imageData = await new Promise<string>((resolve, reject) => {
          img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            resolve(canvas.toDataURL());
          };
          img.onerror = reject;
          img.src = URL.createObjectURL(file);
        });
        
        // Simulate OCR extraction (in real implementation, you'd call OCR service)
        const extractedText = await this.simulateOCRExtraction(imageData, file.name);
        
        // Parse extracted text for country and document type
        const detectedInfo = this.parseExtractedTextForMetadata(extractedText);
        
        attempts.push({
          attempt,
          detectedInfo,
          confidence: this.calculateMetadataConfidence(detectedInfo)
        });
        
        console.log(`🔍 [SMART] Attempt ${attempt} result:`, detectedInfo);
        
        // Wait between attempts
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
      } catch (error) {
        console.warn(`🔍 [SMART] Attempt ${attempt} failed:`, error);
        attempts.push({
          attempt,
          detectedInfo: {},
          confidence: 0
        });
      }
    }
    
    // Find best result
    const bestAttempt = attempts.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
    
    // Complete progress
    this.metadataExtractionProgress = 100;
    this.metadataExtractionStatus = `Analysis complete for ${file.name}`;
    this.cdr.detectChanges();
    
    // Hide progress after a short delay
    setTimeout(() => {
      this.showMetadataExtractionProgress = false;
      this.cdr.detectChanges();
    }, 1000);
    
    console.log('🔍 [SMART] Best result:', bestAttempt.detectedInfo, 'Confidence:', bestAttempt.confidence);
    return bestAttempt.detectedInfo;
  }
  
  // Simulate OCR extraction (replace with real OCR service)
  private async simulateOCRExtraction(imageData: string, filename: string): Promise<string> {
    // In real implementation, call your OCR service here
    // For now, return mock extracted text based on filename and some randomness
    const lowerFilename = filename.toLowerCase();
    
    if (lowerFilename.includes('commercial')) {
      const countries = ['Saudi Arabia', 'Egypt', 'United Arab Emirates'];
      const cities = ['Riyadh', 'Cairo', 'Dubai'];
      const randomCountry = countries[Math.floor(Math.random() * countries.length)];
      const randomCity = cities[Math.floor(Math.random() * cities.length)];
      
      return `Commercial Registration Document - ${randomCountry} - ${randomCity} - Company Registration - Business License`;
    } else if (lowerFilename.includes('tax')) {
      return 'Tax Registration Document - Saudi Arabia - Riyadh - VAT Certificate - Tax ID';
    } else if (lowerFilename.includes('license')) {
      return 'Business License Document - Egypt - Cairo - Commercial License - Operating Permit';
    }
    
    return 'Document text extracted via OCR - Business Registration - Company Information';
  }
  
  // Parse extracted text for metadata
  private parseExtractedTextForMetadata(text: string): { country?: string; type?: string } {
    const lowerText = text.toLowerCase();
    
    let country = '';
    let type = '';
    
    // Detect country from text
    if (lowerText.includes('saudi') || lowerText.includes('riyadh') || lowerText.includes('jeddah')) {
      country = 'Saudi Arabia';
    } else if (lowerText.includes('egypt') || lowerText.includes('cairo') || lowerText.includes('alexandria')) {
      country = 'Egypt';
    } else if (lowerText.includes('uae') || lowerText.includes('dubai') || lowerText.includes('abu dhabi')) {
      country = 'United Arab Emirates';
    }
    
    // Detect document type from text
    if (lowerText.includes('commercial') || lowerText.includes('registration')) {
      type = 'Commercial Registration';
    } else if (lowerText.includes('tax') || lowerText.includes('vat')) {
      type = 'Tax Card';
    } else if (lowerText.includes('license') || lowerText.includes('permit')) {
      type = 'Business License';
    }
    
    return { country, type };
  }
  
  // Calculate confidence score for detected metadata
  private calculateMetadataConfidence(detectedInfo: { country?: string; type?: string }): number {
    let confidence = 0;
    if (detectedInfo.country) confidence += 50;
    if (detectedInfo.type) confidence += 50;
    return confidence;
  }

  // Document type detection for accumulated files
  detectDocumentType(fileName: string): string {
    const name = fileName.toLowerCase();
    
    // Company registration documents
    if (name.includes('commercial') || name.includes('registration') || name.includes('تجاري') || name.includes('سجل')) {
      return 'Commercial Registration';
    }
    if (name.includes('trade') || name.includes('license') || name.includes('ترخيص') || name.includes('تجاري')) {
      return 'Trade License';
    }
    if (name.includes('tax') || name.includes('vat') || name.includes('ضريبي') || name.includes('ضريبة')) {
      return 'Tax Certificate';
    }
    if (name.includes('certificate') || name.includes('شهادة') || name.includes('إثبات')) {
      return 'Certificate';
    }
    if (name.includes('contract') || name.includes('agreement') || name.includes('عقد') || name.includes('اتفاق')) {
      return 'Contract/Agreement';
    }
    if (name.includes('invoice') || name.includes('فاتورة') || name.includes('bill')) {
      return 'Invoice/Bill';
    }
    if (name.includes('id') || name.includes('passport') || name.includes('هوية') || name.includes('جواز')) {
      return 'ID Document';
    }
    if (name.includes('bank') || name.includes('statement') || name.includes('بنك') || name.includes('كشف')) {
      return 'Bank Statement';
    }
    
    // Default
    return 'Document';
  }

  // Remove accumulated file
  removeAccumulatedFile(index: number): void {
    console.log('🗑️ [Chat] Removing accumulated file at index:', index);
    this.accumulatedFiles.splice(index, 1);
    
    if (this.accumulatedFiles.length === 0) {
      this.showAccumulatedFiles = false;
    }
    
    console.log('🗑️ [Chat] Remaining accumulated files:', this.accumulatedFiles.length);
  }

  // Clear all accumulated files
  clearAccumulatedFiles(): void {
    console.log('🗑️ [Chat] Clearing all accumulated files');
    this.accumulatedFiles = [];
    this.showAccumulatedFiles = false;
  }

  // Proceed with accumulated files to metadata collection
  async proceedWithAccumulatedFiles(): Promise<void> {
    if (this.accumulatedFiles.length === 0) {
      console.warn('⚠️ [Chat] No accumulated files to proceed with');
      return;
    }
    
    console.log('📁 [Chat] Proceeding with accumulated files:', this.accumulatedFiles.length);
    
    // ✅ Move to pending files for metadata collection
    this.pendingFiles = [...this.accumulatedFiles];
    this.accumulatedFiles = [];
    this.showAccumulatedFiles = false;
    
    console.log('📁 [Chat] Files moved to pending:', this.pendingFiles.length);
    
    // ✅ Initialize metadata form for ALL files
    this.initializeDocumentForm();
    this.openDocumentModalWithService();
  }

  get allDocumentTypes(): string[] {
    return ['Commercial Registration', 'Tax Card', 'Business License', 
            'Trade License', 'Tax Certificate'];
  }




  onCountryChange(selectedCountry: string, formIndex: number): void {
    const documentsArray = this.documentMetadataForm.get('documents') as FormArray;
    const docGroup = documentsArray?.at(formIndex);
    if (docGroup) {
      docGroup.patchValue({ type: '' });
    }
  }

  getDocumentTypesByCountry(country: string): string[] {
    if (!country || country.trim() === '') {
      return ['Other'];
    }
    console.log('🧪 [Chat] getDocumentTypesByCountry called with country:', country);
    const types = this.documentTypes[country] || ['Other'];
    console.log('🧪 [Chat] Returning document types:', types);
    return types;
  }

  private addMessage(message: ChatMessage): ChatMessage {
    console.log('🧪 [Chat] addMessage type=', message.type, 'id=', message.id);
    console.log('🧪 [Chat] message.data =', message.data);
    console.log('🧪 [Chat] message.data?.buttons =', message.data?.buttons);
    
    // Use immutable update to guarantee change detection
    this.messages = [...this.messages, message];

    // Limit messages
    if (this.messages.length > this.MAX_MESSAGES) {
      this.messages = this.messages.slice(-20);
    }

    // Force change detection immediately
    try { 
      this.cdr.markForCheck(); 
      this.cdr.detectChanges(); 
    } catch (e) {
      console.warn('🧪 [Chat] Change detection error:', e);
    }

    // Debug: verify DOM rendering for action buttons when applicable
    setTimeout(() => {
      try {
        const buttonsContainer = document.querySelectorAll('.action-buttons');
        const buttons = document.querySelectorAll('.action-buttons .action-btn');
        const messagesContainer = document.querySelectorAll('.message');
        console.log('🧪 [Chat] DOM action-buttons containers =', buttonsContainer.length, ' action-btn count =', buttons.length);
        console.log('🧪 [Chat] DOM messages count =', messagesContainer.length);
        
        // Check if the specific action message is in DOM
        if (message.type === 'actions') {
          const actionMessage = document.querySelector(`[data-message-id="${message.id}"]`);
          console.log('🧪 [Chat] Action message in DOM =', !!actionMessage);
          if (actionMessage) {
            const actionButtons = actionMessage.querySelectorAll('.action-buttons');
            console.log('🧪 [Chat] Action buttons in message =', actionButtons.length);
          }
        }
      } catch (e) {
        console.warn('🧪 [Chat] DOM inspection error:', e);
      }
    }, 100);

    this.scrollToBottom();
    return message;
  }

  private scrollToBottom(): void {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    
    // Use a more efficient scrolling approach
    this.scrollTimeout = setTimeout(() => {
      const chatBody = document.querySelector('.chat-body');
      if (chatBody) {
        // Use scrollTo for better performance than scrollTop
        chatBody.scrollTo({
          top: chatBody.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 10); // Reduced timeout for better responsiveness
  }

  private debugModalLayoutCheck(context: string): void {
    // Simplified debug check with minimal DOM operations
    try {
        const modalBody = document.querySelector('.ant-modal-body') as HTMLElement | null;
        if (modalBody) {
        console.log(`🧪 [Chat][${context}] Modal visible:`, !!modalBody);
        console.log(`🧪 [Chat][${context}] Form exists:`, !!this.documentMetadataForm);
        console.log(`🧪 [Chat][${context}] Documents count:`, this.documentsFA.length);
      }
    } catch (e) {
      console.warn('🧪 [Chat] debugModalLayoutCheck error:', e);
    }
  }

  // Language helpers (non-invasive)
  private t(ar: string, en: string): string {
    return this.currentLang === 'ar' ? ar : en;
  }

  private detectUserLanguage(text: string): 'ar' | 'en' | null {
    const hasArabic = /[\u0600-\u06FF]/.test(text);
    const hasLatin = /[A-Za-z]/.test(text);
    if (hasArabic && !hasLatin) return 'ar';
    if (hasLatin && !hasArabic) return 'en';
    return null;
  }

  private setLang(lang: 'ar' | 'en'): void {
    this.currentLang = lang;
    try { sessionStorage.setItem('language', lang); } catch {}
    console.log('🌐 [Chat] Switched language ->', lang);
  }

  // Unified Modal Methods
  private openUnifiedModal(): void {
    console.log('🎯 [UNIFIED] Opening unified modal');
    
    try {
      const extractedData = this.agentService.getExtractedData();
      const missingFields = this.checkMissingFields(extractedData);
      
      // Prepare modal data
      this.unifiedModalData = {
        extractedFields: Object.keys(extractedData).filter(key => 
          (extractedData as any)[key] && (extractedData as any)[key] !== '' && key !== 'contacts'
        ),
        missingFields: missingFields.filter(f => f !== 'contacts'),
        contacts: (extractedData as any).contacts || []
      };
      
      // ✅ REMOVED - Now using database only
      this.originalExtractedData = { ...extractedData };

      // Initialize form with all data
      const formData: any = {
        firstName: extractedData.firstName || '',
        firstNameAR: extractedData.firstNameAR || '',
        tax: extractedData.tax || '',
        CustomerType: extractedData.CustomerType || '',
        ownerName: extractedData.ownerName || '',
        buildingNumber: extractedData.buildingNumber || '',
        street: extractedData.street || '',
        country: extractedData.country || '',
        city: extractedData.city || '',
        salesOrganization: extractedData.salesOrganization || '',
        distributionChannel: extractedData.distributionChannel || '',
        division: extractedData.division || ''
      };
      
      // ✅ Update country options if extracted country not in predefined list
      if (formData.country) {
        this.updateCountryOptions(formData.country);
      }
      
      // Patch form values
      this.unifiedModalForm.patchValue(formData);
      
      // Update city options if country is set
      if (formData.country) {
        this.updateCityOptions(formData.country);
      }
      
      // Start with extracted data as read-only
      this.extractedDataReadOnly = true;
      this.toggleExtractedDataEdit(false);
      
      // Debug form state after initialization
      console.log('🐛 [DEBUG] Form state after modal open:', {
        formValid: this.unifiedModalForm.valid,
        extractedFields: this.unifiedModalData.extractedFields,
        missingFields: this.unifiedModalData.missingFields,
        readOnlyState: this.extractedDataReadOnly,
        sampleFieldState: {
          firstName: {
            value: this.unifiedModalForm.get('firstName')?.value,
            disabled: this.unifiedModalForm.get('firstName')?.disabled,
            enabled: this.unifiedModalForm.get('firstName')?.enabled
          }
        }
      });
      
      // Clear and add contacts
      const contactsArray = this.unifiedModalForm.get('contacts') as FormArray;
      contactsArray.clear();
      
      if (this.unifiedModalData.contacts.length === 0) {
        this.addContactToUnifiedForm();
        } else {
        this.unifiedModalData.contacts.forEach((contact: any) => {
          const contactForm = this.fb.group({
            name: [contact.name || ''],
            jobTitle: [contact.jobTitle || ''],
            email: [contact.email || '', [Validators.email]],
            mobile: [contact.mobile || '', [Validators.pattern(/^\+?[0-9]{10,15}$/)]],
            landline: [contact.landline || '', Validators.pattern(/^\+?[0-9]{7,15}$/)],
            preferredLanguage: [contact.preferredLanguage || 'Arabic']
          });
          contactsArray.push(contactForm);
        });
      }
      
      // Show modal
      this.showUnifiedModal = true;
      this.cdr.detectChanges();
      // Attach keyboard listener directly to modal content
      this.attachModalKeyboardListener();
      
      console.log('✅ [UNIFIED] Modal opened with data:', this.unifiedModalData);
      
    } catch (error: any) {
      console.error('❌ [UNIFIED] Error opening modal:', error);
      this.addMessage({
        id: `unified_error_${Date.now()}`,
        role: 'assistant',
        content: this.translate.instant('agent.messages.genericError', { error: error.message }),
        timestamp: new Date(),
        type: 'text'
      });
    }
  }

  private updateCountryOptions(country: string): void {
    if (country) {
      // Check if extracted country exists in predefined list
      const countryExists = this.countryOptions.some((c: any) => 
        c.value === country || c.label === country || 
        (typeof c === 'string' && c === country)
      );
      
      // If extracted country not in predefined list, add it as a custom option
      if (!countryExists && country.trim() !== '') {
        console.log(`🌍 [COUNTRY] Adding custom country: "${country}"`);
        this.countryOptions = [
          { label: country, value: country },
          ...COUNTRY_OPTIONS
        ];
      } else {
        // Reset to original list
        this.countryOptions = COUNTRY_OPTIONS;
      }
    }
  }

  private updateCityOptions(country: string): void {
    if (country) {
      const cities = getCitiesByCountry(country);
      this.cityOptions = cities;
      
      // ✅ DON'T reset city if extracted from OCR - allow custom cities
      // Only reset if user manually changes country (not on initial load)
      const currentCity = this.unifiedModalForm.get('city')?.value;
      if (currentCity) {
        const cityExists = cities.some((c: any) => c.value === currentCity || c.label === currentCity);
        
        // If extracted city not in predefined list, add it as a custom option
        if (!cityExists && currentCity.trim() !== '') {
          console.log(`📍 [CITY] Adding custom city: "${currentCity}"`);
          this.cityOptions = [
            { label: currentCity, value: currentCity },
            ...cities
          ];
        }
      }
    } else {
      this.cityOptions = [];
    }
  }

  toggleExtractedDataEdit(enable: boolean): void {
    console.log('🔄 [TOGGLE] Toggling edit mode:', enable);
    this.extractedDataReadOnly = !enable;
    
    // Define all form fields
    const allFields = ['firstName', 'firstNameAR', 'tax', 'CustomerType', 'ownerName',
      'buildingNumber', 'street', 'country', 'city', 'salesOrganization', 
      'distributionChannel', 'division'];
      
    allFields.forEach(field => {
      const control = this.unifiedModalForm.get(field);
      if (!control) return;
      
      // If it's an extracted field - toggle based on edit mode
      if (this.unifiedModalData.extractedFields.includes(field)) {
        if (enable) {
          control.enable();
          console.log(`✅ [TOGGLE] Enabled extracted field: ${field}`);
        } else {
          control.disable();
          console.log(`🔒 [TOGGLE] Disabled extracted field: ${field}`);
        }
      }
      // If it's a missing field - always keep enabled
      else if (this.unifiedModalData.missingFields.includes(field)) {
        control.enable();
        console.log(`✏️ [TOGGLE] Missing field always enabled: ${field}`);
      }
    });
    
    // Force Angular change detection
    this.cdr.detectChanges();
    console.log('🔄 [TOGGLE] Toggle complete. ReadOnly state:', this.extractedDataReadOnly);
  }

  addContactToUnifiedForm(): void {
    const contactsArray = this.unifiedModalForm.get('contacts') as FormArray;
    const contactForm = this.fb.group({
      name: [''],
      jobTitle: [''],
      email: ['', [Validators.email]],
      mobile: ['', [Validators.pattern(/^\+?[0-9]{10,15}$/)]],
      landline: ['', Validators.pattern(/^\+?[0-9]{7,15}$/)],
      preferredLanguage: ['Arabic']
    });
    contactsArray.push(contactForm);
  }

  removeContactFromUnifiedForm(index: number): void {
    const contactsArray = this.unifiedModalForm.get('contacts') as FormArray;
    
    // ✅ Allow removing all contacts (contacts are optional)
    if (contactsArray && contactsArray.length > 0) {
      contactsArray.removeAt(index);
    }
  }

  saveUnifiedModal(): void {
    console.log('💾 [UNIFIED] Saving unified modal data');
    
    // Get form values (including disabled fields)
    const formData = this.unifiedModalForm.getRawValue();
    
    // Update extracted data with ALL form values
    Object.keys(formData).forEach(key => {
      if (key !== 'contacts') {
        const value = formData[key];
        if (value !== null && value !== undefined && value !== '') {
          this.agentService.updateExtractedDataField(key, value);
        }
      }
    });
    
    // Update contacts ONLY if provided (optional)
    const contacts = formData.contacts || [];
    const validContacts = contacts.filter((c: any) => c?.name || c?.email);
    if (validContacts.length > 0) {
      this.agentService.updateExtractedDataField('contacts', validContacts);
      this.contactsAdded = validContacts;
    }
    
    console.log('💾 [UNIFIED] Updated data:', this.agentService.getExtractedData());
    
    // Close modal
    this.showUnifiedModal = false;
    this.cdr.detectChanges();
    
    // Show success message
    this.addMessage({
      id: `unified_saved_${Date.now()}`,
      role: 'assistant',
      content: this.translate.instant('agent.messages.allDataSaved'),
      timestamp: new Date(),
      type: 'text'
    });
    
    // Reset flags
    this.awaitingDataReview = false;
    
    // Proceed to submission
    setTimeout(() => {
      this.finalizeAndSubmit();
    }, 1500);
  }

  // Unified modal document replacement flow
  triggerDocumentReplacement(): void {
    const fileInput = document.querySelector('#unifiedFileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  async onUnifiedDocumentSelected(event: any): Promise<void> {
    const files: FileList = event?.target?.files;
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    console.log('🔄 [UNIFIED] Replacing documents with:', newFiles.map(f => f.name));
    const warningMsg = this.translate.instant('agent.warnings.replaceDocuments');
    const userConfirmed = confirm(warningMsg);
    if (!userConfirmed) {
      event.target.value = '';
      return;
    }
    await this.reprocessDocumentsWithOCR(newFiles);
    event.target.value = '';
  }

  private async reprocessDocumentsWithOCR(files: File[]): Promise<void> {
    try {
      this.isReprocessingDocuments = true;
      this.cdr.detectChanges();
      console.log('🔄 [REPROCESS] Starting OCR reprocessing for', files.length, 'files');
      this.unifiedModalDocuments = files;
      // Reset progress indicators
      this.showMetadataExtractionProgress = false;
      this.metadataExtractionProgress = 0;
      this.metadataExtractionStatus = '';
      
      // Prepare metadata form for new files
      this.pendingFiles = files;
      this.showDocumentModal = true;
      this.documentMetadataForm = this.fb.group({
        documents: this.fb.array([])
      });
      const documentsArray = this.documentMetadataForm.get('documents') as FormArray;
      files.forEach(file => {
        const detectedInfo = this.detectDocumentInfo(file.name);
        
        // Get country from extracted data if not detected from filename
        let country = detectedInfo?.country || '';
        if (!country && this.unifiedModalForm) {
          country = this.unifiedModalForm.get('country')?.value || 'Saudi Arabia'; // Default fallback
        }
        
        const documentGroup = this.fb.group({
          name: [file.name],
          country: [country], // Removed Validators.required - will be in missing data if empty
          type: [detectedInfo?.type || '', Validators.required],
          description: [this.generateSmartDescription(file.name, detectedInfo)]
        });
        documentsArray.push(documentGroup);
      });
    } catch (error: any) {
      console.error('❌ [REPROCESS] Error:', error);
      this.isReprocessingDocuments = false;
      const errorMsg = this.translate.instant('agent.errors.reprocessingError');
      alert(errorMsg);
    }
  }

  private async processDocumentsForUnifiedModal(files: File[], metadata: any[]): Promise<void> {
    console.log('🔍 [DEBUG] processDocumentsForUnifiedModal() called');
    console.log('🔍 [DEBUG] Files count:', files.length);
    console.log('🔍 [DEBUG] Files names:', files.map(f => f.name));
    console.log('🔍 [DEBUG] Metadata:', metadata);
    
    try {
      console.log('🔄 [UNIFIED OCR] Processing new documents with OCR');
      console.log('🔍 [DEBUG] Calling agentService.uploadAndProcessDocuments()');
      
      const extractedData = await Promise.race([
        this.agentService.uploadAndProcessDocuments(files, metadata),
        new Promise<ExtractedData>((_, reject) => setTimeout(() => reject(new Error('Processing timeout')), 60000))
      ]);
      
      console.log('🔍 [DEBUG] OCR processing completed');
      console.log('✅ [UNIFIED OCR] New extracted data:', extractedData);
      
      // Check if documents are for different companies (using AI)
      console.log('🔍 [DEBUG] Checking for different companies using AI');
      const isDifferentCompany = await this.checkIfDifferentCompanies(extractedData);
      console.log('🔍 [DEBUG] isDifferentCompany result from AI:', isDifferentCompany);
      
      if (isDifferentCompany) {
        console.log('🔍 [DEBUG] Different companies detected, showing choice dialog');
        // Different companies detected - ask user to choose
        const currentCompanyName = this.unifiedModalForm?.get('firstName')?.value || 'Unknown';
        const currentCountry = this.unifiedModalForm?.get('country')?.value || 'Unknown';
        const newCompanyName = extractedData?.firstName || 'Unknown';
        const newCountry = extractedData?.country || 'Unknown';
        
        const choiceMsg = this.translate.instant('agent.confirmations.chooseCompany', {
          currentCompany: currentCompanyName,
          currentCountry: currentCountry,
          newCompany: newCompanyName,
          newCountry: newCountry
        });
        
        console.log('🔍 [DEBUG] Choice dialog message:', choiceMsg);
        console.log('🔍 [DEBUG] Showing confirm dialog for company choice');
        const keepCurrentCompany = confirm(choiceMsg);
        console.log('🔍 [DEBUG] User choice (keepCurrentCompany):', keepCurrentCompany);
        
        if (keepCurrentCompany) {
          // User chose to keep current company - discard new documents
          console.log('✅ [CHOICE] User chose to keep current company:', currentCompanyName);
          console.log('🔍 [DEBUG] Setting isReprocessingDocuments to false');
          this.isReprocessingDocuments = false;
          console.log('🔍 [DEBUG] Showing unified modal with existing data');
          this.showUnifiedModal = true;
          this.cdr.detectChanges();
          console.log('🔍 [DEBUG] Returning from processDocumentsForUnifiedModal (keep current)');
          return;
        } else {
          // User chose new company - clear old data and use new extraction
          console.log('✅ [CHOICE] User chose new company:', newCompanyName);
          console.log('🔍 [DEBUG] Clearing old form data');
          this.clearUnifiedFormData();
          console.log('🔍 [DEBUG] Updating form with new extracted data');
      this.updateUnifiedModalWithNewData(extractedData);
          console.log('🔍 [DEBUG] Setting uploaded files and documents');
      this.uploadedFiles = files;
      this.unifiedModalDocuments = files;
          console.log('🔍 [DEBUG] Setting isReprocessingDocuments to false');
      this.isReprocessingDocuments = false;
          
          // Show modal with new company data
          console.log('🔍 [DEBUG] Showing unified modal with new company data');
          this.showUnifiedModal = true;
      this.cdr.detectChanges();
          console.log('🔍 [DEBUG] Returning from processDocumentsForUnifiedModal (switch to new)');
          return;
        }
      }
      
      // Same company - update normally
      console.log('🔍 [DEBUG] Same company detected, updating normally');
      console.log('🔍 [DEBUG] Calling updateUnifiedModalWithNewData');
      this.updateUnifiedModalWithNewData(extractedData);
      console.log('🔍 [DEBUG] Setting uploaded files and documents');
      this.uploadedFiles = files;
      this.unifiedModalDocuments = files;
      console.log('🔍 [DEBUG] Setting isReprocessingDocuments to false');
      this.isReprocessingDocuments = false;
      
      // 🔧 FIX: Show unified modal automatically after re-extraction
      console.log('🔍 [DEBUG] Showing unified modal automatically');
      this.showUnifiedModal = true;
      
      console.log('🔍 [DEBUG] Triggering change detection');
      this.cdr.detectChanges();
      
      console.log('✅ [UNIFIED OCR] Documents reprocessed and modal opened');
    } catch (error: any) {
      console.error('❌ [UNIFIED OCR] Processing error:', error);
      this.isReprocessingDocuments = false;
      const errorMsg = this.translate.instant('agent.errors.reprocessingFailed');
      alert(errorMsg);
    }
  }

  private async checkIfDifferentCompanies(extractedData: any): Promise<boolean> {
    console.log('🔍 [AI COMPARISON] Starting intelligent company comparison using OpenAI');
    
    const currentCompanyName = this.unifiedModalForm?.get('firstName')?.value;
    const currentCompanyNameAr = this.unifiedModalForm?.get('firstNameAr')?.value;
    const currentTax = this.unifiedModalForm?.get('tax')?.value;
    const currentCountry = this.unifiedModalForm?.get('country')?.value;
    const currentCity = this.unifiedModalForm?.get('city')?.value;
    
    const newCompanyName = extractedData?.firstName;
    const newCompanyNameAr = extractedData?.firstNameAR;
    const newTax = extractedData?.tax;
    const newCountry = extractedData?.country;
    const newCity = extractedData?.city;
    
    console.log('🔍 [AI COMPARISON] Current company data:', { 
      name: currentCompanyName, 
      nameAr: currentCompanyNameAr,
      tax: currentTax, 
      country: currentCountry,
      city: currentCity 
    });
    console.log('🔍 [AI COMPARISON] New extracted data:', { 
      name: newCompanyName, 
      nameAr: newCompanyNameAr,
      tax: newTax, 
      country: newCountry,
      city: newCity 
    });
    
    // If no current company, it's the first extraction
    if (!currentCompanyName || currentCompanyName.trim() === '') {
      console.log('🔍 [AI COMPARISON] No current company - first extraction');
      return false;
    }
    
    // If no new company name extracted, can't determine
    if (!newCompanyName || newCompanyName.trim() === '') {
      console.log('🔍 [AI COMPARISON] No new company name extracted');
      return false;
    }
    
    // ✅ Use OpenAI to intelligently compare companies
    try {
      const comparisonResult = await this.intelligentCompanyComparison({
        current: {
          name: currentCompanyName,
          nameAr: currentCompanyNameAr,
          tax: currentTax,
          country: currentCountry,
          city: currentCity
        },
        new: {
          name: newCompanyName,
          nameAr: newCompanyNameAr,
          tax: newTax,
          country: newCountry,
          city: newCity
        }
      });
      
      console.log('🤖 [AI COMPARISON] OpenAI comparison result:', comparisonResult);
      
      if (comparisonResult.isDifferent) {
        console.warn('⚠️ [AI COMPARISON] Different companies detected by AI:', comparisonResult);
      } else {
        console.log('✅ [AI COMPARISON] Same company confirmed by AI:', comparisonResult);
      }
      
      return comparisonResult.isDifferent;
      
    } catch (error) {
      console.error('❌ [AI COMPARISON] OpenAI comparison failed, falling back to simple comparison:', error);
      
      // Fallback to simple string comparison if OpenAI fails
      const current = currentCompanyName.toLowerCase().trim();
      const newName = newCompanyName.toLowerCase().trim();
      const isDifferent = current !== newName && !current.includes(newName) && !newName.includes(current);
      
      console.log('🔄 [FALLBACK] Simple comparison result:', isDifferent);
      return isDifferent;
    }
  }

  private async analyzeAndCompareCompanies(extractedData: any, newFiles: File[]): Promise<void> {
    // Use AI to intelligently compare companies
    const isDifferentCompany = await this.checkIfDifferentCompanies(extractedData);
    
    if (isDifferentCompany) {
      // Different companies - show analysis and choice
      this.showDetailedCompanyAnalysis(extractedData, newFiles);
    } else {
      // Same company - add documents and merge data directly
      this.addDocumentsToSameCompany(extractedData, newFiles);
    }
  }

  private showDetailedCompanyAnalysis(extractedData: any, newFiles: File[]): void {
    const currentCompanyName = this.unifiedModalForm?.get('firstName')?.value || 'Unknown';
    const currentCountry = this.unifiedModalForm?.get('country')?.value || 'Unknown';
    const newCompanyName = extractedData?.firstName || 'Unknown';
    const newCountry = extractedData?.country || 'Unknown';
    
    // Analyze differences
    const differences = [];
    if (currentCompanyName !== newCompanyName) {
      differences.push(`Company Name: "${currentCompanyName}" vs "${newCompanyName}"`);
    }
    if (currentCountry !== newCountry) {
      differences.push(`Country: "${currentCountry}" vs "${newCountry}"`);
    }
    
    const analysisMessage = `🔍 **Company Analysis Results**

⚠️ **Different Companies Detected!**

**Current Company:** ${currentCompanyName} (${currentCountry})
**New Document Company:** ${newCompanyName} (${newCountry})

**Key Differences Found:**
${differences.map(diff => `• ${diff}`).join('\n')}

**Analysis:** The uploaded documents appear to belong to a different company based on the extracted information.

Would you like to:
1. **Continue with both companies** (keep old + new documents)
2. **Switch to new company** (replace with new documents)
3. **Keep current company** (discard new documents)`;

    this.addMessage({
      id: `company_analysis_${Date.now()}`,
      role: 'assistant',
      content: analysisMessage,
      timestamp: new Date(),
      type: 'confirmation',
      data: {
        buttons: [
          { 
            text: `✅ Continue with Both Companies`, 
            action: 'continue_both_companies',
            data: { extractedData, newFiles }
          },
          { 
            text: `🔄 Switch to New Company (${newCompanyName})`, 
            action: 'switch_to_new_company',
            data: { extractedData, newFiles }
          },
          { 
            text: `📄 Keep Current Company (${currentCompanyName})`, 
            action: 'keep_current_company',
            data: { newFiles }
          }
        ]
      }
    });
  }

  private async addDocumentsToSameCompany(extractedData: any, newFiles: File[]): Promise<void> {
    console.log('✅ [NEW FLOW] Same company - adding documents');
    
    // ✅ Smart deduplication: compare by content hash (not just name)
    const uniqueNewFiles: File[] = [];
    
    for (const newFile of newFiles) {
      const newFileHash = await this.calculateFileHash(newFile);
      let isDuplicate = false;
      
      // Check against existing files
      for (const existingFile of this.uploadedFiles) {
        const existingFileHash = await this.calculateFileHash(existingFile);
        
        if (newFileHash === existingFileHash) {
          console.log('🔍 [DEDUPLICATION] Exact duplicate found (same content):', {
            newFile: newFile.name,
            existingFile: existingFile.name,
            hash: newFileHash
          });
          isDuplicate = true;
          break;
        } else if (newFile.name === existingFile.name) {
          // Same name but different content - ask user
          console.log('⚠️ [DEDUPLICATION] Same name, different content:', {
            file: newFile.name,
            newHash: newFileHash,
            existingHash: existingFileHash
          });
          
          const message = await this.translate.get('agent.warnings.replaceDocument', {
            fileName: newFile.name
          }).toPromise();
          
          const userConfirmed = confirm(message || `Document "${newFile.name}" already exists with different content. Replace it?`);
          
          if (userConfirmed) {
            // Remove old file and add new one
            this.uploadedFiles = this.uploadedFiles.filter(f => f.name !== existingFile.name);
            console.log('✅ [DEDUPLICATION] User confirmed replacement');
          } else {
            console.log('❌ [DEDUPLICATION] User cancelled replacement');
            isDuplicate = true;
          }
          break;
        }
      }
      
      if (!isDuplicate) {
        uniqueNewFiles.push(newFile);
      }
    }
    
    console.log('📄 [DEDUPLICATION] Smart filtering results:', {
      existingCount: this.uploadedFiles.length,
      newCount: newFiles.length,
      uniqueNewCount: uniqueNewFiles.length,
      uniqueNewNames: uniqueNewFiles.map(f => f.name)
    });
    
    // Add only unique new files to existing files
    this.uploadedFiles = [...this.uploadedFiles, ...uniqueNewFiles];
    this.unifiedModalDocuments = [...this.unifiedModalDocuments, ...uniqueNewFiles];
    
    // Merge extracted data (keep existing, add new fields if missing)
    this.mergeExtractedData(extractedData);
    
    // Show success message
    if (uniqueNewFiles.length > 0) {
      this.addMessage({
        id: `addition_success_${Date.now()}`,
        role: 'assistant',
        content: `✅ Documents added successfully!\n\n📄 Added: ${uniqueNewFiles.map(f => f.name).join(', ')}\n\nTotal documents: ${this.uploadedFiles.length}`,
        timestamp: new Date(),
        type: 'text'
      });
    } else {
      this.addMessage({
        id: `no_new_docs_${Date.now()}`,
        role: 'assistant',
        content: `ℹ️ No new documents added (all were duplicates or replacements were cancelled)`,
        timestamp: new Date(),
        type: 'text'
      });
    }
    
    // Show unified modal with updated data
    this.showUnifiedModal = true;
    this.cdr.detectChanges();
  }
  
  // ✅ Calculate SHA-256 hash for file content
  private async calculateFileHash(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (error) {
      console.error('❌ Error calculating file hash:', error);
      // Fallback: use file name + size as identifier
      return `${file.name}_${file.size}`;
    }
  }

  private mergeExtractedData(newData: any): void {
    // Merge new data with existing data, prioritizing existing data
    const existingData = this.agentService.getExtractedData();
    
    // Only update fields that are empty in existing data
    Object.keys(newData).forEach(key => {
      if (newData[key] && (!(existingData as any)[key] || (existingData as any)[key] === '')) {
        this.agentService.updateExtractedDataField(key, newData[key]);
      }
    });
    
    // Update the form with merged data
    this.updateUnifiedModalWithNewData(this.agentService.getExtractedData());
  }

  private async processNewDocumentsInModal(newFiles: File[]): Promise<void> {
    console.log('📄 [MODAL] Processing new documents in modal:', newFiles.map(f => f.name));
    
    try {
      // Add processing message to chat
      const fileNames = newFiles.map(f => f.name).join(', ');
      this.addMessage({
        id: `modal_upload_${Date.now()}`,
        role: 'user',
        content: `📤 Added ${newFiles.length} document(s) to existing data: ${fileNames}`,
        timestamp: new Date(),
        type: 'text'
      });

      const progressMessage = this.addMessage({
        id: `modal_progress_${Date.now()}`,
        role: 'assistant',
        content: `🤖 Processing additional documents...

⚡ Extracting and merging data...`,
        timestamp: new Date(),
        type: 'loading'
      });
      
      // Process new documents with OCR
      const extractedData = await this.agentService.uploadAndProcessDocuments(newFiles);
      console.log('🔍 [MODAL] New documents processed, extracted data:', extractedData);
      
      // Remove loading message
      this.messages = this.messages.filter(m => m.id !== progressMessage.id);
      
      // Merge new data with existing data (fill missing fields)
      this.mergeNewDataWithExisting(extractedData);
      
      // Add new files to existing files
      this.uploadedFiles = [...this.uploadedFiles, ...newFiles];
      this.unifiedModalDocuments = [...this.unifiedModalDocuments, ...newFiles];
      
      // Show success message
      this.addMessage({
        id: `modal_success_${Date.now()}`,
        role: 'assistant',
        content: `✅ Documents processed and data merged!\n\n📄 Total documents: ${this.uploadedFiles.length}\n\nMissing fields have been filled from new documents.`,
        timestamp: new Date(),
        type: 'text'
      });
      
      // Update the form with merged data
      this.updateUnifiedModalWithNewData(this.agentService.getExtractedData());
      
    } catch (error: any) {
      console.error('❌ [MODAL] Document processing error:', error);
      
      // ✅ Check if we have partial extracted data from the new documents
      const extractedData = this.agentService.getExtractedData();
      const requiredFields = [
        'firstName', 'firstNameAR', 'tax', 'CustomerType', 
        'ownerName', 'buildingNumber', 'street', 'country', 
        'city', 'salesOrganization', 'distributionChannel', 'division'
      ];
      
      const extractedFieldsCount = requiredFields.filter(field => {
        const value = (extractedData as any)?.[field];
        return value && value.toString().trim() !== '';
      }).length;
      
      console.log('🔍 [MODAL ERROR RECOVERY] Extracted fields count:', extractedFieldsCount);
      
      // ✅ If we extracted 8+ fields (66%+), consider it successful even if there was an error
      if (extractedFieldsCount >= 8) {
        console.log('✅ [MODAL ERROR RECOVERY] Extracted enough fields, treating as success');
        
        this.addMessage({
          id: `modal_partial_success_${Date.now()}`,
          role: 'assistant',
          content: `✅ تم استخراج معظم البيانات بنجاح!\nMost data extracted successfully!\n\n📊 تم استخراج ${extractedFieldsCount} من ${requiredFields.length} حقل\nExtracted ${extractedFieldsCount} out of ${requiredFields.length} fields`,
          timestamp: new Date(),
          type: 'text'
        });
        
        // Merge and update the form
        this.mergeNewDataWithExisting(extractedData);
        this.updateUnifiedModalWithNewData(extractedData);
        return;
      }
      
      // ✅ If less than 8 fields extracted, show error message
      // Check if it's a CORS or network error
      const isCorsOrNetworkError = 
        error?.status === 0 || 
        error?.message?.includes('CORS') ||
        error?.message?.includes('timeout') ||
        error?.message?.includes('Network') ||
        error?.name === 'HttpErrorResponse';
      
      const errorMessage = isCorsOrNetworkError
        ? `❌ حدث خطأ في التواصل مع نموذج الذكاء الاصطناعي\nAI communication error occurred\n\n🌐 يرجى التحقق من اتصال الإنترنت\nPlease check your internet connection\n\n💡 يرجى المحاولة مرة أخرى\nPlease try again later`
        : `❌ فشلت معالجة المستندات الإضافية. يرجى المحاولة مرة أخرى.\nFailed to process additional documents. Please try again.`;
      
      this.addMessage({
        id: `modal_error_${Date.now()}`,
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
        type: 'text'
      });
    }
  }

  private mergeNewDataWithExisting(newData: any): void {
    console.log('🔄 [MODAL] Merging new data with existing data');
    
    const existingData = this.agentService.getExtractedData();
    
    // Only update fields that are empty in existing data
    Object.keys(newData).forEach(key => {
      if (newData[key] && (!(existingData as any)[key] || (existingData as any)[key] === '')) {
        console.log(`🔄 [MODAL] Filling missing field: ${key} = ${newData[key]}`);
        this.agentService.updateExtractedDataField(key, newData[key]);
      }
    });
    
    // Update missing fields list
    this.refreshMissingFieldsList();
  }

  private refreshMissingFieldsList(): void {
    const extractedData = this.agentService.getExtractedData();
    const allFields = ['firstName', 'firstNameAR', 'tax', 'CustomerType', 'country', 'city', 'buildingNumber', 'street', 'SalesOrgOption', 'DistributionChannelOption', 'DivisionOption'];
    
    this.unifiedModalData.missingFields = allFields.filter(field => {
      const value = (extractedData as any)[field];
      return !value || value === '' || value === null || value === undefined;
    });
    
    console.log('🔍 [MISSING] Updated missing fields:', this.unifiedModalData.missingFields);
  }

  private handleBothCompaniesChoice(extractedData: any, newFiles: File[]): void {
    console.log('🔄 [NEW FLOW] Handling both companies choice');
    
    // Add new files to existing files
    this.uploadedFiles = [...this.uploadedFiles, ...newFiles];
    this.unifiedModalDocuments = [...this.unifiedModalDocuments, ...newFiles];
    
    // Merge extracted data (keep existing, add new fields if missing)
    this.mergeExtractedData(extractedData);
    
    // Show success message
    this.addMessage({
      id: `both_companies_success_${Date.now()}`,
      role: 'assistant',
      content: `✅ Both companies merged successfully!\n\n📄 Total documents: ${this.uploadedFiles.length}\n\nData from both documents has been combined.`,
      timestamp: new Date(),
      type: 'text'
    });
    
    // Show unified modal with merged data
    this.showUnifiedModal = true;
    this.cdr.detectChanges();
  }

  private updateUnifiedModalWithNewData(newExtractedData: any): void {
    console.log('🤖 [AI] OpenAI intelligently filled form fields based on document + existing data');
    console.log('📝 [UNIFIED] Applying OpenAI-generated form data:', newExtractedData);
    
    // ✅ OpenAI has already decided which fields to fill/update based on:
    // 1. Document content
    // 2. Existing form data
    // 3. Smart merging logic
    // 4. Confidence scores (anti-hallucination)
    
    // ✅ Check overall confidence and warn user if low
    if (newExtractedData.confidence && newExtractedData.confidence.overall) {
      const overallConfidence = newExtractedData.confidence.overall;
      console.log(`🎯 [Anti-Hallucination] Overall extraction confidence: ${(overallConfidence * 100).toFixed(1)}%`);
      
      if (overallConfidence < 0.7) {
        console.warn(`⚠️ [Anti-Hallucination] Low confidence extraction - some data may be missing or unclear`);
        
        // Show warning message to user
        this.addMessage({
          id: `confidence_warning_${Date.now()}`,
          role: 'assistant',
          content: `⚠️ **Data Quality Notice**\n\nThe document quality was not optimal. Confidence: ${(overallConfidence * 100).toFixed(0)}%\n\nPlease review the extracted data carefully and fill any missing fields manually.\n\n✅ Only high-confidence data was extracted to prevent errors.`,
          timestamp: new Date(),
          type: 'text'
        });
      } else {
        console.log(`✅ [Anti-Hallucination] High confidence extraction - data is reliable`);
      }
    }
    
    Object.keys(newExtractedData).forEach(key => {
      if (newExtractedData[key] !== null && newExtractedData[key] !== undefined && key !== 'confidence' && key !== 'dataSource') {
        this.agentService.updateExtractedDataField(key, newExtractedData[key]);
      }
    });
    const allRequiredFields = [
      'firstName', 'firstNameAR', 'tax', 'CustomerType', 'ownerName',
      'buildingNumber', 'street', 'country', 'city',
      'salesOrganization', 'distributionChannel', 'division'
    ];
    const newExtractedFields = allRequiredFields.filter(field => {
      const value = newExtractedData[field];
      return value && value.toString().trim() !== '';
    });
    const newMissingFields = allRequiredFields.filter(field => {
      const value = newExtractedData[field];
      return !value || value.toString().trim() === '';
    });
    this.unifiedModalData.extractedFields = newExtractedFields;
    this.unifiedModalData.missingFields = newMissingFields;
    
    // Update main form fields
    const formData = {
      firstName: newExtractedData.firstName || '',
      firstNameAR: newExtractedData.firstNameAR || '',
      tax: newExtractedData.tax || '',
      CustomerType: newExtractedData.CustomerType || '',
      ownerName: newExtractedData.ownerName || '',
      buildingNumber: newExtractedData.buildingNumber || '',
      street: newExtractedData.street || '',
      country: newExtractedData.country || '',
      city: newExtractedData.city || '',
      salesOrganization: newExtractedData.salesOrganization || '',
      distributionChannel: newExtractedData.distributionChannel || '',
      division: newExtractedData.division || ''
    } as any;
    this.unifiedModalForm.patchValue(formData);
    
    // Update contacts if present in extracted data
    if (newExtractedData.contacts && Array.isArray(newExtractedData.contacts)) {
      const contactsArray = this.unifiedModalForm.get('contacts') as FormArray;
      
      // Clear existing contacts
      while (contactsArray.length !== 0) {
        contactsArray.removeAt(0);
      }
      
      // Add new extracted contacts
      newExtractedData.contacts.forEach((contact: any) => {
        this.addContactToUnifiedForm();
        const idx = contactsArray.length - 1;
        contactsArray.at(idx).patchValue({
          name: contact.name || '',
          jobTitle: contact.jobTitle || '',
          email: contact.email || '',
          mobile: contact.mobile || '',
          landline: contact.landline || '',
          preferredLanguage: contact.preferredLanguage || 'Arabic'
        });
      });
    }
    
    if (formData.country) {
      this.updateCityOptions(formData.country);
    }
    
    // 🔧 FIX: Update currentDemoCompany after extraction to match new company
    if (newExtractedData.firstName) {
      const foundCompany = this.demoDataGenerator.findCompanyByName(newExtractedData.firstName);
      if (foundCompany) {
        this.currentDemoCompany = foundCompany;
        console.log('✅ [UNIFIED] Updated currentDemoCompany to:', foundCompany.name);
      } else {
        // Reset if company not found in pool
        this.currentDemoCompany = null;
        console.log('⚠️ [UNIFIED] Company not found in demo pool, reset currentDemoCompany');
      }
    }
    
    this.toggleExtractedDataEdit(false);
    this.cdr.detectChanges();
    console.log('✅ [UNIFIED] Form updated with new OCR data including contacts');
  }

  saveDocuments(): void {
    console.log('🔍 [DEBUG] saveDocuments() called');
    console.log('🔍 [DEBUG] isReprocessingDocuments:', this.isReprocessingDocuments);
    console.log('🔍 [DEBUG] documentMetadataForm exists:', !!this.documentMetadataForm);
    console.log('🔍 [DEBUG] documentMetadataForm valid:', this.documentMetadataForm?.valid);
    console.log('🔍 [DEBUG] pendingFiles count:', this.pendingFiles?.length);
    
    if (this.documentMetadataForm.valid) {
      console.log('🔍 [DEBUG] Form is valid, proceeding');
      const filesToProcess = [...this.pendingFiles];
      console.log('🔍 [DEBUG] Files to process:', filesToProcess.map(f => f.name));
      
      const metadata = this.documentsFA.controls.map((control, index) => {
        const meta = {
        country: control.get('country')?.value,
        type: control.get('type')?.value,
        description: control.get('description')?.value
        };
        console.log(`🔍 [DEBUG] Metadata for file ${index + 1}:`, meta);
        return meta;
      });
      
      console.log('🔍 [DEBUG] All metadata:', metadata);
      console.log('🔍 [DEBUG] Closing document modal');
      this.closeDocumentModal();
      
      if (this.isReprocessingDocuments) {
        console.log('🔍 [DEBUG] Calling processDocumentsForUnifiedModal()');
        this.processDocumentsForUnifiedModal(filesToProcess, metadata);
      } else {
        console.log('🔍 [DEBUG] Calling processDocumentsWithMetadata()');
        this.processDocumentsWithMetadata(filesToProcess, metadata);
      }
    } else {
      console.warn('⚠️ [DEBUG] saveDocuments() blocked due to invalid form');
      console.warn('🔍 [DEBUG] Form errors:', this.documentMetadataForm?.errors);
      console.warn('🔍 [DEBUG] FormArray errors:', this.documentsFA?.errors);
      this.documentsFA.controls.forEach((control, index) => {
        if (!control.valid) {
          console.warn(`🔍 [DEBUG] Invalid control ${index}:`, control.errors);
        }
      });
    }
  }

  removeDocumentFromUnified(index: number): void {
    const confirmMsg = this.translate.instant('agent.confirmations.deleteDocument');
    if (confirm(confirmMsg)) {
      this.unifiedModalDocuments.splice(index, 1);
      this.uploadedFiles.splice(index, 1);
      this.cdr.detectChanges();
    }
  }

  get unifiedContactsArray(): FormArray {
    return this.unifiedModalForm.get('contacts') as FormArray;
  }

  // Helper method to check if field is missing
  isFieldMissing(field: string): boolean {
    return this.unifiedModalData.missingFields.includes(field);
  }

  // Helper method to check if field was extracted
  isFieldExtracted(field: string): boolean {
    return this.unifiedModalData.extractedFields.some((item: any) => item.field === field);
  }

  // ✅ NEW: Helper method to check if sales field is optional (not missing)
  isSalesFieldOptional(field: string): boolean {
    const salesFields = ['salesOrganization', 'distributionChannel', 'division'];
    if (!salesFields.includes(field)) return false;
    
    // Check if sales field has value (optional if filled, missing if empty)
    const extractedField = this.unifiedModalData.extractedFields.find((item: any) => item.field === field);
    return extractedField && extractedField.value && extractedField.value.trim() !== '';
  }

  // ====== Document Preview & Download (From new-request.component.ts) ======

  /**
   * Check if document can be previewed
   */
  canPreview(doc: any): boolean {
    const documentData = doc.value || doc;
    if (!documentData || !documentData.mime) return false;
    
    const mime = documentData.mime.toLowerCase();
    return mime === 'application/pdf' || 
           mime.startsWith('image/');
  }

  /**
   * Check if document is PDF
   */
  isPdf(doc: any): boolean {
    const documentData = doc.value || doc;
    return documentData?.mime?.toLowerCase() === 'application/pdf';
  }

  /**
   * Check if document is an image
   */
  isImage(doc: any): boolean {
    const documentData = doc.value || doc;
    return documentData?.mime?.toLowerCase().startsWith('image/');
  }

  /**
   * Opens document preview modal
   */
  previewDocument(doc: any): void {
    const documentData = doc.value || doc;
    
    console.log('=== PREVIEW DOCUMENT ===');
    console.log('Document data:', documentData);
    console.log('MIME type:', documentData?.mime);

    if (!documentData || !documentData.contentBase64) {
      console.error('❌ Document data or content missing');
      return;
    }

    this.currentPreviewDocument = documentData;

    // Determine document type
    const mime = documentData.mime?.toLowerCase() || '';
    
    if (mime === 'application/pdf') {
      this.previewDocumentType = 'pdf';
      // For PDF: use data URL directly
      this.previewDocumentUrl = documentData.contentBase64.startsWith('data:') 
        ? documentData.contentBase64 
        : `data:application/pdf;base64,${documentData.contentBase64}`;
    } else if (mime.startsWith('image/')) {
      this.previewDocumentType = 'image';
      // For Image: use data URL directly
      this.previewDocumentUrl = documentData.contentBase64.startsWith('data:') 
        ? documentData.contentBase64 
        : `data:${mime};base64,${documentData.contentBase64}`;
    } else {
      this.previewDocumentType = 'other';
      this.previewDocumentUrl = null;
      console.warn('⚠️ Unsupported file type for preview:', mime);
      return;
    }

    console.log('✅ Preview URL created:', this.previewDocumentUrl?.substring(0, 50) + '...');
    console.log('✅ Preview type:', this.previewDocumentType);

    // Show modal
    this.showDocumentPreviewModal = true;
    this.cdr.detectChanges();
  }

  /**
   * Handles document click - preview for supported types, download for others
   */
  handleDocumentClick(doc: any): void {
    const docData = doc.value || doc;
    
    console.log('=== HANDLE DOCUMENT CLICK ===');
    console.log('Raw doc:', doc);
    console.log('Doc data:', docData);
    console.log('MIME:', docData.mime);
    console.log('Can preview:', this.canPreview(docData));
    
    if (this.canPreview(docData)) {
      this.previewDocument(docData);
    } else {
      this.downloadDocument(docData);
    }
  }

  /**
   * Download document
   */
  downloadDocument(doc: any): void {
    try {
      const documentData = doc.value || doc;
      
      if (!documentData || !documentData.contentBase64) {
        console.error('❌ Cannot download: missing document data');
        return;
      }

      console.log('📥 Downloading document:', documentData.name);

      // Extract base64 content (remove data URL prefix if present)
      let base64Content = documentData.contentBase64;
      if (base64Content.includes(',')) {
        base64Content = base64Content.split(',')[1];
      }

      // Convert base64 to blob
      const byteCharacters = atob(base64Content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: documentData.mime || 'application/octet-stream' });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = documentData.name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ Download triggered:', documentData.name);
    } catch (error) {
      console.error('❌ Download error:', error);
    }
  }

  /**
   * Close document preview modal
   */
  closeDocumentPreview(): void {
    this.showDocumentPreviewModal = false;
    this.previewDocumentUrl = null;
    this.currentPreviewDocument = null;
    this.cdr.detectChanges();
  }

  /**
   * Get documents count
   */
  getDocumentsCount(): number {
    const serviceDocuments = this.agentService.getDocuments();
    if (serviceDocuments && serviceDocuments.length > 0) {
      return serviceDocuments.length;
    }
    return this.uploadedFiles?.length || 0;
  }

  /**
   * Get documents list for display - ✅ NOW USING DATABASE ONLY
   */
  getDocumentsList(): any[] {
    console.log('🔍 [DB DOCUMENTS] getDocumentsList() called');
    console.log('🔍 [DB DOCUMENTS] Current company ID:', this.currentCompanyId);
    
    // ✅ If no current company, return empty (fresh start)
    if (!this.currentCompanyId) {
      console.log('⚠️ [DB DOCUMENTS] No current company - returning empty array');
      return [];
    }
    
    // ✅ Get documents from database synchronously using cached data
    // Note: This will be updated by showUnifiedModalFromDatabase()
    const cachedDocs = this.unifiedModalData.documents || [];
    
    console.log(`📄 [DB DOCUMENTS] Cached documents from last DB load: ${cachedDocs.length}`);
    
    if (cachedDocs.length > 0) {
      console.log(`📄 [DB DOCUMENTS] Document names:`, cachedDocs.map((d: any) => d.value?.name || d.name));
      return cachedDocs;
    }
    
    console.log('⚠️ [DB DOCUMENTS] No cached documents - modal will load from DB');
    return [];
  }
  
  /**
   * Get MIME type from document name and type
   */
  private getMimeType(name: string, type?: string): string {
    const ext = name.split('.').pop()?.toLowerCase();
    
    // Check by extension
    if (ext === 'pdf') return 'application/pdf';
    if (['jpg', 'jpeg'].includes(ext!)) return 'image/jpeg';
    if (ext === 'png') return 'image/png';
    if (ext === 'gif') return 'image/gif';
    if (ext === 'webp') return 'image/webp';
    
    // Check by type
    if (type?.toLowerCase().includes('pdf')) return 'application/pdf';
    if (type?.toLowerCase().includes('image')) return 'image/jpeg';
    
    return 'application/octet-stream';
  }

  /**
   * Get document type label
   */
  getDocumentType(file: any): string {
    const type = file.type || file.mime || '';
    if (type.includes('pdf')) return 'PDF Document';
    if (type.includes('image')) return 'Image';
    if (type.includes('word')) return 'Word Document';
    if (type.includes('excel')) return 'Excel Document';
    return 'Document';
  }

  /**
   * Get document type label (Commercial Registration, Tax Card, etc.)
   */
  getDocumentTypeLabel(doc: any): string {
    if (!doc) return 'Unknown';
    
    const metadata = this.agentService.getDocumentMetadata();
    if (metadata && metadata.length > 0) {
      // Try to find metadata for this document
      const docIndex = this.agentService.getDocuments().findIndex(d => d.id === doc.id || d.name === doc.name);
      if (docIndex >= 0 && metadata[docIndex]) {
        const typeKey = metadata[docIndex].type;
        const translatedType = this.translate.instant(`agent.documentTypes.${typeKey}`);
        return translatedType !== `agent.documentTypes.${typeKey}` ? translatedType : this.formatDocumentType(typeKey);
      }
    }
    
    // Fallback: Try to detect from filename
    const name = (doc.name || '').toLowerCase();
    if (name.includes('commercial') || name.includes('تجاري')) return 'Commercial Registration';
    if (name.includes('tax') || name.includes('ضريب')) return 'Tax Card';
    if (name.includes('vat') || name.includes('قيمة')) return 'VAT Certificate';
    if (name.includes('license') || name.includes('رخصة')) return 'Business License';
    
    return 'General Document';
  }

  /**
   * Format document type key to readable label
   */
  private formatDocumentType(typeKey: string): string {
    // Convert camelCase or snake_case to readable format
    return typeKey
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Track by index for ngFor
   */
  trackByIndex(index: number): number {
    return index;
  }

  // ====== Contact Modal Methods (Table Design) ======

  /**
   * Check if contact has valid data (no null/empty required fields)
   */
  isValidContact(contact: any): boolean {
    const name = contact.get('name')?.value;
    const jobTitle = contact.get('jobTitle')?.value;
    const email = contact.get('email')?.value;
    const mobile = contact.get('mobile')?.value;
    
    return !!(name && jobTitle && email && mobile);
  }

  /**
   * Get count of valid contacts (excluding empty/null ones)
   */
  getValidContactsCount(): number {
    return this.unifiedContactsArray.controls.filter(contact => this.isValidContact(contact)).length;
  }

  /**
   * Open modal to add new contact
   */
  openAddContactModal(): void {
    this.isEditingContact = false;
    this.editingContactIndex = -1;
    this.contactModalTitle = this.translate.instant('agent.contact.addTitle');
    this.contactModalForm.reset({
      name: '',
      jobTitle: '',
      email: '',
      mobile: '',
      landline: '',
      preferredLanguage: 'Arabic'
    });
    this.showContactModal = true;
    
    // Enable demo data generation in modal
    this.setupModalDemoDataListener();
    
    this.cdr.detectChanges();
  }

  /**
   * Setup demo data generation for modal (Double Space)
   */
  private setupModalDemoDataListener(): void {
    // Remove any existing listener
    if (this.modalKeyboardListener) {
      try {
        const modalContent = document.querySelector('.contact-modal .ant-modal-content');
        if (modalContent) {
          modalContent.removeEventListener('keydown', this.modalKeyboardListener as any);
        }
      } catch {}
    }

    // Add new listener
    setTimeout(() => {
      const modalContent = document.querySelector('.contact-modal .ant-modal-content');
      if (modalContent) {
        this.modalKeyboardListener = (event: KeyboardEvent) => {
          if (event.code === 'Space') {
            const now = Date.now();
            if (now - this.lastSpaceTime < 500) {
              this.spaceClickCount++;
              if (this.spaceClickCount >= 2) {
                this.generateDemoContactData();
                this.spaceClickCount = 0;
              }
            } else {
              this.spaceClickCount = 1;
            }
            this.lastSpaceTime = now;
          }
        };
        modalContent.addEventListener('keydown', this.modalKeyboardListener as any);
      }
    }, 300);
  }

  /**
   * Detect customer type from legal form or company name
   */
  private detectCustomerType(legalForm: string, companyName: string): string {
    const text = `${legalForm} ${companyName}`.toLowerCase();
    
    // Match against CUSTOMER_TYPE_OPTIONS values
    if (text.includes('joint stock') || text.includes('public company') || text.includes('plc')) {
      return 'joint_stock';
    }
    if (text.includes('limited liability') || text.includes('llc') || text.includes('l.l.c')) {
      return 'limited_liability';
    }
    if (text.includes('sole proprietor') || text.includes('individual') || text.includes('establishment')) {
      return 'sole_proprietorship';
    }
    if (text.includes('sme') || text.includes('small') || text.includes('medium')) {
      return 'SME';
    }
    if (text.includes('retail chain') || text.includes('chain')) {
      return 'Retail Chain';
    }
    if (text.includes('corporate') || text.includes('corporation') || text.includes('company')) {
      return 'Corporate';
    }
    
    // Default fallback
    return 'Corporate';
  }

  /**
   * Generate fallback static contacts for companies not in demo pool
   */
  private generateFallbackStaticContacts(companyName: string, country: string, count: number): any[] {
    // Get country-specific data
    const countryData = this.getCountryDataForContacts(country);
    
    // Generate email domain from company name
    const cleanName = companyName
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 15);
    
    const emailDomain = `${cleanName}.com.${countryData.extension}`;
    
    // Generate seed from company name for consistency
    const seed = this.hashStringForContacts(companyName);
    
    const jobTitles = [
      "Chief Executive Officer",
      "Operations Manager",
      "Sales Manager", 
      "Finance Manager",
      "Marketing Director",
      "Procurement Manager",
      "Quality Control Manager",
      "Supply Chain Director",
      "Production Manager",
      "Logistics Manager"
    ];
    
    const contacts = [];
    
    for (let i = 0; i < count; i++) {
      const contactSeed = seed + (i * 1000);
      
      const firstNameIndex = contactSeed % countryData.firstNames.length;
      const lastNameIndex = (contactSeed >> 4) % countryData.lastNames.length;
      const jobTitleIndex = (contactSeed >> 8) % jobTitles.length;
      
      const firstName = countryData.firstNames[firstNameIndex];
      const lastName = countryData.lastNames[lastNameIndex];
      const jobTitle = jobTitles[jobTitleIndex];
      
      // Generate consistent phone numbers
      const mobileBase = countryData.phoneFormat.mobile.replace(/X/g, '');
      const mobileSuffix = (contactSeed % 1000000000).toString().padStart(9, '0');
      const mobile = mobileBase + mobileSuffix;
      
      const landlineBase = countryData.phoneFormat.landline.replace(/X/g, '');
      const landlineSuffix = ((contactSeed >> 2) % 1000000000).toString().padStart(9, '0');
      const landline = landlineBase + landlineSuffix;
      
      contacts.push({
        name: `${firstName} ${lastName}`,
        jobTitle: jobTitle,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace('al-', '')}@${emailDomain}`,
        mobile: mobile,
        landline: landline,
        preferredLanguage: i % 2 === 0 ? "Arabic" : "English"
      });
    }
    
    return contacts;
  }
  
  /**
   * Hash string for contacts (simple hash function)
   */
  private hashStringForContacts(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  
  /**
   * Get country-specific data for contact generation
   */
  private getCountryDataForContacts(country: string): any {
    const countryData: { [key: string]: any } = {
      'Saudi Arabia': {
        firstNames: ["Ahmed", "Mohammed", "Omar", "Khalid", "Saud", "Fahad", "Abdullah", "Yousef"],
        lastNames: ["Al-Rashid", "Al-Shehri", "Al-Mansouri", "Al-Zahrani", "Al-Dosari", "Al-Mutairi"],
        phoneFormat: { mobile: "+9665", landline: "+9661" },
        extension: "sa"
      },
      'Egypt': {
        firstNames: ["Ahmed", "Mohammed", "Omar", "Hassan", "Mahmoud", "Youssef"],
        lastNames: ["Hassan", "Ali", "Zaki", "Mansour", "Fahmy", "Ismail"],
        phoneFormat: { mobile: "+201", landline: "+202" },
        extension: "eg"
      },
      'United Arab Emirates': {
        firstNames: ["Ahmed", "Mohammed", "Omar", "Rashid", "Salem", "Hamdan"],
        lastNames: ["Al-Maktoum", "Al-Nahyan", "Al-Qassimi", "Al-Sharqi", "Al-Mualla"],
        phoneFormat: { mobile: "+9715", landline: "+9714" },
        extension: "ae"
      },
      'Yemen': {
        firstNames: ["Ahmed", "Mohammed", "Ali", "Abdullah", "Saleh"],
        lastNames: ["Al-Houthi", "Al-Saleh", "Al-Yamani", "Al-Hadrami"],
        phoneFormat: { mobile: "+9677", landline: "+9671" },
        extension: "ye"
      },
      'Oman': {
        firstNames: ["Ahmed", "Mohammed", "Khalid", "Said", "Hamad"],
        lastNames: ["Al-Habsi", "Al-Lawati", "Al-Balushi", "Al-Maamari"],
        phoneFormat: { mobile: "+9689", landline: "+9682" },
        extension: "om"
      },
      'Kuwait': {
        firstNames: ["Ahmed", "Mohammed", "Khalid", "Fahad"],
        lastNames: ["Al-Sabah", "Al-Ghanim", "Al-Kharafi", "Al-Sager"],
        phoneFormat: { mobile: "+9656", landline: "+9652" },
        extension: "kw"
      },
      'Qatar': {
        firstNames: ["Ahmed", "Mohammed", "Hamad", "Abdullah"],
        lastNames: ["Al-Thani", "Al-Attiyah", "Al-Kuwari", "Al-Emadi"],
        phoneFormat: { mobile: "+9745", landline: "+9744" },
        extension: "qa"
      },
      'Bahrain': {
        firstNames: ["Ahmed", "Mohammed", "Khalid", "Hamad"],
        lastNames: ["Al-Khalifa", "Al-Zayani", "Al-Arrayedh", "Kanoo"],
        phoneFormat: { mobile: "+9733", landline: "+9731" },
        extension: "bh"
      }
    };
    
    return countryData[country] || countryData['Saudi Arabia'];
  }

  /**
   * Generate demo contact data
   */
  private generateDemoContactData(): void {
    console.log('🎯 [CONTACT MODAL] generateDemoContactData() called');
    
    // Get company name from form to find matching company
    const companyName = this.unifiedModalForm?.get('firstName')?.value;
    console.log('🎯 [CONTACT MODAL] Company name from form:', companyName);
    
    // ALWAYS try to find company by name from the form (priority #1)
    if (companyName) {
      console.log('🎯 [CONTACT MODAL] Finding company by name:', companyName);
      const foundCompany = this.demoDataGenerator.findCompanyByName(companyName);
      if (foundCompany) {
        this.currentDemoCompany = foundCompany;
        console.log('✅ [CONTACT MODAL] Found and updated to company:', foundCompany.name);
      } else {
        console.log('⚠️ [CONTACT MODAL] Company not found in demo pool:', companyName);
        
        // Create a temporary demo company from the extracted data in the form
        const country = this.unifiedModalForm?.get('country')?.value || 'Saudi Arabia';
        console.log('🎯 [CONTACT MODAL] Creating temporary company for:', companyName, 'in', country);
        
        this.currentDemoCompany = {
          id: companyName.toLowerCase().replace(/\s+/g, '_'),
          name: companyName,
          nameAr: this.unifiedModalForm?.get('firstNameAR')?.value || '',
          customerType: this.unifiedModalForm?.get('CustomerType')?.value || 'Private Company',
          ownerName: this.unifiedModalForm?.get('ownerName')?.value || '',
          taxNumber: this.unifiedModalForm?.get('tax')?.value || '',
          buildingNumber: this.unifiedModalForm?.get('buildingNumber')?.value || '',
          street: this.unifiedModalForm?.get('street')?.value || '',
          country: country,
          city: this.unifiedModalForm?.get('city')?.value || '',
          industry: 'General',
          contacts: [], // Will be generated below
          salesOrg: this.unifiedModalForm?.get('salesOrganization')?.value || '',
          distributionChannel: this.unifiedModalForm?.get('distributionChannel')?.value || '',
          division: this.unifiedModalForm?.get('division')?.value || ''
        };
        
        console.log('✅ [CONTACT MODAL] Created temporary company:', this.currentDemoCompany.name);
      }
    }
    
    // If still no company, generate new one from pool
    if (!this.currentDemoCompany) {
      console.log('🎯 [CONTACT MODAL] No company name in form, generating from pool');
      this.currentDemoCompany = this.demoDataGenerator.generateDemoData();
      console.log('🎯 [CONTACT MODAL] Generated company:', this.currentDemoCompany?.name);
    }
    
    console.log('🎯 [CONTACT MODAL] Current demo company:', {
      name: this.currentDemoCompany.name,
      country: this.currentDemoCompany.country,
      contactsCount: this.currentDemoCompany.contacts?.length || 0
    });
    
    // Get next contact from the company
    const contactsArray = this.unifiedModalForm?.get('contacts') as any;
    const currentContactCount = contactsArray?.length || 0;
    console.log('🎯 [CONTACT MODAL] Current contact count in form:', currentContactCount);
    console.log('🎯 [CONTACT MODAL] Need contact at index:', currentContactCount);
    
    // Generate contacts if the company doesn't have any (temporary company)
    let allContacts = [...(this.currentDemoCompany.contacts || [])];
    console.log('🎯 [CONTACT MODAL] Initial contacts count:', allContacts.length);
    
    if (allContacts.length === 0 || allContacts.length <= currentContactCount) {
      console.log('🎯 [CONTACT MODAL] Need to generate contacts!');
      const contactsNeeded = Math.max(currentContactCount + 1, 5); // At least 5 contacts
      console.log('🎯 [CONTACT MODAL] Contacts needed:', contactsNeeded);
      
      const generatedContacts = this.demoDataGenerator.generateAdditionalContacts(
        contactsNeeded,
        this.currentDemoCompany.country,
        this.currentDemoCompany.name
      );
      
      console.log('🎯 [CONTACT MODAL] Generated contacts:', generatedContacts.length);
      
      // If no contacts generated (company not in pool), generate using static method directly
      if (generatedContacts.length === 0) {
        console.log('🎯 [CONTACT MODAL] Using fallback static contact generation');
        allContacts = this.generateFallbackStaticContacts(
          this.currentDemoCompany.name,
          this.currentDemoCompany.country,
          contactsNeeded
        );
        console.log('🎯 [CONTACT MODAL] Fallback contacts generated:', allContacts.length);
      } else {
        allContacts = generatedContacts;
        // Update the company's contacts for future use
        this.currentDemoCompany.contacts = allContacts;
      }
    }
    
    const demoContact = allContacts[currentContactCount] || allContacts[0];
    console.log('🎯 [CONTACT MODAL] Selected contact:', {
      index: currentContactCount,
      name: demoContact?.name,
      email: demoContact?.email,
      mobile: demoContact?.mobile
    });
    
    if (!demoContact) {
      console.error('❌ [CONTACT MODAL] No demo contact available!');
      return;
    }
    
    this.contactModalForm.patchValue({
      name: demoContact.name || 'Ahmed Mohamed',
      jobTitle: demoContact.jobTitle || 'Sales Manager',
      email: demoContact.email || 'ahmed@company.com',
      mobile: demoContact.mobile || '+201234567890',
      landline: demoContact.landline || '',
      preferredLanguage: demoContact.preferredLanguage || 'Arabic'
    });
    
    console.log('✅ [CONTACT MODAL] Contact modal form filled successfully');
    this.cdr.detectChanges();
  }

  /**
   * Open modal to edit existing contact
   */
  editContactInModal(index: number): void {
    this.isEditingContact = true;
    this.editingContactIndex = index;
    this.contactModalTitle = this.translate.instant('agent.contact.editTitle');
    
    const contact = this.unifiedContactsArray.at(index);
    this.contactModalForm.patchValue({
      name: contact.get('name')?.value,
      jobTitle: contact.get('jobTitle')?.value,
      email: contact.get('email')?.value,
      mobile: contact.get('mobile')?.value,
      landline: contact.get('landline')?.value,
      preferredLanguage: contact.get('preferredLanguage')?.value || 'Arabic'
    });
    
    this.showContactModal = true;
    this.cdr.detectChanges();
  }

  /**
   * Save contact from modal (Add or Update)
   */
  saveContactFromModal(): void {
    if (this.contactModalForm.invalid) {
      Object.keys(this.contactModalForm.controls).forEach(key => {
        this.contactModalForm.get(key)?.markAsTouched();
      });
      return;
    }

    const contactData = this.contactModalForm.value;

    if (this.isEditingContact && this.editingContactIndex >= 0) {
      // Update existing contact
      const contactGroup = this.unifiedContactsArray.at(this.editingContactIndex);
      contactGroup.patchValue(contactData);
      console.log('✅ Contact updated at index:', this.editingContactIndex);
    } else {
      // Add new contact
      this.addContactToUnifiedForm();
      const newIndex = this.unifiedContactsArray.length - 1;
      const newContactGroup = this.unifiedContactsArray.at(newIndex);
      newContactGroup.patchValue(contactData);
      console.log('✅ New contact added');
    }

    this.closeContactModal();
    this.cdr.detectChanges();
  }

  /**
   * Close contact modal
   */
  closeContactModal(): void {
    this.showContactModal = false;
    this.isEditingContact = false;
    this.editingContactIndex = -1;
    this.contactModalForm.reset();
    this.cdr.detectChanges();
  }

  // ====== Document Management Methods ======

  /**
   * Trigger add document file input
   */
  triggerAddDocument(): void {
    const input = document.getElementById('addDocumentInput') as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  /**
   * Handle adding new documents
   */
  async onAddDocument(event: any): Promise<void> {
    console.log('🔍 [DEBUG] onAddDocument() called');
    const files = event.target.files;
    if (!files || files.length === 0) {
      console.log('🔍 [DEBUG] No files selected, returning');
      return;
    }

    try {
      console.log('🔍 [DEBUG] Files received:', files.length);
      console.log('📎 Adding new documents:', files.length);
      
      // Convert files to array
      const newFiles = Array.from(files) as File[];
      console.log('🔍 [DEBUG] New files converted:', newFiles.map(f => f.name));
      
      // Check if this is adding to existing documents
      if (this.uploadedFiles.length > 0) {
        console.log('🔍 [DEBUG] Adding documents to existing ones');
        
        // ✅ MANDATORY GOVERNANCE CHECK - Compare new documents with current company
        await this.performGovernanceCheck(newFiles);
        
        event.target.value = '';
        return;
      }
      
      // First document upload scenario
      console.log('🔍 [DEBUG] First document upload scenario');
      const allFiles = newFiles;
      console.log('🔍 [DEBUG] New files count:', allFiles.length);
      console.log('🔍 [DEBUG] All files names:', allFiles.map(f => f.name));
      
      // ✅ Automatically process new documents with governance check
      console.log('🔍 [DEBUG] Auto-processing new documents with governance check');
      
      // ✅ MANDATORY GOVERNANCE CHECK - Compare new documents with current company
      await this.performGovernanceCheck(allFiles);
      
      event.target.value = '';
    } catch (error) {
      console.error('❌ Error adding documents:', error);
      console.error('🔍 [DEBUG] Error stack:', (error as Error).stack);
      this.isReprocessingDocuments = false;
    }

    // Clear input
    event.target.value = '';
  }

  /**
   * Remove document by index
   */
  removeDocument(index: number): void {
    const confirmMsg = this.translate.instant('agent.confirmations.deleteDocument');
    if (confirm(confirmMsg)) {
      // Get service documents
      const serviceDocuments = this.agentService.getDocuments();
      
      if (serviceDocuments && serviceDocuments.length > index) {
        // Remove from service
        const docId = serviceDocuments[index].id;
        this.agentService.removeDocument(docId);
      }
      
      // Remove from uploaded files
      if (this.uploadedFiles && this.uploadedFiles.length > index) {
        this.uploadedFiles.splice(index, 1);
      }
      
      this.cdr.detectChanges();
      console.log('✅ Document removed at index:', index);
    }
  }

  // Method to handle modal close with intent analysis
  onUnifiedModalClose(): void {
    this.showUnifiedModal = false;
    this.showProgressBar = false;
    this.progressValue = 0;
    this.progressStatus = '';
    this.cdr.detectChanges();
    
    // Check if user wants to review or modify extracted data
    this.checkUserIntentForModalClose();
  }

  private async checkUserIntentForModalClose(): Promise<void> {
    // Don't show suggestions immediately, just monitor for future requests
    console.log('🔍 [INTENT] Modal closed - monitoring for review requests');
  }

  private async detectModalIntent(userMessage: string): Promise<{action: 'open_modal_review' | 'open_modal_edit' | 'none'}> {
    try {
      // Check if there's extracted data available
      const extractedData = this.agentService.getExtractedData();
      if (!extractedData || !extractedData.firstName) {
        console.log('🔍 [INTENT] No extracted data available, skipping intent detection');
        return { action: 'none' };
      }

      const prompt = `You are an intelligent intent detection system. Analyze the user's message (which can be in ANY Arabic dialect, English, or mixed languages) to determine if they want to open/review/edit a data form.

User Message: "${userMessage}"

The user might express their intent in VARIOUS ways across different Arabic dialects and English:

**Examples for REVIEW/OPEN (action: "open_modal_review"):**
- Egyptian: "عايز أشوف البيانات", "ممكن أفتح الفورم", "وريني الداتا"
- Saudi/Gulf: "أبغى أشوف البيانات", "أفتح الفورم", "ورني المعلومات"
- Levantine: "بدي شوف البيانات", "فوت على الفورم"
- Standard Arabic: "أريد أن أرى البيانات", "افتح النموذج"
- English: "show me the data", "open the form", "I want to review", "display the information", "let me see", "can I check"
- Mixed: "افتح ال form", "show البيانات", "أريد أشوف the data"

**Examples for EDIT/MODIFY (action: "open_modal_edit"):**
- Egyptian: "عايز أعدل البيانات", "محتاج أغير حاجة", "عايز أصلح الداتا"
- Saudi/Gulf: "أبغى أعدل المعلومات", "أبي أغير شيء"
- Levantine: "بدي عدل البيانات", "بدي غير شي"
- Standard Arabic: "أريد تعديل البيانات", "أحتاج لتغيير المعلومات"
- English: "I want to edit", "modify the data", "change something", "update information", "fix the data"
- Mixed: "عايز أعمل edit", "أعدل ال data", "I want to change البيانات"

**None (action: "none"):**
- Anything else that doesn't clearly indicate wanting to open/review/edit the form

Be VERY flexible with dialects, slang, typos, and mixed languages. Focus on the INTENT, not exact keywords.

Respond with JSON ONLY (no markdown, no extra text):
{
  "action": "open_modal_review" | "open_modal_edit" | "none",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

      const response = await this.agentService.callOpenAI(prompt);
      console.log('🔍 [INTENT] Raw OpenAI response:', response);
      
      const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(cleanedResponse);
      
      console.log('🔍 [INTENT] Detected intent:', result);
      console.log('🔍 [INTENT] Confidence:', result.confidence);
      console.log('🔍 [INTENT] Reasoning:', result.reasoning);
      
      // Only act if confidence is high enough (lowered threshold for better UX)
      if (result.confidence && result.confidence > 0.6) {
        console.log(`🎯 [INTENT] Action selected: ${result.action} (confidence: ${result.confidence})`);
        return { action: result.action };
      } else {
        console.log(`❌ [INTENT] Confidence too low (${result.confidence}), skipping action`);
        return { action: 'none' };
      }
    } catch (error) {
      console.error('❌ [INTENT] Error detecting modal intent:', error);
      return { action: 'none' };
    }
  }

  private async analyzeUserIntent(userMessages: string): Promise<{wantsToReview: boolean, wantsToModify: boolean}> {
    try {
      const prompt = `Analyze the following user messages to determine if they want to review or modify extracted data:

User Messages: "${userMessages}"

Look for keywords like:
- "review", "check", "look at", "see", "show me"
- "modify", "change", "edit", "update", "fix", "correct"
- "wrong", "incorrect", "not right", "mistake"
- "missing", "incomplete", "need more"

Respond with JSON only:
{
  "wantsToReview": boolean,
  "wantsToModify": boolean
}`;

      const response = await this.agentService.callOpenAI(prompt);
      const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.log('🔍 [INTENT] Error analyzing intent:', error);
      return { wantsToReview: false, wantsToModify: false };
    }
  }

  // ✅ Background governance - Mandatory company comparison
  private async performGovernanceCheck(newFiles: File[]): Promise<void> {
    console.log('🏛️ [GOVERNANCE] Performing mandatory company comparison');
    
    try {
      // Step 1: Close modal first
      this.showUnifiedModal = false;
      this.cdr.detectChanges();
      
      // Step 2: Show processing message
      console.log('📨 [GOVERNANCE] Adding processing message to chat');
      const fileNames = newFiles.map(f => f.name).join(', ');
      this.addMessage({
        id: `upload_${Date.now()}`,
        role: 'user',
        content: `📤 Uploaded ${newFiles.length} additional document(s): ${fileNames}`,
        timestamp: new Date(),
        type: 'text'
      });
      
      const progressMessage = this.addMessage({
        id: `progress_${Date.now()}`,
        role: 'assistant',
        content: `🤖 Processing ${newFiles.length} documents with AI...\n\n⚡ Extracting data...`,
        timestamp: new Date(),
        type: 'loading'
      });
      
      console.log('📨 [GOVERNANCE] Processing message added:', progressMessage.id);
      
      // Step 2.5: Show progress bar
      console.log('📊 [GOVERNANCE] Showing progress bar');
      this.showProgressBar = true;
      this.progressValue = 0;
      this.progressStatus = `Processing ${newFiles.length} documents with AI...`;
      this.cdr.detectChanges();
      
      // Step 2.6: Animate progress bar
      console.log('📊 [GOVERNANCE] Starting progress bar animation');
      this.animateProgressBar(); // Don't await, let it run in background
      
      // Step 3: Get current form data first (for lightweight extraction)
      const currentFormData = this.getCurrentFormData();
      console.log('📋 [GOVERNANCE] Current form data (before extraction):', currentFormData);
      
      // Step 3.5: Prepare existing data for lightweight extraction
      const existingData = this.unifiedModalForm?.value ? {
        firstName: this.unifiedModalForm.value.firstName || '',
        firstNameAR: this.unifiedModalForm.value.firstNameAR || '',
        tax: this.unifiedModalForm.value.tax || '',
        CustomerType: this.unifiedModalForm.value.CustomerType || '',
        ownerName: this.unifiedModalForm.value.ownerName || '',
        buildingNumber: this.unifiedModalForm.value.buildingNumber || '',
        street: this.unifiedModalForm.value.street || '',
        country: this.unifiedModalForm.value.country || '',
        city: this.unifiedModalForm.value.city || '',
        salesOrganization: this.unifiedModalForm.value.salesOrganization || '',
        distributionChannel: this.unifiedModalForm.value.distributionChannel || '',
        division: this.unifiedModalForm.value.division || ''
      } : undefined;
      
      console.log('📋 [GOVERNANCE] Existing form data for extraction:', existingData);
      
      // Step 4: Extract data from new documents using LIGHTWEIGHT mode
      console.log('🔍 [GOVERNANCE] Extracting data from new documents (LIGHTWEIGHT MODE - company name + missing fields only)...');
      
      // Pass existing data to agentService so it knows what's already filled
      if (existingData) {
        this.agentService['extractedData'] = existingData as any;
      }
      
      const newExtractedData = await this.agentService.uploadAndProcessDocuments(newFiles, undefined, true); // ✅ lightweight mode = true
      
      // Step 4.5: Hide progress bar and remove loading message
      console.log('📊 [GOVERNANCE] Hiding progress bar');
      this.showProgressBar = false;
      this.messages = this.messages.filter(m => m.id !== progressMessage.id);
      this.cdr.detectChanges();
      console.log('📋 [GOVERNANCE] Current form data:', currentFormData);
      console.log('📋 [GOVERNANCE] New extracted data:', newExtractedData);
      
      // Step 5: MANDATORY LLM Comparison (Governance requirement)
      console.log('🤖 [GOVERNANCE] Performing LLM company comparison...');
      console.log('🔍 [GOVERNANCE] Current form data for comparison:', JSON.stringify(currentFormData, null, 2));
      console.log('🔍 [GOVERNANCE] New extracted data for comparison:', JSON.stringify(newExtractedData, null, 2));
      
      const comparisonResult = await this.intelligentCompanyComparison({
        current: currentFormData,
        new: newExtractedData
      });
      
      console.log('🎯 [GOVERNANCE] Comparison result:', comparisonResult);
      
      // ✅ Check if current form data is empty (first upload scenario)
      const isEmptyFormData = !currentFormData.name && !currentFormData.tax && !currentFormData.country;
      
      if (isEmptyFormData) {
        console.log('✅ [GOVERNANCE] Empty form data - this is the first document upload');
        comparisonResult.isDifferent = false;
        comparisonResult.confidence = 0.95;
        comparisonResult.reasoning = 'First document upload - no existing data to compare';
      } else {
        // ✅ Fallback logic: Compare ONLY company name (ignore everything else)
        const isExactNameMatch = currentFormData.name && newExtractedData.firstName && 
                                currentFormData.name.toLowerCase().trim() === newExtractedData.firstName.toLowerCase().trim();
        
        console.log('🔍 [GOVERNANCE] Company name comparison:', {
          nameMatch: isExactNameMatch,
          currentName: currentFormData.name,
          newName: newExtractedData.firstName
        });
        
        // ✅ Override AI result if company names match (IGNORE tax, country, city differences)
        if (isExactNameMatch) {
          console.log('✅ [GOVERNANCE] Company name match - overriding AI result');
          console.log('📝 [GOVERNANCE] Ignoring differences in tax, country, city');
          comparisonResult.isDifferent = false;
          comparisonResult.confidence = 0.95;
          comparisonResult.reasoning = 'Company name matches - same company';
        }
      }
      
      if (comparisonResult.isDifferent && comparisonResult.confidence > 0.7) {
        // Step 6: Different company detected - use existing UI flow
        console.log('⚠️ [GOVERNANCE] Different company detected - using existing choice dialog');
        this.showCompanyChoiceDialog(newExtractedData as ExtractedData, newFiles);
      } else {
        // Step 7: Same company - merge new data with existing data and save
        console.log('✅ [GOVERNANCE] Same company detected - merging data');
        
        // ✅ Merge new extracted data with existing form data
        const mergedData = {
          ...existingData, // Start with existing data (all fields)
          ...newExtractedData // Overlay with new data (only non-empty fields)
        };
        
        // ✅ Clean up empty fields from merged data (preserve existing values)
        Object.keys(mergedData).forEach(key => {
          if (key === 'contacts') return; // Skip contacts array
          const typedKey = key as keyof typeof existingData;
          if (mergedData[typedKey] === '' && existingData && existingData[typedKey]) {
            (mergedData as any)[typedKey] = (existingData as any)[typedKey]; // Keep existing value if new is empty
          }
        });
        
        console.log('🔀 [GOVERNANCE] Merged data:', {
          existing: existingData,
          new: newExtractedData,
          merged: mergedData
        });
        
        // ✅ Try to save merged data to session staging (optional - don't block on failure)
        try {
          await this.saveToSessionStaging(mergedData, newFiles);
        } catch (error) {
          console.warn('⚠️ [SESSION] Session staging failed (non-critical):', error);
          // Continue anyway - session staging is optional
        }
        
        // Step 8: Reload modal from database (skip handleDocumentAddition - we already did extraction!)
        console.log('🔄 [GOVERNANCE] Reloading modal from database after same company detection...');
        await this.showUnifiedModalFromDatabase(mergedData);
      }
      
    } catch (error) {
      console.error('❌ [GOVERNANCE] Error in governance check:', error);
      // Fallback to existing behavior (but still use lightweight mode)
      console.log('⚠️ [GOVERNANCE] Falling back to handleDocumentAddition due to error');
      
      // Set existing data from form before fallback
      const existingFormData = this.unifiedModalForm?.value ? {
        firstName: this.unifiedModalForm.value.firstName || '',
        firstNameAR: this.unifiedModalForm.value.firstNameAR || '',
        tax: this.unifiedModalForm.value.tax || '',
        CustomerType: this.unifiedModalForm.value.CustomerType || '',
        ownerName: this.unifiedModalForm.value.ownerName || '',
        buildingNumber: this.unifiedModalForm.value.buildingNumber || '',
        street: this.unifiedModalForm.value.street || '',
        country: this.unifiedModalForm.value.country || '',
        city: this.unifiedModalForm.value.city || '',
        salesOrganization: this.unifiedModalForm.value.salesOrganization || '',
        distributionChannel: this.unifiedModalForm.value.distributionChannel || '',
        division: this.unifiedModalForm.value.division || ''
      } : undefined;
      
      if (existingFormData) {
        this.agentService['extractedData'] = existingFormData as any;
      }
      
      this.handleDocumentAdditionLightweight(newFiles);
    }
  }
  
  /**
   * Handle document addition in lightweight mode (skip redundant extraction)
   */
  private async handleDocumentAdditionLightweight(newFiles: File[]): Promise<void> {
    console.log('📄 [LIGHTWEIGHT] Handling document addition (no re-extraction needed)');
    
    try {
      // Just reload from database - extraction already done in governance check
      console.log('🔄 [LIGHTWEIGHT] Reloading modal from database...');
      
      // Get current extracted data from service
      const extractedData = this.agentService.getExtractedData();
      
      await this.showUnifiedModalFromDatabase(extractedData);
      
    } catch (error: any) {
      console.error('❌ [LIGHTWEIGHT] Error reloading modal:', error);
      this.addMessage({
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: `❌ Error: ${error.message}`,
        timestamp: new Date(),
        type: 'text'
      });
    }
  }

  // ✅ Session staging integration
  private async saveToSessionStaging(extractedData: any, documents: File[]): Promise<void> {
    const companyId = this.generateCompanyId(extractedData);
    const companyName = extractedData.firstName || 'Unknown Company';
    
    console.log('💾 [SESSION] Saving to session staging:', { companyId, companyName, documentsCount: documents.length });
    console.log('💾 [SESSION] Full extracted data:', extractedData);
    
    // ✅ Map contacts to match backend expectations
    const mappedContacts = (extractedData.contacts || []).map((contact: any) => ({
      name: contact.name,
      email: contact.email,
      phone: contact.mobile || contact.phone,  // ✅ Backend expects 'phone', frontend has 'mobile'
      position: contact.jobTitle || contact.position  // ✅ Backend expects 'position', frontend has 'jobTitle'
    }));
    
    await this.sessionStaging.saveCompany({
      companyId,
      companyName,
      firstName: extractedData.firstName,
      firstNameAr: extractedData.firstNameAR || extractedData.firstNameAr,  // ✅ Handle both cases
      taxNumber: extractedData.tax,
      customerType: extractedData.CustomerType,
      companyOwner: extractedData.CompanyOwner || extractedData.ownerName,
      buildingNumber: extractedData.buildingNumber,
      street: extractedData.street,
      country: extractedData.country,
      city: extractedData.city,
      salesOrg: extractedData.salesOrganization || extractedData.SalesOrgOption,  // ✅ Try both
      distributionChannel: extractedData.distributionChannel || extractedData.DistributionChannelOption,  // ✅ Try both
      division: extractedData.division || extractedData.DivisionOption,  // ✅ Try both
      registrationNumber: extractedData.registrationNumber,
      legalForm: extractedData.legalForm,
      documents,
      contacts: mappedContacts  // ✅ Use mapped contacts
    });
    
    console.log('✅ [SESSION] Data saved to session staging successfully');
  }

  // ✅ Background governance helper methods
  private generateCompanyId(extractedData: any): string {
    // ✅ Use ONLY company name for ID (not tax number)
    // This ensures same company gets same ID even if tax number changes
    const name = extractedData.firstName || extractedData.name || 'unknown';
    return `${name.replace(/\s+/g, '_')}`.toLowerCase();
  }
  
  private getCurrentFormData(): any {
    console.log('📋 [GOVERNANCE] Getting current form data...');
    
    // ✅ Try to get data from form first
    if (this.unifiedModalForm && this.unifiedModalForm.value) {
      const formValue = this.unifiedModalForm.value;
      const formData = {
        name: formValue.firstName || '',
        nameAr: formValue.firstNameAr || formValue.firstNameAR || '',
        tax: formValue.tax || '',
        country: formValue.country || '',
        city: formValue.city || ''
      };
      
      console.log('📋 [GOVERNANCE] Form data from unifiedModalForm:', formData);
      
      // ✅ Check if form has meaningful data (not all empty)
      if (formData.name || formData.tax || formData.country) {
        return formData;
      }
    }
    
    console.log('📋 [GOVERNANCE] Form empty, falling back to service extractedData');
    
    // ✅ Fallback to extractedData from service
    const extractedData = this.agentService.getExtractedData();
    const serviceData = {
      name: extractedData?.firstName || '',
      nameAr: extractedData?.firstNameAR || '',
      tax: extractedData?.tax || '',
      country: extractedData?.country || '',
      city: extractedData?.city || ''
    };
    
    console.log('📋 [GOVERNANCE] Service extracted data:', serviceData);
    return serviceData;
  }
  
  private addDocumentsToCurrentCompany(newFiles: File[], extractedData: any): void {
    console.log('🏢 [GOVERNANCE] Adding documents to current company');
    
    if (!this.currentCompanyDocuments) {
      // Initialize current company
      this.currentCompanyDocuments = {
        companyId: this.generateCompanyId(extractedData),
        companyName: extractedData.firstName || 'Unknown Company',
        documents: [...newFiles],
        extractedData
      };
      console.log(`🏢 [GOVERNANCE] Created new company: ${this.currentCompanyDocuments.companyName}`);
    } else {
      // Add to existing company (PRESERVE existing documents)
      const existingCount = this.currentCompanyDocuments.documents.length;
      this.currentCompanyDocuments.documents = [
        ...this.currentCompanyDocuments.documents, // ✅ Keep existing
        ...newFiles // ✅ Add new ones
      ];
      
      console.log(`🏢 [GOVERNANCE] Added ${newFiles.length} documents to existing company: ${this.currentCompanyDocuments.companyName}`);
      console.log(`🏢 [GOVERNANCE] Total documents now: ${this.currentCompanyDocuments.documents.length} (was ${existingCount})`);
      
      // Merge extracted data intelligently
      this.currentCompanyDocuments.extractedData = this.mergeCompanyData(
        this.currentCompanyDocuments.extractedData,
        extractedData
      );
    }
    
    // Store in global map
    this.allCompaniesDocuments.set(this.currentCompanyDocuments.companyId, this.currentCompanyDocuments);
    
    // Update uploadedFiles to match current company documents
    this.uploadedFiles = this.currentCompanyDocuments.documents;
    this.unifiedModalDocuments = this.currentCompanyDocuments.documents;
    
    console.log(`✅ [GOVERNANCE] Current company now has ${this.uploadedFiles.length} documents`);
  }
  
  private switchToNewCompany(newDocuments: { files: File[], extractedData: any }): void {
    console.log('🔄 [GOVERNANCE] Switching to new company');
    
    // Create new company document set
    this.currentCompanyDocuments = {
      companyId: this.generateCompanyId(newDocuments.extractedData),
      companyName: newDocuments.extractedData.firstName || 'Unknown Company',
      documents: [...newDocuments.files],
      extractedData: newDocuments.extractedData
    };
    
    console.log(`🏢 [GOVERNANCE] Switched to new company: ${this.currentCompanyDocuments.companyName}`);
    console.log(`📄 [GOVERNANCE] New company documents: ${this.currentCompanyDocuments.documents.length}`);
    
    // Store in global map
    this.allCompaniesDocuments.set(this.currentCompanyDocuments.companyId, this.currentCompanyDocuments);
    
    // Update uploadedFiles to match new company documents
    this.uploadedFiles = this.currentCompanyDocuments.documents;
    this.unifiedModalDocuments = this.currentCompanyDocuments.documents;
  }
  
  private mergeCompanyData(existing: any, newData: any): any {
    // Simple merge - keep existing values, add new ones if missing
    return {
      ...existing,
      ...newData,
      // For arrays like contacts, merge them
      contacts: [...(existing.contacts || []), ...(newData.contacts || [])]
    };
  }

  private async intelligentCompanyComparison(data: {
    current: { name?: string; nameAr?: string; tax?: string; country?: string; city?: string },
    new: { name?: string; nameAr?: string; tax?: string; country?: string; city?: string }
  }): Promise<{ isDifferent: boolean; confidence: number; reasoning: string; differences: string[] }> {
    try {
      const prompt = `You are a FAST company name comparison system. Compare ONLY the company names to determine if they are the SAME company.

**CURRENT COMPANY NAME:**
- English: "${data.current.name || 'N/A'}"
- Arabic: "${data.current.nameAr || 'N/A'}"

**NEW DOCUMENT COMPANY NAME:**
- English: "${data.new.name || 'N/A'}"
- Arabic: "${data.new.nameAr || 'N/A'}"

**SIMPLE RULES:**
1. **EXACT match** → SAME company (isDifferent: false, confidence: 0.95)
2. **Minor variations** (Co., Ltd., Inc., spelling) → SAME company (isDifferent: false, confidence: 0.8)
3. **Completely different names** → DIFFERENT companies (isDifferent: true, confidence: 0.9)

**IGNORE:** Tax numbers, country, city, all other fields. ONLY compare company names.

**RESPOND WITH JSON ONLY (no markdown):**
{
  "isDifferent": boolean,
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation",
  "differences": [] or ["name"]
}

**EXAMPLES:**
- "Al-Rowad Food Co" vs "Al-Rowad Food Co" → {"isDifferent": false, "confidence": 0.95}
- "Al Marai" vs "Almarai Co" → {"isDifferent": false, "confidence": 0.8}
- "Company A" vs "Company B" → {"isDifferent": true, "confidence": 0.9}`;

      const response = await this.agentService.callOpenAI(prompt);
      console.log('🤖 [AI COMPARISON] Raw OpenAI response:', response);
      
      const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(cleanedResponse);
      
      console.log('🤖 [AI COMPARISON] Parsed result:', result);
      
      return {
        isDifferent: result.isDifferent,
        confidence: result.confidence || 0.5,
        reasoning: result.reasoning || 'No reasoning provided',
        differences: result.differences || []
      };
      
    } catch (error) {
      console.error('❌ [AI COMPARISON] Error during intelligent comparison:', error);
      throw error;
    }
  }
}


