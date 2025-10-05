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
    // Open the chat automatically shortly after load
    setTimeout(() => {
      this.isOpen = true;
      this.isMinimized = false;
      // Debug: verify quick action buttons render
      setTimeout(() => {
        try {
          const buttons = document.querySelectorAll('.action-btn');
          console.log('🧪 [Chat] Action buttons count after open =', buttons.length);
          const fileInput = document.getElementById('file-upload') as HTMLInputElement | null;
          console.log('🧪 [Chat] file-upload input exists =', !!fileInput, ' accept =', fileInput?.accept, ' multiple =', fileInput?.multiple);
        } catch {}
      }, 250);
    }, 1000);
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private initializeForms(): void {
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

    // Edit form for extracted data
    this.editForm = this.fb.group({
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
  }

  get isDocumentFormValid(): boolean {
    return !!this.documentMetadataForm && this.documentMetadataForm.valid;
  }

  private initializeChat(): void {
    setTimeout(() => {
      this.addWelcomeMessage();
    }, 500);
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

  onFileSelected(event: any): void {
    const files: FileList = event?.target?.files;
    console.log('🧪 [Chat] onFileSelected fired. files? =', !!files, 'count =', files?.length ?? 0);
    if (!files || files.length === 0) return;

    this.pendingFiles = Array.from(files);
    this.initializeDocumentForm();
    
    // Use modal service instead of template modal
    this.openDocumentModalWithService();
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

    // Wait for modal to render then check content
    setTimeout(() => {
      this.debugModalLayoutCheck('openDocumentModalWithService');
    }, 100);
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
    let content = `✅ **تم استخراج البيانات / Data Extracted Successfully:**\n\n`;
    
    // Company info
    if (data.firstName || data.firstNameAR || data.tax || data.CustomerType || data.ownerName) {
      content += `**🏢 معلومات الشركة / Company Info:**\n`;
      if (data.firstName) content += `• الاسم (EN): ${data.firstName}\n`;
      if (data.firstNameAR) content += `• الاسم (AR): ${data.firstNameAR}\n`;
      if (data.tax) content += `• الرقم الضريبي: ${data.tax}\n`;
      if (data.CustomerType) content += `• النوع: ${data.CustomerType}\n`;
      if (data.ownerName) content += `• المالك: ${data.ownerName}\n`;
      content += '\n';
    }
    
    // Address
    if (data.buildingNumber || data.street || data.country || data.city) {
      content += `**📍 العنوان / Address:**\n`;
      if (data.buildingNumber) content += `• رقم المبنى: ${data.buildingNumber}\n`;
      if (data.street) content += `• الشارع: ${data.street}\n`;
      if (data.country) content += `• الدولة: ${data.country}\n`;
      if (data.city) content += `• المدينة: ${data.city}\n`;
      content += '\n';
    }

    content += `هل البيانات صحيحة؟ / Is the data correct?`;

    this.addMessage({
      id: `extracted_${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: new Date(),
      type: 'confirmation',
      data: {
        buttons: [
          { text: '✅ نعم، صحيح / Yes, correct', action: 'confirm_extraction' },
          { text: '✏️ تعديل / Edit', action: 'edit_extraction' }
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
      setTimeout(() => this.askForMissingField(missingFields[0]), 500);
    } else {
      console.log('🧪 [Chat] All fields complete, showing confirmation');
      this.confirmDataBeforeSubmission();
    }
  }

  private askForContactForm(): void {
    this.showContactForm = true;
    
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
    this.showContactForm = true;
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
      // User wants to edit the data
      this.addMessage({
        id: `edit_requested_${Date.now()}`,
        role: 'assistant',
        content: '✏️ يمكنك تعديل البيانات الآن. اكتب الحقل والقيمة الجديدة / You can edit the data now. Type field and new value.',
        timestamp: new Date(),
        type: 'text'
      });
      
      this.awaitingDataReview = false;
      // TODO: Implement data editing functionality
      
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
    console.log('🧪 [Chat] onButtonClick:', action, data ?? '');
    switch(action) {
      case 'upload':
        const input = document.getElementById('file-upload') as HTMLInputElement | null;
        console.log('🧪 [Chat] file-upload element found =', !!input);
        if (input) {
          input.click();
          console.log('🧪 [Chat] file-upload click triggered');
        } else {
          console.warn('⚠️ [Chat] file-upload element missing in DOM');
        }
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
      case 'edit_extraction':
        this.editExtractedData();
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
    const extractedData = this.agentService.getExtractedData();
    const missingFields = this.checkMissingFields(extractedData);
    
    if (missingFields.length > 0) {
      this.askForMissingField(missingFields[0]);
    } else {
      this.confirmDataBeforeSubmission();
    }
  }

  private editExtractedData(): void {
    console.log('🧪 [Chat] editExtractedData called');
    
    // Pre-fill the form with extracted data first
    const extractedData = this.agentService.getExtractedData();
    console.log('🧪 [Chat] Extracted data for form:', extractedData);
    
    const formData = {
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
    
    console.log('🧪 [Chat] Form data to patch:', formData);
    
    this.editForm.patchValue(formData);
    
    // Force change detection
    this.cdr.detectChanges();
    
    console.log('🧪 [Chat] Form patched. Current form value:', this.editForm.value);
    
    // Show edit form modal after form is ready
    setTimeout(() => {
      this.showEditForm = true;
      this.cdr.detectChanges();
      console.log('🧪 [Chat] Edit form modal opened');
    }, 200);
    
    this.addMessage({
      id: `edit_${Date.now()}`,
      role: 'assistant',
      content: `✏️ **تعديل البيانات / Edit Data**
      
يرجى مراجعة وتعديل البيانات في النموذج المنبثق.
Please review and edit the data in the popup form.`,
      timestamp: new Date(),
      type: 'text'
    });
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
    // Convert markdown to HTML
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  removeDocument(index: number): void {
    this.uploadedFiles.splice(index, 1);
    this.agentService.removeDocument(`doc_${index}`);
  }

  getUploadedDocuments(): any[] {
    return this.agentService.getDocuments();
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
    if (this.editForm.valid) {
      const formData = this.editForm.value;
      
      // Update extracted data with form values
      Object.keys(formData).forEach(key => {
        if (formData[key] !== '') {
          this.agentService.updateExtractedDataField(key, formData[key]);
        }
      });
      
      this.addMessage({
        id: `edit_saved_${Date.now()}`,
        role: 'assistant',
        content: '✅ تم حفظ التعديلات / Changes saved successfully.',
        timestamp: new Date(),
        type: 'text'
      });
      
      this.showEditForm = false;
      
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
    }
  }

  closeEditForm(): void {
    this.showEditForm = false;
    this.editForm.reset();
  }

  get documentsFA(): FormArray {
    return (this.documentMetadataForm?.get('documents') as FormArray) || this.fb.array([]);
  }

  get allDocumentTypes(): string[] {
    return ['Commercial Registration', 'Tax Card', 'Business License', 
            'Trade License', 'Tax Certificate'];
  }

  // Accumulated files helpers for UI panel
  clearAccumulatedFiles(): void {
    this.accumulatedFiles = [];
    this.showAccumulatedFiles = false;
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  removeAccumulatedFile(index: number): void {
    this.accumulatedFiles.splice(index, 1);
    if (this.accumulatedFiles.length === 0) {
      this.showAccumulatedFiles = false;
    }
  }

  async proceedWithAccumulatedFiles(): Promise<void> {
    if (this.accumulatedFiles.length === 0) return;
    this.pendingFiles = [...this.accumulatedFiles];
    this.accumulatedFiles = [];
    this.showAccumulatedFiles = false;
    this.initializeDocumentForm();
    
    // Use modal service instead of template modal
    this.openDocumentModalWithService();
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
    
    this.scrollTimeout = setTimeout(() => {
      const chatBody = document.querySelector('.chat-body');
      if (chatBody) {
        requestAnimationFrame(() => {
          (chatBody as HTMLElement).scrollTop = (chatBody as HTMLElement).scrollHeight;
        });
      }
    }, 50);
  }

  private debugModalLayoutCheck(context: string): void {
    try {
      const runCheck = (attempt: number) => {
        const overlay = document.querySelector('.cdk-overlay-container') as HTMLElement | null;
        const modalBody = document.querySelector('.ant-modal-body') as HTMLElement | null;
        const chat = document.querySelector('.chat-widget-container') as HTMLElement | null;

        const overlayZ = overlay ? getComputedStyle(overlay).zIndex : 'N/A';
        const chatZ = chat ? getComputedStyle(chat).zIndex : 'N/A';
        const bodyMaxH = modalBody ? getComputedStyle(modalBody).maxHeight : 'N/A';
        const bodyOverflow = modalBody ? getComputedStyle(modalBody).overflowY : 'N/A';

        console.log(`🧪 [Chat][${context}] Modal debug (attempt ${attempt}) → overlay z-index=`, overlayZ, ' chat z-index=', chatZ);
        console.log(`🧪 [Chat][${context}] Modal body styles → max-height=`, bodyMaxH, ' overflow-y=', bodyOverflow);
        
        // Check if modal is visible
        console.log(`🧪 [Chat][${context}] showDocumentModal =`, this.showDocumentModal);
        console.log(`🧪 [Chat][${context}] documentMetadataForm exists =`, !!this.documentMetadataForm);
        console.log(`🧪 [Chat][${context}] documentsFA length =`, this.documentsFA.length);
        
        if (modalBody) {
          const rect = modalBody.getBoundingClientRect();
          console.log('🧪 [Chat] Modal body rect:', { width: rect.width, height: rect.height, top: rect.top, left: rect.left });

          // Dump a snippet of HTML to confirm projection
          const htmlSample = (modalBody.innerHTML || '').slice(0, 200).replace(/\n/g, ' ');
          console.log('🧪 [Chat] Modal body HTML sample:', htmlSample);

          // Inspect children visibility/size
          const container = modalBody.querySelector('.document-modal-content') as HTMLElement | null;
          const form = modalBody.querySelector('.document-modal-content form') as HTMLElement | null;
          const card = modalBody.querySelector('.document-modal-content nz-card, .document-modal-content .ant-card') as HTMLElement | null;
          const firstRow = modalBody.querySelector('.document-modal-content .form-row') as HTMLElement | null;

          const logEl = (label: string, el: HTMLElement | null) => {
            if (!el) { 
              console.warn(`🧪 [Chat] ${label} not found`); 
              return; 
            }
            const cs = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            console.log(`🧪 [Chat] ${label} → display=${cs.display} visibility=${cs.visibility} height=${r.height} width=${r.width}`);
          };
          logEl('document-modal-content', container);
          logEl('document-modal-content form', form);
          logEl('first ant-card', card);
          logEl('first .form-row', firstRow);

          // Count controls
          const inputs = modalBody.querySelectorAll('input, textarea, nz-select');
          console.log('🧪 [Chat] Modal inputs/selects count =', inputs.length);

          // If content is still not rendered, try to force change detection
          if ((!container || inputs.length === 0) && attempt < 5) {
            console.log(`🧪 [Chat] Attempting to force change detection (attempt ${attempt})`);
            this.cdr.detectChanges();
            setTimeout(() => runCheck(attempt + 1), 200);
          } else if (attempt >= 5) {
            console.warn('🧪 [Chat] Modal content still not rendered after 5 attempts');
          }
        } else {
          console.warn('🧪 [Chat] Modal body element not found for debug');
        }
      };
      setTimeout(() => runCheck(1), 100);
    } catch (e) {
      console.warn('🧪 [Chat] debugModalLayoutCheck error:', e);
    }
  }
}


