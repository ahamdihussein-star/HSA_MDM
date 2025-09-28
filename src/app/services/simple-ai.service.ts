import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface ConversationState {
  currentStep: string;
  collectedData: any;
  isComplete: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SimpleAiService {
  private apiBase = environment.apiBaseUrl || 'http://localhost:3000/api';
  private conversationHistory: any[] = [];
  private state: ConversationState = {
    currentStep: 'start',
    collectedData: {},
    isComplete: false
  };

  // Simple step definitions
  private steps = [
    { id: 'company_name', question: 'إيه اسم الشركة؟', field: 'firstName' },
    { id: 'company_name_ar', question: 'إيه اسم الشركة بالعربي؟', field: 'firstNameAR' },
    { id: 'customer_type', question: 'إيه نوع العميل؟', field: 'CustomerType' },
    { id: 'owner_name', question: 'إيه اسم مالك الشركة؟', field: 'CompanyOwnerFullName' },
    { id: 'tax_number', question: 'إيه الرقم الضريبي؟', field: 'tax' },
    { id: 'country', question: 'إيه البلد؟', field: 'country' },
    { id: 'city', question: 'إيه المدينة؟', field: 'city' },
    { id: 'building_number', question: 'إيه رقم المبنى؟', field: 'buildingNumber' },
    { id: 'street', question: 'إيه اسم الشارع؟', field: 'street' },
    { id: 'add_contact', question: 'هل تريد إضافة جهة اتصال؟', field: 'AddContact', type: 'yesno' },
    { id: 'contact_name', question: 'إيه اسم الشخص المسؤول؟', field: 'ContactName', dependsOn: 'AddContact', dependsValue: 'yes' },
    { id: 'job_title', question: 'إيه المسمى الوظيفي؟', field: 'JobTitle', dependsOn: 'AddContact', dependsValue: 'yes' },
    { id: 'email', question: 'إيه الإيميل؟', field: 'EmailAddress', dependsOn: 'AddContact', dependsValue: 'yes' },
    { id: 'mobile', question: 'إيه رقم الموبايل؟', field: 'MobileNumber', dependsOn: 'AddContact', dependsValue: 'yes' },
    { id: 'landline', question: 'إيه رقم الأرضي؟ (اختياري)', field: 'Landline', dependsOn: 'AddContact', dependsValue: 'yes', optional: true },
    { id: 'preferred_language', question: 'إيه اللغة المفضلة؟', field: 'PrefferedLanguage', dependsOn: 'AddContact', dependsValue: 'yes' },
    { id: 'add_another_contact', question: 'هل تريد إضافة جهة اتصال أخرى؟', field: 'ContactComplete', dependsOn: 'AddContact', dependsValue: 'yes', type: 'yesno' },
    { id: 'add_document', question: 'هل تريد إضافة مستند؟', field: 'AddDocument', type: 'yesno' },
    { id: 'document_type', question: 'إيه نوع المستند؟', field: 'DocumentType', dependsOn: 'AddDocument', dependsValue: 'yes' },
    { id: 'document_description', question: 'إيه الوصف للمستند؟ (اختياري)', field: 'DocumentDescription', dependsOn: 'AddDocument', dependsValue: 'yes', optional: true },
    { id: 'document_upload', question: 'ممتاز! يمكنك رفع المستند الآن. اسحب الملف هنا أو اضغط لاختياره', field: 'DocumentUpload', dependsOn: 'AddDocument', dependsValue: 'yes' },
    { id: 'add_another_document', question: 'هل تريد إضافة مستند آخر؟', field: 'DocumentComplete', dependsOn: 'AddDocument', dependsValue: 'yes', type: 'yesno' },
    { id: 'sales_org', question: 'الآن سأضيف معلومات منطقة المبيعات. إيه منظمة المبيعات؟ (اختياري)', field: 'SalesOrgOption', optional: true },
    { id: 'distribution_channel', question: 'إيه قناة التوزيع؟ (اختياري)', field: 'DistributionChannelOption', optional: true },
    { id: 'division', question: 'إيه القسم؟ (اختياري)', field: 'DivisionOption', optional: true }
  ];

  constructor(private http: HttpClient) {}

  // AI-powered conversation enhancement
  private async enhanceWithAI(userMessage: string, currentStep: any): Promise<string> {
    try {
      const prompt = `
You are an intelligent customer data collection assistant. 
Current step: ${currentStep.question}
User response: "${userMessage}"

Please provide a natural, helpful response that:
1. Acknowledges the user's input
2. Provides guidance if needed
3. Is friendly and professional
4. Responds in Arabic

Keep it concise and natural.
      `;

      const response = await this.http.post<any>(environment.openaiApiUrl, {
        model: environment.openaiModel,
        messages: [
          { role: 'system', content: 'You are a helpful Arabic-speaking customer service assistant.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${environment.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      }).toPromise();

      return response.choices[0].message.content || currentStep.question;
    } catch (error) {
      console.error('AI enhancement failed:', error);
      return currentStep.question;
    }
  }

  // Main conversation handler
  async processMessage(userMessage: string, isFileUpload: boolean = false): Promise<{ message: string, buttons?: any[], dropdown?: any[], showUpload?: boolean }> {
    console.log('🤖 Simple AI: Processing message:', userMessage);
    console.log('🤖 Current state:', this.state);

    // Add user message to history
    this.conversationHistory.push({ role: 'user', content: userMessage });

    // Handle greetings
    if (this.isGreeting(userMessage)) {
      const response = 'صباح النور! كيف يمكنني مساعدتك اليوم؟';
      this.conversationHistory.push({ role: 'assistant', content: response });
      return { message: response };
    }

    // Handle new customer creation
    if (this.isNewCustomerRequest(userMessage)) {
      this.resetState();
      const response = 'ممتاز! سأساعدك في إنشاء عميل جديد. دعنا نبدأ:';
      this.conversationHistory.push({ role: 'assistant', content: response });
      
      // Start with first question immediately
      const firstStep = this.steps[0];
      this.state.currentStep = firstStep.id;
      const firstQuestion = firstStep.question;
      this.conversationHistory.push({ role: 'assistant', content: firstQuestion });
      
      return { message: firstQuestion };
    }

    // Process current step
    const currentStep = this.getCurrentStep();
    if (!currentStep) {
      return { message: 'تم جمع جميع المعلومات المطلوبة! هل تريد حفظ العميل الآن؟' };
    }

    // Extract data from user response
    this.extractDataFromResponse(userMessage, currentStep, isFileUpload);

    // Get next step
    const nextStep = this.getNextStep();
    if (!nextStep) {
      return { message: 'تم جمع جميع المعلومات المطلوبة! هل تريد حفظ العميل الآن؟' };
    }

    // Prepare response
    const response = await this.prepareResponse(nextStep, userMessage);
    this.conversationHistory.push({ role: 'assistant', content: response.message });

    return response;
  }

  private isGreeting(message: string): boolean {
    const greetings = ['صباح الخير', 'صباح النور', 'صباخ الخير', 'صباخ النور', 'مرحبا', 'أهلا', 'hello', 'hi'];
    return greetings.some(greeting => message.toLowerCase().includes(greeting.toLowerCase()));
  }

  private isNewCustomerRequest(message: string): boolean {
    const patterns = ['ضيف عميل', 'عميل جديد', 'new customer', 'add customer'];
    return patterns.some(pattern => message.toLowerCase().includes(pattern.toLowerCase()));
  }

  private resetState(): void {
    this.state = {
      currentStep: 'start',
      collectedData: {},
      isComplete: false
    };
    console.log('🔄 State reset');
  }

  private getCurrentStep() {
    if (this.state.currentStep === 'start') {
      return this.steps[0];
    }
    return this.steps.find(step => step.id === this.state.currentStep);
  }

  private getNextStep() {
    const currentIndex = this.steps.findIndex(step => step.id === this.state.currentStep);
    console.log('🔍 Getting next step. Current step:', this.state.currentStep, 'Current index:', currentIndex);
    
    // Start from current step to check if it's completed, then move to next
    for (let i = currentIndex; i < this.steps.length; i++) {
      const step = this.steps[i];
      console.log('🔍 Checking step:', step.id, 'field:', step.field, 'hasData:', !!this.state.collectedData[step.field]);
      
      // Check dependencies
      if (step.dependsOn) {
        const dependsValue = this.state.collectedData[step.dependsOn];
        console.log('🔍 Dependency check:', step.dependsOn, '=', dependsValue, 'expected:', step.dependsValue);
        if (dependsValue !== step.dependsValue) {
          console.log('🔍 Skipping step due to dependency');
          continue; // Skip this step
        }
      }
      
      // Check if step is already completed
      if (this.state.collectedData[step.field] && !step.optional) {
        console.log('🔍 Skipping completed step:', step.id);
        continue; // Skip completed required steps
      }
      
      // Check if step is optional and should be skipped
      if (step.optional && !this.state.collectedData[step.field]) {
        console.log('🔍 Skipping optional step:', step.id);
        continue; // Skip optional steps that aren't filled
      }
      
      console.log('🔍 Returning step:', step.id);
      // If this is the current step and it's not completed, return it
      // If this is a future step and it's not completed, return it
      return step;
    }
    
    console.log('🔍 No more steps');
    return null; // No more steps
  }

  private extractDataFromResponse(userMessage: string, step: any, isFileUpload: boolean = false): void {
    console.log('🔍 Extracting data for step:', step.id, 'field:', step.field, 'userMessage:', userMessage);
    
    if (step.type === 'yesno') {
      if (userMessage.toLowerCase().includes('نعم') || userMessage.toLowerCase().includes('yes')) {
        this.state.collectedData[step.field] = 'yes';
      } else if (userMessage.toLowerCase().includes('لا') || userMessage.toLowerCase().includes('no')) {
        this.state.collectedData[step.field] = 'no';
      }
    } else if (step.id === 'document_upload' && isFileUpload) {
      // Handle file upload
      this.state.collectedData[step.field] = 'uploaded';
      this.state.collectedData['DocumentUploaded'] = 'yes';
    } else {
      this.state.collectedData[step.field] = userMessage.trim();
    }
    
    console.log('📊 Extracted data:', step.field, '=', this.state.collectedData[step.field]);
    console.log('📊 Current collected data:', this.state.collectedData);
  }

  private async prepareResponse(step: any, userMessage?: string): Promise<{ message: string, buttons?: any[], dropdown?: any[], showUpload?: boolean }> {
    this.state.currentStep = step.id;
    
    // Use AI to enhance the response if user message is provided
    let message = step.question;
    if (userMessage) {
      message = await this.enhanceWithAI(userMessage, step);
    }
    
    const response: any = { message };
    
    if (step.type === 'yesno') {
      response.buttons = [
        { text: 'نعم', value: 'نعم', type: 'yes' },
        { text: 'لا', value: 'لا', type: 'no' }
      ];
    } else if (step.id === 'document_type') {
      response.dropdown = [
        { value: 'Commercial Registration', label: 'Commercial Registration', id: 1 },
        { value: 'Tax Certificate', label: 'Tax Certificate', id: 2 },
        { value: 'Trade License', label: 'Trade License', id: 3 },
        { value: 'Other', label: 'Other', id: 4 }
      ];
    } else if (step.id === 'customer_type') {
      response.dropdown = [
        { value: 'Limited Liability Company', label: 'Limited Liability Company', id: 1 },
        { value: 'Joint Stock Company', label: 'Joint Stock Company', id: 2 },
        { value: 'Partnership', label: 'Partnership', id: 3 },
        { value: 'Sole Proprietorship', label: 'Sole Proprietorship', id: 4 },
        { value: 'Other', label: 'Other', id: 5 }
      ];
    } else if (step.id === 'document_upload') {
      response.showUpload = true;
    }
    
    return response;
  }

  // Get current collected data
  getCollectedData(): any {
    return { ...this.state.collectedData };
  }

  // Check if data is complete
  isDataComplete(): boolean {
    const requiredFields = this.steps.filter(step => !step.optional && !step.dependsOn);
    return requiredFields.every(step => this.state.collectedData[step.field]);
  }

  // Handle file upload
  async handleFileUpload(file: File): Promise<{ message: string, buttons?: any[], dropdown?: any[], showUpload?: boolean }> {
    console.log('📁 File uploaded:', file.name);
    
    // Add file info to conversation history
    this.conversationHistory.push({ role: 'user', content: `File uploaded: ${file.name}` });
    
    // Process as file upload
    return await this.processMessage(`File uploaded: ${file.name}`, true);
  }
}
