import { Component, OnInit, OnDestroy, ChangeDetectorRef, TemplateRef, ViewChild, ElementRef, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { DataEntryAgentService, ExtractedData } from '../services/data-entry-agent.service';
import { TranslateService } from '@ngx-translate/core';
import { DemoDataGeneratorService, DemoCompany } from '../services/demo-data-generator.service';
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
  
  // Document upload
  uploadedFiles: File[] = [];
  showDocumentModal = false;
  pendingFiles: File[] = [];
  documentMetadataForm!: FormGroup;
  modalKey = 0; // Force modal re-render
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

  // Document management for unified modal
  unifiedModalDocuments: any[] = [];
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
  contactModalTitle = 'إضافة جهة اتصال / Add Contact';
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
    this.uploadedFiles = [];
    this.accumulatedFiles = [];
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
      this.uploadedFiles = files;

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

      const metadata = this.agentService.getDocumentMetadata();
      if (metadata && metadata.length > 0) {
        const detectionMessages = metadata.map((m, i) => {
          const typeKey = `agent.documentTypes.${m.type}`;
          const translatedType = this.translate.instant(typeKey);
          const countryKey = `agent.countries.${m.country}`;
          const translatedCountry = this.translate.instant(countryKey);

          let icon = '📄';
          const t = (m.type || '').toLowerCase();
          if (t.includes('commercial')) icon = '🏢';
          else if (t.includes('tax')) icon = '💰';
          else if (t.includes('vat')) icon = '📊';
          else if (t.includes('license')) icon = '📜';
          else if (t.includes('id')) icon = '🆔';
          else if (t.includes('contract')) icon = '📝';

          return `${icon} **${this.translate.instant('agent.autoProcessing.documentDetected', { index: i + 1 })}:**
   • ${this.translate.instant('agent.autoProcessing.type')}: ${translatedType}
   • ${this.translate.instant('agent.autoProcessing.country')}: ${translatedCountry}
   • ${this.translate.instant('agent.autoProcessing.detectedFrom')}`;
        }).join('\n\n');

        this.addMessage({
          id: `detected_${Date.now()}`,
          role: 'assistant',
          content: `✅ ${this.translate.instant('agent.autoProcessing.detectionComplete')}:
        
${detectionMessages}

🤖 ${this.translate.instant('agent.autoProcessing.autoAnalysis')}`,
          timestamp: new Date(),
          type: 'text'
        });
      }

      this.displayExtractedDataWithLabels(extractedData);

      const missingFields = this.checkMissingFields(extractedData);
      if (missingFields.length > 0) {
        this.askForMissingField(missingFields[0]);
      } else {
        // Do not push extra review message here; the structured review message is already shown
      }
    } catch (error: any) {
      console.error('❌ Auto-processing error:', error);
      this.addMessage({
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: `❌ ${this.translate.instant('agent.autoProcessing.processingFailed')}
      
${this.translate.instant('agent.autoProcessing.tryAgain')}`,
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
      
      const documentGroup = this.fb.group({
        name: [file.name],
        country: [detectedInfo?.country || '', Validators.required],
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
      // Keep a local reference so they appear in unified modal documents section
      this.uploadedFiles = files;
      // User message
      const fileNames = files.map(f => f.name).join(', ');
      this.addMessage({
        id: `upload_${Date.now()}`,
        role: 'user',
        content: `📤 رفع ${files.length} مستند / Uploaded ${files.length} document(s): ${fileNames}`,
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
        content: `❌ خطأ / Error: ${error.message}`,
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
            text: '📝 مراجعة وإكمال البيانات / Review & Complete Data', 
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
    console.log('🧪 [Chat] checkMissingFields called with data:', data);
    
    const required = [
      'firstName', 'firstNameAR', 'tax', 'CustomerType', 'ownerName',
      'buildingNumber', 'street', 'country', 'city',
      'salesOrganization', 'distributionChannel', 'division'
    ];
    
    const missing = required.filter(field => {
      const value = (data as any)[field];
      const isEmpty = !value || (typeof value === 'string' && value.trim() === '');
      console.log(`🧪 [Chat] Field ${field}: value="${value}", isEmpty=${isEmpty}`);
      return isEmpty;
    });

    // Contacts optional: don't include in missing list

    console.log('🧪 [Chat] Missing fields result:', missing);
    return missing;
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
      content: `✍️ ${fieldLabel}\n\n${example}\n\nادخل القيمة / Enter value:`,
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
      content: `✅ تم اختيار / Selected: ${selected?.label || value}`,
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
      content: `👥 **إضافة جهة اتصال / Add Contact:**\n
يرجى ملء نموذج جهة الاتصال في النافذة المنبثقة.
Please fill the contact form in the popup window.`,
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
        content: `✅ تم إضافة جهة الاتصال / Contact added: ${contact.name}
        
هل تريد إضافة جهة اتصال أخرى؟ / Add another contact?`,
        timestamp: new Date(),
        type: 'confirmation',
        data: {
          buttons: [
            { text: '➕ نعم / Yes', action: 'add_another_contact' },
            { text: '➡️ متابعة / Continue', action: 'continue_after_contact' }
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
        content: '✅ تم تأكيد البيانات / Data confirmed. سأتابع الآن لطلب البيانات الناقصة / Will now continue to ask for missing data.',
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
        content: 'تم الإلغاء. يمكنك المراجعة وإعادة المحاولة. / Cancelled. You can review and try again.',
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
          content: `🎉 **تم الإرسال بنجاح! / Submitted successfully!**
          
رقم الطلب / Request ID: ${response.id}
الحالة / Status: Pending Review

يمكنك متابعة الطلب من قائمة المهام.
You can track the request in your task list.`,
          timestamp: new Date(),
          type: 'text'
        });
        
        // CRITICAL: Reset after success
        this.agentService.reset();
        this.uploadedFiles = [];
        this.contactsAdded = [];
        this.fieldAttempts = {} as any;
        this.currentMissingField = null;
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
        content: `❌ فشل الإرسال / Submission failed: ${error.message}`,
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

  onButtonClick(action: string, data?: any): void {
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
      content: `📝 **الإدخال اليدوي / Manual Entry**
      
سأساعدك في إدخال البيانات خطوة بخطوة.
I'll help you enter data step by step.

هيا نبدأ! / Let's start!`,
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
      content: `📖 **المساعدة / Help**

**الأوامر المتاحة / Available Commands:**
• "رفع" أو "upload" - لرفع المستندات
• "يدوي" أو "manual" - للإدخال اليدوي
• "مسح" أو "clear" - لمسح البيانات
• "مساعدة" أو "help" - لعرض المساعدة

**النصائح / Tips:**
• يمكنك رفع عدة مستندات مرة واحدة
• استخدم الأرقام للاختيار من القوائم
• اكتب "تخطي" أو "skip" لتخطي حقل اختياري`,
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
    // Generate initial demo company
    this.currentDemoCompany = this.demoDataGenerator.generateDemoData();
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
            console.log('Double space detected - triggering auto-fill');
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
                console.log('Double space detected in modal - triggering auto-fill');
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
      console.log('🎯 [DEMO] Starting demo data generation...');
      console.log('🎯 [DEMO] Modal state:', { 
        showUnifiedModal: this.showUnifiedModal, 
        unifiedModalForm: !!this.unifiedModalForm 
      });
      
      // Ensure modal and form are ready
      if (!this.showUnifiedModal) {
        console.warn('⚠️ [DEMO] Unified modal not open. Opening now before applying demo data...');
        this.openUnifiedModal();
        this.cdr.detectChanges();
      }
      if (!this.unifiedModalForm) {
        console.warn('⚠️ [DEMO] unifiedModalForm not initialized yet. Deferring demo fill...');
        setTimeout(() => this.fillWithDemoData(), 50);
        return;
      }

      if (!this.currentDemoCompany) {
        this.currentDemoCompany = this.demoDataGenerator.generateDemoData();
        console.log('🎯 [DEMO] Generated new company:', this.currentDemoCompany);
      }
      
      if (this.showUnifiedModal && this.unifiedModalForm) {
        console.log('🎯 [DEMO] Patching form with demo data...');
        
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
        console.log('🎯 [DEMO] Current contacts array length:', contactsArray.length);
        
        // Clear existing contacts
        while (contactsArray.length !== 0) {
          contactsArray.removeAt(0);
        }
        
        // Add demo contacts
        this.currentDemoCompany.contacts.forEach((contact, index) => {
          console.log(`🎯 [DEMO] Adding contact ${index + 1}:`, contact);
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
        
        console.log('✅ [DEMO] Demo data applied successfully');
    } else {
        console.warn('⚠️ [DEMO] Cannot apply demo data - modal not open or form not initialized');
        console.log('Modal state:', { 
          showUnifiedModal: this.showUnifiedModal, 
          unifiedModalForm: !!this.unifiedModalForm 
        });
      }
      
      this.addMessage({
        id: `demo_${Date.now()}`,
        role: 'assistant',
        content: `✅ **Demo data loaded: ${this.currentDemoCompany?.name}**\nRemaining companies: ${this.demoDataGenerator.getRemainingCompaniesCount()}`,
        timestamp: new Date(),
        type: 'text'
      });
    } catch (e) {
      console.error('❌ [DEMO] Error generating demo data:', e);
      this.addMessage({
        id: `demo_error_${Date.now()}`,
        role: 'assistant',
        content: `❌ **Demo data failed:** ${e}`,
        timestamp: new Date(),
        type: 'text'
      });
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
        content: `❌ حدث خطأ في فتح نموذج التعديل / Error opening edit form: ${error.message}`,
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
    
    // Close modal service instance if it exists
    if (this.modalInstance) {
      this.modalInstance.destroy();
      this.modalInstance = null;
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
      content: '✅ **تم حفظ التعديلات / Changes saved successfully**\n\nسأتحقق الآن من البيانات الناقصة / Will now check for missing data.',
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
        content: `❌ حدث خطأ في فتح نموذج البيانات الناقصة / Error opening missing fields form: ${error.message}`,
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
      content: '✅ **تم حفظ البيانات الناقصة / Missing data saved successfully**\n\nسأتحقق الآن من اكتمال البيانات / Will now check data completeness.',
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
    return (this.documentMetadataForm?.get('documents') as FormArray) || this.fb.array([]);
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
      
      // Store current uploaded documents and original data
      this.unifiedModalDocuments = [...this.uploadedFiles];
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
        content: `❌ حدث خطأ / Error: ${error.message}`,
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
    if (contactsArray.length > 1) {
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
      content: `✅ **تم حفظ جميع البيانات بنجاح! / All data saved successfully!**
    
سيتم الآن التحقق من عدم وجود تكرار ثم إرسال الطلب.
Will now check for duplicates then submit the request.`,
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
    const userConfirmed = confirm(
      'تحذير: سيتم إعادة معالجة جميع المستندات واستخراج البيانات من جديد.\n' +
      'Warning: All documents will be reprocessed and data will be re-extracted.\n\n' +
      'هل تريد المتابعة؟ / Do you want to continue?'
    );
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
      // Prepare metadata form for new files
      this.pendingFiles = files;
      this.showDocumentModal = true;
      this.documentMetadataForm = this.fb.group({
        documents: this.fb.array([])
      });
      const documentsArray = this.documentMetadataForm.get('documents') as FormArray;
      files.forEach(file => {
        const detectedInfo = this.detectDocumentInfo(file.name);
        const documentGroup = this.fb.group({
          name: [file.name],
          country: [detectedInfo?.country || '', Validators.required],
          type: [detectedInfo?.type || '', Validators.required],
          description: [this.generateSmartDescription(file.name, detectedInfo)]
        });
        documentsArray.push(documentGroup);
      });
    } catch (error: any) {
      console.error('❌ [REPROCESS] Error:', error);
      this.isReprocessingDocuments = false;
      alert('حدث خطأ أثناء إعادة المعالجة / Error during reprocessing');
    }
  }

  private async processDocumentsForUnifiedModal(files: File[], metadata: any[]): Promise<void> {
    try {
      console.log('🔄 [UNIFIED OCR] Processing new documents with OCR');
      const extractedData = await Promise.race([
        this.agentService.uploadAndProcessDocuments(files, metadata),
        new Promise<ExtractedData>((_, reject) => setTimeout(() => reject(new Error('Processing timeout')), 60000))
      ]);
      console.log('✅ [UNIFIED OCR] New extracted data:', extractedData);
      this.updateUnifiedModalWithNewData(extractedData);
      this.uploadedFiles = files;
      this.unifiedModalDocuments = files;
      this.isReprocessingDocuments = false;
      this.cdr.detectChanges();
      alert('✅ تم إعادة معالجة المستندات بنجاح / Documents reprocessed successfully');
    } catch (error: any) {
      console.error('❌ [UNIFIED OCR] Processing error:', error);
      this.isReprocessingDocuments = false;
      alert('فشلت إعادة المعالجة / Reprocessing failed');
    }
  }

  private updateUnifiedModalWithNewData(newExtractedData: any): void {
    console.log('📝 [UNIFIED] Updating form with new extracted data');
    Object.keys(newExtractedData).forEach(key => {
      if (newExtractedData[key] !== null && newExtractedData[key] !== undefined) {
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
    if (formData.country) {
      this.updateCityOptions(formData.country);
    }
    this.toggleExtractedDataEdit(false);
    console.log('✅ [UNIFIED] Form updated with new OCR data');
  }

  saveDocuments(): void {
    console.log('🧪 [Chat] saveDocuments() clicked. Reprocessing?', this.isReprocessingDocuments);
    if (this.documentMetadataForm.valid) {
      const filesToProcess = [...this.pendingFiles];
      const metadata = this.documentsFA.controls.map(control => ({
        country: control.get('country')?.value,
        type: control.get('type')?.value,
        description: control.get('description')?.value
      }));
      this.closeDocumentModal();
      if (this.isReprocessingDocuments) {
        this.processDocumentsForUnifiedModal(filesToProcess, metadata);
      } else {
        this.processDocumentsWithMetadata(filesToProcess, metadata);
      }
    } else {
      console.warn('⚠️ [Chat] saveDocuments() blocked due to invalid form');
    }
  }

  removeDocumentFromUnified(index: number): void {
    if (confirm('هل تريد حذف هذا المستند؟ / Delete this document?')) {
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
    return this.unifiedModalData.extractedFields.includes(field);
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
   * Get documents list for display
   */
  getDocumentsList(): any[] {
    // Get documents from service (they have base64 content)
    const serviceDocuments = this.agentService.getDocuments();
    
    if (!serviceDocuments || serviceDocuments.length === 0) {
      // Fallback to uploadedFiles if service documents not available
      if (!this.uploadedFiles || this.uploadedFiles.length === 0) return [];
      
      return this.uploadedFiles.map((file: any, index: number) => ({
        value: {
          id: file.id || `doc-${index}`,
          name: file.name,
          type: this.getDocumentType(file),
          mime: file.type,
          size: file.size,
          uploadedAt: file.uploadedAt || new Date().toISOString(),
          contentBase64: file.contentBase64 || file.content || ''
        }
      }));
    }
    
    // Convert service documents to display format
    return serviceDocuments.map((doc: any, index: number) => ({
      value: {
        id: doc.id || `doc-${index}`,
        name: doc.name,
        type: this.getDocumentType({ type: doc.type || '' }),
        mime: this.getMimeType(doc.name, doc.type),
        size: doc.size,
        uploadedAt: doc.uploadedAt || new Date().toISOString(),
        contentBase64: doc.content || ''
      }
    }));
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
    this.contactModalTitle = 'إضافة جهة اتصال / Add Contact';
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
                console.log('🎯 Double space detected in contact modal - generating demo contact');
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
        console.log('✅ Demo data listener attached to contact modal');
      }
    }, 300);
  }

  /**
   * Generate demo contact data
   */
  private generateDemoContactData(): void {
    const demoCompany = this.demoDataGenerator.generateDemoData();
    const demoContact = demoCompany.contacts[0];
    
    this.contactModalForm.patchValue({
      name: demoContact.name || 'Ahmed Mohamed',
      jobTitle: demoContact.jobTitle || 'Sales Manager',
      email: demoContact.email || 'ahmed@company.com',
      mobile: demoContact.mobile || '+201234567890',
      landline: demoContact.landline || '',
      preferredLanguage: demoContact.preferredLanguage || 'Arabic'
    });
    
    this.cdr.detectChanges();
    console.log('✅ Demo contact data generated:', this.contactModalForm.value);
  }

  /**
   * Open modal to edit existing contact
   */
  editContactInModal(index: number): void {
    this.isEditingContact = true;
    this.editingContactIndex = index;
    this.contactModalTitle = 'تعديل جهة اتصال / Edit Contact';
    
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
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      console.log('📎 Adding new documents:', files.length);
      
      // Convert files to array
      const newFiles = Array.from(files) as File[];
      
      // Add to uploaded files
      this.uploadedFiles.push(...newFiles);
      
      // Process with service
      await this.agentService.uploadAndProcessDocuments(newFiles);
      
      this.cdr.detectChanges();
      console.log('✅ Documents added successfully');
    } catch (error) {
      console.error('❌ Error adding documents:', error);
    }

    // Clear input
    event.target.value = '';
  }

  /**
   * Remove document by index
   */
  removeDocument(index: number): void {
    if (confirm('هل تريد حذف هذا المستند؟ / Delete this document?')) {
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
}


