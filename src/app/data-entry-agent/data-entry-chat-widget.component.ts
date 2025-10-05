import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { DataEntryAgentService, ExtractedData } from '../services/data-entry-agent.service';
import { Subject, Subscription } from 'rxjs';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type: 'text' | 'loading' | 'progress' | 'dropdown' | 'contact-form' | 'confirmation';
  data?: any;
}

@Component({
  selector: 'app-data-entry-chat-widget',
  templateUrl: './data-entry-chat-widget.component.html',
  styleUrls: ['./data-entry-chat-widget.component.scss']
})
export class DataEntryChatWidgetComponent implements OnInit, OnDestroy {
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
  
  // Document upload
  uploadedFiles: File[] = [];
  showDocumentModal = false;
  pendingFiles: File[] = [];
  documentMetadataForm!: FormGroup;
  
  // Contact form
  contactForm!: FormGroup;
  showContactForm = false;
  contactsAdded: any[] = [];
  
  // Accumulated files
  accumulatedFiles: File[] = [];
  showAccumulatedFiles = false;
  
  // Progress tracking
  extractionProgress = 0;
  currentProcessingFile = '';
  showProgress = false;

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
    private fb: FormBuilder
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.initializeChat();
    // Open the chat automatically shortly after load
    setTimeout(() => {
      this.isOpen = true;
      this.isMinimized = false;
    }, 1000);
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private initializeForms(): void {
    // Contact form with proper validation
    this.contactForm = this.fb.group({
      name: ['', Validators.required],
      jobTitle: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      mobile: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{10,15}$/)]],
      landline: ['', Validators.pattern(/^\+?[0-9]{7,15}$/)],
      preferredLanguage: ['Arabic', Validators.required]
    });
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
    
    // Add quick action buttons
    setTimeout(() => {
      this.addQuickActions();
    }, 1000);
  }

  private addQuickActions(): void {
    console.log('🎯 Adding quick actions...');
    const actionMessage = {
      id: `actions_${Date.now()}`,
      role: 'assistant',
      content: `اختر إجراء سريع / Choose quick action:
      
🚀 **الإجراءات السريعة / Quick Actions:**`,
      timestamp: new Date(),
      type: 'text',
      data: {
        buttons: [
          { text: '📄 رفع مستند / Upload Document', action: 'upload' },
          { text: '✍️ إدخال يدوي / Manual Entry', action: 'manual' },
          { text: '❓ مساعدة / Help', action: 'help' }
        ]
      }
    };
    console.log('📦 Action message:', actionMessage);
    this.addMessage(actionMessage);
    console.log('✅ Actions added to messages array');
    console.log('📊 Total messages:', this.messages.length);
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
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    this.pendingFiles = Array.from(files);
    this.showDocumentModal = true;
    this.initializeDocumentForm();
  }

  private initializeDocumentForm(): void {
    this.documentMetadataForm = this.fb.group({
      documents: this.fb.array([])
    });

    const documentsArray = this.documentMetadataForm.get('documents') as FormArray;
    
    this.pendingFiles.forEach(file => {
      const detectedInfo = this.detectDocumentInfo(file.name);
      
      documentsArray.push(this.fb.group({
        country: [detectedInfo?.country || '', Validators.required],
        type: [detectedInfo?.type || '', Validators.required],
        description: [this.generateSmartDescription(file.name, detectedInfo)]
      }));
    });
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
    if (this.documentMetadataForm.valid) {
      const filesToProcess = [...this.pendingFiles];
      this.closeDocumentModal();
      
      const metadata = this.documentsFA.controls.map(control => ({
        country: control.get('country')?.value,
        type: control.get('type')?.value,
        description: control.get('description')?.value
      }));

      this.processDocumentsWithMetadata(filesToProcess, metadata);
    }
  }

  private async processDocumentsWithMetadata(files: File[], metadata: Array<{ country?: string; type: string; description: string }>): Promise<void> {
    try {
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

      // Remove progress
      this.messages = this.messages.filter(m => m.id !== progressMessage.id);

      // Display results
      this.displayExtractedDataWithLabels(extractedData);

      // Check missing fields
      const missingFields = this.checkMissingFields(extractedData);
      if (missingFields.length > 0) {
        setTimeout(() => {
          this.askForMissingField(missingFields[0]);
        }, 1500);
      } else {
        this.confirmDataBeforeSubmission();
      }

    } catch (error: any) {
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
    const required = [
      'firstName', 'firstNameAR', 'tax', 'CustomerType', 'ownerName',
      'buildingNumber', 'street', 'country', 'city',
      'salesOrganization', 'distributionChannel', 'division'
    ];
    
    const missing = required.filter(field => {
      const value = (data as any)[field];
      return !value || (typeof value === 'string' && value.trim() === '');
    });

    // Check contacts
    if (!data.contacts || data.contacts.length === 0) {
      missing.push('contacts');
    }

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

    let content = `📋 ${fieldLabel}\n\nاختر من القائمة / Select from list:\n\n`;
    
    options.forEach((opt, index) => {
      content += `${index + 1}. ${opt.label}\n`;
    });

    content += `\nاكتب الرقم أو الاسم / Type number or name`;

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
    const value = selected && selected.value !== undefined ? selected.value : selected;
    this.agentService.updateExtractedDataField(field, value);
    this.addMessage({
      id: `dropdown_selected_${Date.now()}`,
      role: 'assistant',
      content: `✅ تم اختيار / Selected: ${selected.label || value}`,
      timestamp: new Date(),
      type: 'text'
    });
    // Move to next field
    const extractedData = this.agentService.getExtractedData();
    const missingFields = this.checkMissingFields(extractedData);
    if (missingFields.length > 0) {
      setTimeout(() => this.askForMissingField(missingFields[0]), 500);
    } else {
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
        
        // Show new options
        setTimeout(() => {
          this.addQuickActions();
        }, 2000);
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
    switch(action) {
      case 'upload':
        document.getElementById('file-upload')?.click();
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
    this.addMessage({
      id: `edit_${Date.now()}`,
      role: 'assistant',
      content: `✏️ **تعديل البيانات / Edit Data**
      
اكتب اسم الحقل الذي تريد تعديله متبوعاً بالقيمة الجديدة.
Type the field name you want to edit followed by the new value.

مثال / Example: "tax: 123456789"`,
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
  }

  closeContactForm(): void {
    this.showContactForm = false;
    this.contactForm.reset({ preferredLanguage: 'Arabic' });
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
    this.showDocumentModal = true;
    this.initializeDocumentForm();
  }

  onCountryChange(selectedCountry: string, formIndex: number): void {
    const documentsArray = this.documentMetadataForm.get('documents') as FormArray;
    const docGroup = documentsArray?.at(formIndex);
    if (docGroup) {
      docGroup.patchValue({ type: '' });
    }
  }

  getDocumentTypesByCountry(country: string): string[] {
    return this.documentTypes[country] || ['Other'];
  }

  private addMessage(message: ChatMessage): ChatMessage {
    this.messages.push(message);
    
    // Limit messages
    if (this.messages.length > this.MAX_MESSAGES) {
      this.messages = this.messages.slice(-20);
    }
    
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
}


