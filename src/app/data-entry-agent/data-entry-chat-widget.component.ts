import { Component, OnInit, OnDestroy, ChangeDetectorRef, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { DataEntryAgentService, ExtractedData } from '../services/data-entry-agent.service';
import { Subject, Subscription } from 'rxjs';
import { NzModalService } from 'ng-zorro-antd/modal';

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
  
  isOpen = false;
  isMinimized = false;
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
    private modalService: NzModalService
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    console.log('🧪 [Chat] ngOnInit called');
    console.log('🧪 [Chat] countriesList:', this.countriesList);
    console.log('🧪 [Chat] documentTypes:', this.documentTypes);
    this.initializeChat();
    // Open the chat automatically
    this.isOpen = true;
    this.isMinimized = false;
  }

  ngOnDestroy(): void {
    this.cleanup();
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
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.isMinimized = false;
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
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
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
      nzTitle: 'إضافة معلومات المستندات / Add Document Information',
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

  saveDocuments(): void {
    console.log('🧪 [Chat] saveDocuments() clicked. form valid =', this.documentMetadataForm?.valid, ' pendingFiles =', this.pendingFiles.map(f => f.name));
    if (this.documentMetadataForm.valid) {
      const filesToProcess = [...this.pendingFiles];
      const metadata = this.documentsFA.controls.map(control => ({
        country: control.get('country')?.value,
        type: control.get('type')?.value,
        description: control.get('description')?.value
      }));
      console.log('🧪 [Chat] saveDocuments() metadata =', metadata);
      // Close modal and confirm visibility state
      this.closeDocumentModal();
      console.log('🧪 [Chat] after closeDocumentModal -> showDocumentModal =', this.showDocumentModal);

      this.processDocumentsWithMetadata(filesToProcess, metadata);
    } else {
      console.warn('⚠️ [Chat] saveDocuments() blocked due to invalid form');
    }
  }

  private async processDocumentsWithMetadata(files: File[], metadata: Array<{ country?: string; type: string; description: string }>): Promise<void> {
    try {
      console.log('🧪 [Chat] processDocumentsWithMetadata start. files =', files.map(f => f.name), ' metadata count =', metadata.length);
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
        content: '🔄 جاري معالجة المستندات / Processing documents...',
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
    const extractionMessage = `
<div class="extraction-result">
  <div class="result-header">
    <span class="success-badge">✅ Data Extracted Successfully</span>
    <span class="arabic-text">تم استخراج البيانات بنجاح</span>
  </div>
  
  <div class="info-card company-info">
    <div class="card-title">🏢 Company Information</div>
    <div class="info-row">
      <span class="label">English Name:</span>
      <span class="value">${data.firstName || 'Not provided'}</span>
    </div>
    <div class="info-row">
      <span class="label">Arabic Company Name:</span>
      <span class="value">${data.firstNameAR || 'غير متوفر'}</span>
    </div>
    <div class="info-row">
      <span class="label">Tax Number:</span>
      <span class="value">${data.tax || 'Not provided'}</span>
    </div>
    <div class="info-row">
      <span class="label">Customer Type:</span>
      <span class="value type-badge">${data.CustomerType || 'Not provided'}</span>
    </div>
  </div>
  
  <div class="info-card address-info">
    <div class="card-title">📍 Address Details</div>
    <div class="info-row">
      <span class="label">Building:</span>
      <span class="value">${data.buildingNumber || 'N/A'}</span>
    </div>
    <div class="info-row">
      <span class="label">Street:</span>
      <span class="value">${data.street || 'N/A'}</span>
    </div>
    <div class="info-row">
      <span class="label">City:</span>
      <span class="value">${data.city || 'N/A'}</span>
    </div>
    <div class="info-row">
      <span class="label">Country:</span>
      <span class="value">${data.country || 'N/A'}</span>
    </div>
  </div>
  
  <div class="review-prompt">Is the extracted data correct?</div>
</div>
`;

    this.addMessage({
      id: `extracted_${Date.now()}`,
      role: 'assistant',
      content: extractionMessage,
      timestamp: new Date(),
      type: 'confirmation',
      data: {
        buttons: [
          { 
            text: '✓ Yes, correct', 
            action: 'data_review_yes',
            className: 'btn-confirm'
          },
          { 
            text: '✏️ Edit', 
            action: 'data_review_no',
            className: 'btn-edit'
          }
        ]
      }
    });
  }

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

    // Check contacts
    if (!data.contacts || data.contacts.length === 0) {
      missing.push('contacts');
      console.log('🧪 [Chat] Contacts field is missing');
    }

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
      this.askForContactForm();
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
    const content = `📋 ${fieldLabel}\nاختر من القائمة / Select from list:`;

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
      
      // Update extracted data
      const currentData = this.agentService.getExtractedData();
      currentData.contacts.push(contact);
      
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
      content: `✅ **جميع البيانات مكتملة! / All data complete!**
      
سيتم الآن التحقق من عدم وجود تكرار ثم إرسال الطلب.
Will now check for duplicates then submit the request.

هل تريد المتابعة؟ / Do you want to proceed?`,
      timestamp: new Date(),
      type: 'confirmation',
      data: {
        buttons: [
          { text: '✅ نعم، أرسل / Yes, submit', action: 'submit_request' },
          { text: '✏️ مراجعة البيانات / Review data', action: 'review_data' }
        ]
      }
    });
  }

  async sendMessage(message?: string): Promise<void> {
    const userMessage = message || this.newMessage.trim();
    if (!userMessage) return;

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
        content: '❌ حدث خطأ / An error occurred',
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
          content: `✅ تم اختيار / Selected: ${selected.label}`,
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
            content: `✅ تم اختيار / Selected: ${matched.label}`,
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
        content: `✅ تم حفظ / Saved: ${userMessage}`,
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
      content: '🔄 جاري المعالجة / Processing...',
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
      // Check duplicates
      const duplicateCheck = await this.agentService.checkForDuplicates();
      
      if (duplicateCheck.isDuplicate && duplicateCheck.existingRecord) {
        this.addMessage({
          id: `duplicate_${Date.now()}`,
          role: 'assistant',
          content: `⚠️ **تم العثور على سجل مكرر! / Duplicate found!**
          
السجل الموجود / Existing record:
• الاسم / Name: ${duplicateCheck.existingRecord.firstName}
• الرقم الضريبي / Tax: ${duplicateCheck.existingRecord.tax}
• الحالة / Status: ${duplicateCheck.existingRecord.status}

لا يمكن إنشاء سجل مكرر. / Cannot create duplicate record.`,
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
        
        // Reset
        this.agentService.reset();
        this.uploadedFiles = [];
        this.contactsAdded = [];
        this.fieldAttempts = {} as any;
        
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
        console.log('🎯 [BUTTON] Opening upload modal directly');
        this.openDocumentModalWithService();
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

  removeDocument(index: number): void {
    this.uploadedFiles.splice(index, 1);
    this.agentService.removeDocument(`doc_${index}`);
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

  // ✅ Helper method to check if a field was extracted (for Edit Form)
  isFieldExtracted(field: string): boolean {
    const extractedData = this.agentService.getExtractedData();
    const value = (extractedData as any)[field];
    return value && value.toString().trim() !== '';
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

  // ✅ Optimized select options with Map for O(1) lookup
  private selectOptionsMap = new Map([
    ['CustomerType', [
      { value: 'Corporate', label: 'Corporate' },
      { value: 'SME', label: 'SME' },
      { value: 'Individual', label: 'Individual' }
    ]],
    ['country', [
      { value: 'Egypt', label: 'Egypt' },
      { value: 'Saudi Arabia', label: 'Saudi Arabia' },
      { value: 'United Arab Emirates', label: 'United Arab Emirates' },
      { value: 'Yemen', label: 'Yemen' }
    ]],
    ['salesOrganization', [
      { value: 'egypt_cairo_office', label: 'Egypt - Cairo Head Office' },
      { value: 'egypt_alexandria_branch', label: 'Egypt - Alexandria Branch' },
      { value: 'egypt_giza_branch', label: 'Egypt - Giza Branch' },
      { value: 'ksa_riyadh_office', label: 'Saudi Arabia - Riyadh Office' },
      { value: 'ksa_jeddah_branch', label: 'Saudi Arabia - Jeddah Branch' }
    ]],
    ['distributionChannel', [
      { value: 'direct_sales', label: 'Direct Sales' },
      { value: 'authorized_distributors', label: 'Authorized Distributors' },
      { value: 'retail_chains', label: 'Retail Chains' }
    ]],
    ['division', [
      { value: 'food_products', label: 'Food Products Division' },
      { value: 'beverages', label: 'Beverages Division' },
      { value: 'household_items', label: 'Household Items Division' }
    ]]
  ]);

  getSelectOptions(field: string): Array<{value: string, label: string}> {
    return this.selectOptionsMap.get(field) || [];
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
}


