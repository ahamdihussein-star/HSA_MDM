import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { DataEntryAgentService, ExtractedData } from '../services/data-entry-agent.service';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type: 'text' | 'loading' | 'progress' | 'dropdown' | 'contact-form';
  data?: any;
}

@Component({
  selector: 'app-data-entry-agent',
  templateUrl: './data-entry-agent.component.html',
  styleUrls: ['./data-entry-agent.component.scss']
})
export class DataEntryAgentComponent implements OnInit {
  messages: ChatMessage[] = [];
  newMessage = '';
  loading = false;
  
  // Document upload
  uploadedFiles: File[] = [];
  showDocumentModal = false;
  pendingFiles: File[] = [];
  documentMetadataForm!: FormGroup;
  
  // Contact form
  contactForm!: FormGroup;
  showContactForm = false;

  constructor(
    private agentService: DataEntryAgentService,
    private fb: FormBuilder
  ) {
    this.contactForm = this.fb.group({
      name: ['', Validators.required],
      jobTitle: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      mobile: ['', Validators.required],
      landline: [''],
      preferredLanguage: ['Arabic']
    });
  }

  ngOnInit(): void {
    this.initializeChat();
  }

  private initializeChat(): void {
    // Add welcome message after a short delay to ensure user profile is loaded
    setTimeout(() => {
      this.addWelcomeMessage();
    }, 500);
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

  onFileSelected(event: any): void {
    if (event.target && event.target.files && event.target.files.length > 0) {
      const files = Array.from(event.target.files) as File[];
      
      // Validate file types and sizes
      const validFiles = files.filter(file => {
        const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf';
        const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
        
        if (!isValidType) {
          console.warn(`Invalid file type: ${file.name}`);
          return false;
        }
        
        if (!isValidSize) {
          console.warn(`File too large: ${file.name}`);
          return false;
        }
        
        return true;
      });
      
      if (validFiles.length > 0) {
        this.pendingFiles = validFiles;
        this.openDocumentModal();
      }
      
      // Clear the input
      event.target.value = '';
    } else {
      console.warn('No files selected or event.target.files is undefined');
    }
  }

  openDocumentModal(): void {
    this.showDocumentModal = true;
    
    // Initialize form
    this.documentMetadataForm = this.fb.group({
      documents: this.fb.array([])
    });

    // Add form group for each file
    this.pendingFiles.forEach((file, index) => {
      this.addDocumentFormGroup(file);
    });
  }

  private addDocumentFormGroup(file: File): void {
    const documentsFA = this.documentMetadataForm.get('documents') as FormArray;
    
    // Smart detection
    const detectedInfo = this.guessDocumentType(file.name);
    
    const documentGroup = this.fb.group({
      name: [file.name],
      country: [detectedInfo?.country || ''],
      type: [detectedInfo?.type || ''],
      description: [this.generateSmartDescription(file.name, detectedInfo)]
    });
    
    documentsFA.push(documentGroup);
  }

  private guessDocumentType(filename: string): { country: string; type: string } | null {
    const lowerName = filename.toLowerCase();
    
    // Country detection
    let country = '';
    if (lowerName.includes('egypt') || lowerName.includes('cairo') || lowerName.includes('مصر')) {
      country = 'Egypt';
    } else if (lowerName.includes('uae') || lowerName.includes('dubai') || lowerName.includes('الإمارات')) {
      country = 'United Arab Emirates';
    } else if (lowerName.includes('saudi') || lowerName.includes('riyadh') || lowerName.includes('السعودية')) {
      country = 'Saudi Arabia';
    } else if (lowerName.includes('yemen') || lowerName.includes('اليمن')) {
      country = 'Yemen';
    }
    
    // Document type detection
    let type = '';
    if (lowerName.includes('commercial') || lowerName.includes('registration') || lowerName.includes('تجاري')) {
      type = 'Commercial Registration';
    } else if (lowerName.includes('tax') || lowerName.includes('ضريبي')) {
      type = 'Tax Card';
    } else if (lowerName.includes('license') || lowerName.includes('رخصة')) {
      type = 'Business License';
    }
    
    return country && type ? { country, type } : null;
  }

  private generateSmartDescription(filename: string, detectedInfo: any): string {
    let description = `Document: ${filename}`;
    if (detectedInfo?.country) {
      description += ` (${detectedInfo.country})`;
    }
    if (detectedInfo?.type) {
      description += ` - ${detectedInfo.type}`;
    }
    return description;
  }

  closeDocumentModal(): void {
    this.showDocumentModal = false;
    this.pendingFiles = [];
    this.documentMetadataForm.reset();
  }

  get documentsFA(): FormArray {
    return this.documentMetadataForm.get('documents') as FormArray;
  }

  get allDocumentTypes(): string[] {
    return [
      'Commercial Registration',
      'Tax Card',
      'Business License',
      'Trade License',
      'Tax Certificate'
    ];
  }

  saveDocuments(): void {
    if (this.documentMetadataForm.valid) {
      const filesToProcess = [...this.pendingFiles];
      this.closeDocumentModal();
      
      // Get metadata from form
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
      // Add user message about uploaded files
      const fileNames = files.map(f => f.name).join(', ');
      this.addMessage({
        id: `upload_${Date.now()}`,
        role: 'user',
        content: `📤 تم رفع ${files.length} مستند: ${fileNames}`,
        timestamp: new Date(),
        type: 'text'
      });

      // Show document details
      files.forEach((file, index) => {
        const meta = metadata[index];
        this.addMessage({
          id: `doc_${Date.now()}_${index}`,
          role: 'assistant',
          content: `📄 ${file.name} (${meta.type}) - ${meta.description}`,
          timestamp: new Date(),
          type: 'text'
        });
      });

      // Show loading message
      const progressMessage = this.addMessage({
        id: `progress_${Date.now()}`,
        role: 'assistant',
        content: '🔄 جاري معالجة المستندات...',
        timestamp: new Date(),
        type: 'loading'
      });

      // Process documents with timeout
      await Promise.race([
        this.agentService.uploadAndProcessDocuments(files, metadata),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Document processing timeout')), 60000))
      ]);

      // Remove loading message
      this.messages = this.messages.filter(m => m.id !== progressMessage.id);

      // Display extracted data
      const extractedData = this.agentService.getExtractedData();
      this.displayExtractedDataWithLabels(extractedData);

      // Check for missing fields
      const missingFields = this.checkMissingFields(extractedData);
      if (missingFields.length > 0) {
        this.askForMissingField(missingFields[0]);
      } else {
        this.addMessage({
          id: `complete_${Date.now()}`,
          role: 'assistant',
          content: '✅ جميع البيانات مكتملة!\n\n🔍 سأتحقق الآن من عدم وجود تكرار في النظام...',
          timestamp: new Date(),
          type: 'text'
        });
      }

    } catch (error: any) {
      console.error('Error processing documents:', error);
      
      // Remove loading message
      this.messages = this.messages.filter(m => m.type !== 'loading');
      
      this.addMessage({
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: `❌ حدث خطأ أثناء معالجة المستندات:\n\nالتفاصيل: ${error.message}`,
        timestamp: new Date(),
        type: 'text'
      });
    }
  }

  private checkMissingFields(data: any): string[] {
    const requiredFields = [
      'firstName', 'firstNameAR', 'tax', 'CustomerType', 'ownerName',
      'buildingNumber', 'street', 'country', 'city',
      'salesOrganization', 'distributionChannel', 'division', 'contacts'
    ];
    
    return requiredFields.filter(field => {
      if (field === 'contacts') {
        return !data[field] || data[field].length === 0;
      }
      return !data[field] || data[field].trim() === '';
    });
  }

  private askForMissingField(field: string): void {
    const fieldLabel = this.getFieldLabel(field);
    
    if (this.isDropdownField(field)) {
      this.askForDropdownSelection(field, fieldLabel);
    } else if (field === 'contacts') {
      this.askForContactForm();
    } else {
      this.addMessage({
        id: `missing_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ بعض الحقول المطلوبة ناقصة:\n\n• ${fieldLabel}\n\nالرجاء إدخال البيانات الناقصة.`,
        timestamp: new Date(),
        type: 'text'
      });
    }
  }

  private isDropdownField(field: string): boolean {
    const dropdownFields = ['salesOrganization', 'distributionChannel', 'division', 'CustomerType'];
    return dropdownFields.includes(field);
  }

  private askForDropdownSelection(field: string, fieldLabel: string): void {
    const options = this.getDropdownOptions(field);
    
    this.addMessage({
      id: `dropdown_${Date.now()}`,
      role: 'assistant',
      content: `📋 يرجى اختيار ${fieldLabel}:`,
      timestamp: new Date(),
      type: 'dropdown',
      data: {
        field: field,
        label: fieldLabel,
        options: options
      }
    });
  }

  private getDropdownOptions(field: string): string[] {
    const options: { [key: string]: string[] } = {
      'salesOrganization': ['egypt_cairo_office', 'uae_dubai_office', 'saudi_riyadh_office', 'yemen_main_office'],
      'distributionChannel': ['direct_sales', 'retail_chains', 'wholesale', 'online'],
      'division': ['food_products', 'beverages', 'household_items', 'personal_care'],
      'CustomerType': ['Corporate', 'Individual']
    };
    return options[field] || [];
  }

  private askForContactForm(): void {
    this.addMessage({
      id: `contact_form_${Date.now()}`,
      role: 'assistant',
      content: '👥 يرجى إضافة معلومات جهة الاتصال:\n\nيمكنك إضافة عدة جهات اتصال قبل المتابعة.',
      timestamp: new Date(),
      type: 'contact-form'
    });
  }

  onDropdownSelection(field: string, value: string): void {
    this.agentService.updateExtractedDataField(field, value);
    
    this.addMessage({
      id: `selected_${Date.now()}`,
      role: 'user',
      content: `✅ تم اختيار: ${value}`,
      timestamp: new Date(),
      type: 'text'
    });

    // Check for next missing field
    const extractedData = this.agentService.getExtractedData();
    const missingFields = this.checkMissingFields(extractedData);
    
    if (missingFields.length > 0) {
      this.askForMissingField(missingFields[0]);
    } else {
      this.addMessage({
        id: `complete_${Date.now()}`,
        role: 'assistant',
        content: '✅ جميع البيانات مكتملة!\n\n🔍 سأتحقق الآن من عدم وجود تكرار في النظام...',
        timestamp: new Date(),
        type: 'text'
      });
    }
  }

  openContactForm(): void {
    this.showContactForm = true;
  }

  closeContactForm(): void {
    this.showContactForm = false;
  }

  saveContactForm(): void {
    if (this.contactForm.valid) {
      const contactData = this.contactForm.value;
      const currentData = this.agentService.getExtractedData();
      currentData.contacts = currentData.contacts || [];
      currentData.contacts.push(contactData);
      this.agentService.updateExtractedDataField('contacts', currentData.contacts);
      
      this.contactForm.reset();
      
      this.addMessage({
        id: `contact_saved_${Date.now()}`,
        role: 'assistant',
        content: `✅ تم إضافة جهة الاتصال: ${contactData.name}\n\nهل تريد إضافة جهة اتصال أخرى؟`,
        timestamp: new Date(),
        type: 'text'
      });
    }
  }

  continueWithoutMoreContacts(): void {
    this.closeContactForm();
    
    // Check for next missing field
    const extractedData = this.agentService.getExtractedData();
    const missingFields = this.checkMissingFields(extractedData);
    
    if (missingFields.length > 0) {
      this.askForMissingField(missingFields[0]);
    } else {
      this.addMessage({
        id: `complete_${Date.now()}`,
        role: 'assistant',
        content: '✅ جميع البيانات مكتملة!\n\n🔍 سأتحقق الآن من عدم وجود تكرار في النظام...',
        timestamp: new Date(),
        type: 'text'
      });
    }
  }

  private getFieldLabel(field: string): string {
    const labels: { [key: string]: string } = {
      'firstName': 'اسم الشركة بالإنجليزية / Company Name (EN)',
      'firstNameAR': 'اسم الشركة بالعربية / Company Name (AR)',
      'tax': 'الرقم الضريبي / Tax Number',
      'CustomerType': 'نوع العميل / Customer Type',
      'ownerName': 'اسم مالك الشركة / Company Owner Name',
      'buildingNumber': 'رقم المبنى / Building Number',
      'street': 'الشارع / Street',
      'country': 'الدولة / Country',
      'city': 'المدينة / City',
      'salesOrganization': 'المنظمة البيعية / Sales Organization',
      'distributionChannel': 'قناة التوزيع / Distribution Channel',
      'division': 'القسم / Division',
      'contacts': 'جهات الاتصال / Contacts'
    };
    return labels[field] || field;
  }

  private displayExtractedDataWithLabels(data: ExtractedData): void {
    let content = '📋 البيانات المستخرجة من المستندات:\n\n';
    
    // Company info
    content += '🏢 معلومات الشركة:\n';
    if (data.firstName) content += `✓ اسم الشركة بالإنجليزية / Company Name (EN): ${data.firstName}\n`;
    if (data.firstNameAR) content += `✓ اسم الشركة بالعربية / Company Name (AR): ${data.firstNameAR}\n`;
    if (data.tax) content += `✓ الرقم الضريبي / Tax Number: ${data.tax}\n`;
    if (data.CustomerType) content += `✓ نوع العميل / Customer Type: ${data.CustomerType}\n`;
    if (data.ownerName) content += `✓ اسم مالك الشركة / Company Owner Name: ${data.ownerName}\n`;
    
    // Address info
    content += '\n📍 معلومات العنوان:\n';
    if (data.buildingNumber) content += `✓ رقم المبنى / Building Number: ${data.buildingNumber}\n`;
    if (data.street) content += `✓ الشارع / Street: ${data.street}\n`;
    if (data.country) content += `✓ الدولة / Country: ${data.country}\n`;
    if (data.city) content += `✓ المدينة / City: ${data.city}\n`;
    
    // Sales area
    content += '\n💼 منطقة المبيعات:\n';
    if (data.salesOrganization) content += `✓ المنظمة البيعية / Sales Organization: ${data.salesOrganization}\n`;
    if (data.distributionChannel) content += `✓ قناة التوزيع / Distribution Channel: ${data.distributionChannel}\n`;
    if (data.division) content += `✓ القسم / Division: ${data.division}\n`;
    
    // Contacts
    if (data.contacts && data.contacts.length > 0) {
      content += '\n👥 جهات الاتصال:\n\n';
      data.contacts.forEach((contact, index) => {
        content += `جهة اتصال ${index + 1}:\n`;
        content += `• الاسم: ${contact.name}\n`;
        content += `• المسمى الوظيفي: ${contact.jobTitle}\n`;
        content += `• البريد الإلكتروني: ${contact.email}\n`;
        content += `• الجوال: ${contact.mobile}\n`;
        if (contact.landline) content += `• الهاتف الأرضي: ${contact.landline}\n`;
        content += '\n';
      });
    }
    
    content += '---\n💡 إذا كانت أي معلومة غير صحيحة، يمكنك إخباري بالصحيح وسأقوم بتعديلها.\nمثال: "اسم الشركة الصحيح هو ABC Company" أو "الرقم الضريبي خطأ، الصحيح 123456"';
    
    this.addMessage({
      id: `extracted_${Date.now()}`,
      role: 'assistant',
      content: content,
      timestamp: new Date(),
      type: 'text'
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
      // Check if this is a response to a missing field
      const lastMessage = this.messages[this.messages.length - 2];
      const isMissingFieldResponse = lastMessage && 
        lastMessage.role === 'assistant' && 
        lastMessage.content.includes('Company Owner Name');

      if (isMissingFieldResponse) {
        // Direct field update
        this.agentService.updateExtractedDataField('ownerName', userMessage);
        
        this.addMessage({
          id: `confirmed_${Date.now()}`,
          role: 'assistant',
          content: `✅ تم تحديث اسم مالك الشركة إلى: ${userMessage}`,
          timestamp: new Date(),
          type: 'text'
        });

        // Check for next missing field
        const extractedData = this.agentService.getExtractedData();
        const missingFields = this.checkMissingFields(extractedData);
        
        if (missingFields.length > 0) {
          this.askForMissingField(missingFields[0]);
        } else {
          this.addMessage({
            id: `complete_${Date.now()}`,
            role: 'assistant',
            content: '✅ جميع البيانات مكتملة!\n\n🔍 سأتحقق الآن من عدم وجود تكرار في النظام...',
            timestamp: new Date(),
            type: 'text'
          });
        }
      } else {
        // Use AI for general responses
        const loadingMessage = this.addMessage({
          id: `loading_${Date.now()}`,
          role: 'assistant',
          content: '🔄 جاري المعالجة...',
          timestamp: new Date(),
          type: 'loading'
        });

        try {
          const aiResponse = await Promise.race([
            this.agentService.sendMessage(userMessage),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 30000))
          ]) as any;

          // Remove loading message
          this.messages = this.messages.filter(m => m.id !== loadingMessage.id);

          this.addMessage({
            id: `ai_${Date.now()}`,
            role: 'assistant',
            content: aiResponse,
            timestamp: new Date(),
            type: 'text'
          });
        } catch (error: any) {
          // Remove loading message
          this.messages = this.messages.filter(m => m.id !== loadingMessage.id);
          
          this.addMessage({
            id: `error_${Date.now()}`,
            role: 'assistant',
            content: 'عذراً، حدث خطأ في معالجة رسالتك. الرجاء المحاولة مرة أخرى.\nSorry, there was an error processing your message. Please try again.',
            timestamp: new Date(),
            type: 'text'
          });
        }
      }
    } catch (error: any) {
      console.error('Error in sendMessage:', error);
      this.addMessage({
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'عذراً، حدث خطأ في معالجة رسالتك. الرجاء المحاولة مرة أخرى.\nSorry, there was an error processing your message. Please try again.',
        timestamp: new Date(),
        type: 'text'
      });
    } finally {
      this.loading = false;
    }
  }

  onEnterKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  removeDocument(index: number): void {
    this.uploadedFiles.splice(index, 1);
    this.agentService.removeDocument(`doc_${index}`);
  }

  getUploadedDocuments(): Array<{id: string, name: string, type: string, size: number, content: string}> {
    return this.agentService.getDocuments();
  }

  formatMessage(content: string): string {
    return content.replace(/\n/g, '<br>');
  }

  private addMessage(message: ChatMessage): ChatMessage {
    this.messages.push(message);
    
    // Limit message history to prevent memory leaks
    if (this.messages.length > 50) {
      this.messages = this.messages.slice(-30); // Keep last 30 messages
    }
    
    setTimeout(() => this.scrollToBottom(), 100);
    return message;
  }

  private scrollToBottom(): void {
    const chatBody = document.querySelector('.chat-body');
    if (chatBody) {
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  }
}
