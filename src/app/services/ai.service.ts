import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CUSTOMER_TYPE_OPTIONS,
  SALES_ORG_OPTIONS,
  DISTRIBUTION_CHANNEL_OPTIONS,
  DIVISION_OPTIONS,
  COUNTRY_OPTIONS,
  PREFERRED_LANGUAGE_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  getCitiesByCountry
} from '../shared/lookup-data';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeResponse {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface SystemContext {
  userRole: string;
  currentUser: string;
  availableData: any;
  systemStatus: any;
  userLanguage?: string;
  userMessage?: string;
  conversationState?: {
    isInCreateMode: boolean;
    isInUpdateMode: boolean;
    isInTaskMode: boolean;
    isInStatusMode: boolean;
    currentStep: number;
    totalSteps: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private apiBase = environment.apiBaseUrl || 'http://localhost:3000/api';
  private openaiApiKey = environment.openaiApiKey || 'your-openai-api-key';
  private openaiApiUrl = environment.openaiApiUrl || 'https://api.openai.com/v1/chat/completions';
  private openaiModel = environment.openaiModel || 'gpt-3.5-turbo';
  
  private conversationHistory: ClaudeMessage[] = [];
  private systemContext: SystemContext | null = null;
  
  // Question tracking for debugging
  private questionCounts: { [key: string]: number } = {};
  
  // Section transition tracking
  private sectionTransitions: { [key: string]: boolean } = {};
  
  // Collected customer data cache
  private collectedCustomerData: any = null;
  
  // Observable for real-time updates
  private aiResponseSubject = new BehaviorSubject<string>('');
  public aiResponse$ = this.aiResponseSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeSystemContext();
  }

  // Track question counts for debugging
  private trackQuestion(question: string): void {
    if (!this.questionCounts[question]) {
      this.questionCounts[question] = 0;
    }
    this.questionCounts[question]++;
    console.log('📊 QUESTION TRACKING:', {
      question: question,
      count: this.questionCounts[question],
      allCounts: this.questionCounts
    });
  }

  // Get question statistics
  public getQuestionStats(): { [key: string]: number } {
    return { ...this.questionCounts };
  }

  // Reset section transitions (call when starting new conversation)
  public resetSectionTransitions(): void {
    this.sectionTransitions = {};
    this.questionCounts = {};
    this.collectedCustomerData = null;
    console.log('🔄 Section transitions, question counts, and collected data reset');
  }

  // Validate document upload
  private validateDocumentUpload(): { hasUploaded: boolean, uploadedFiles: any[] } {
    console.log('📄 ====== DOCUMENT VALIDATION START ======');
    
    // Check if there are any uploaded files in the conversation
    const uploadedFiles: any[] = [];
    let hasUploaded = false;
    
    for (const message of this.conversationHistory) {
      if (message.role === 'user' && message.content) {
        // Check if the message indicates file upload
        const content = message.content.toLowerCase();
        if (content.includes('تم الرفع') || content.includes('uploaded') || 
            content.includes('تم رفع') || content.includes('file uploaded') ||
            content.includes('تم تحميل') || content.includes('file loaded')) {
          hasUploaded = true;
          uploadedFiles.push({
            message: message.content,
            timestamp: new Date().toISOString()
          });
          console.log('📄 Found uploaded file indication:', message.content);
        }
      }
    }
    
    console.log('📄 Document validation result:', {
      hasUploaded: hasUploaded,
      uploadedFilesCount: uploadedFiles.length,
      uploadedFiles: uploadedFiles
    });
    console.log('📄 ====== DOCUMENT VALIDATION END ======');
    
    return { hasUploaded, uploadedFiles };
  }

  // Determine current section and add transition messages
  private getCurrentSection(collectedData: any): { section: string, transitionMessage?: string } {
    console.log('📋 ====== SECTION DETECTION START ======');
    
    // Check if company info is complete
    const companyFields = ['firstName', 'firstNameAR', 'CustomerType', 'CompanyOwnerFullName', 'tax', 'country', 'city'];
    const companyComplete = companyFields.every(field => collectedData[field] && collectedData[field] !== '');
    
    // Check if contact info is complete
    const contactFields = ['ContactName', 'JobTitle', 'EmailAddress', 'MobileNumber', 'PrefferedLanguage'];
    const contactComplete = contactFields.every(field => collectedData[field] && collectedData[field] !== '');
    
    // Check if document info is complete
    const documentFields = ['AddDocument', 'DocumentType'];
    const documentComplete = documentFields.every(field => collectedData[field] && collectedData[field] !== '');
    
    console.log('📋 Section completion status:', {
      companyComplete: companyComplete,
      contactComplete: contactComplete,
      documentComplete: documentComplete,
      sectionTransitions: this.sectionTransitions
    });
    
    if (!companyComplete) {
      console.log('📋 Current section: Company Information');
      console.log('📋 ====== SECTION DETECTION END ======');
      return { section: 'company' };
    } else if (companyComplete && !contactComplete && !this.sectionTransitions['contact']) {
      console.log('📋 Transitioning to Contact Information section');
      this.sectionTransitions['contact'] = true;
      console.log('📋 ====== SECTION DETECTION END ======');
      return { 
        section: 'contact', 
        transitionMessage: 'ممتاز! تم جمع جميع المعلومات الأساسية عن الشركة. الآن دعنا نجمع معلومات الاتصال.'
      };
    } else if (contactComplete && !documentComplete && !this.sectionTransitions['document']) {
      console.log('📋 Transitioning to Document Information section');
      this.sectionTransitions['document'] = true;
      console.log('📋 ====== SECTION DETECTION END ======');
      return { 
        section: 'document', 
        transitionMessage: 'ممتاز! تم جمع معلومات الاتصال. الآن دعنا نجمع المستندات المطلوبة.'
      };
    } else if (documentComplete && !this.sectionTransitions['sales']) {
      console.log('📋 Transitioning to Sales Information section');
      this.sectionTransitions['sales'] = true;
      console.log('📋 ====== SECTION DETECTION END ======');
      return { 
        section: 'sales', 
        transitionMessage: 'ممتاز! تم جمع المستندات. الآن دعنا نجمع معلومات منطقة المبيعات.'
      };
    } else {
      console.log('📋 All sections complete');
      console.log('📋 ====== SECTION DETECTION END ======');
      return { section: 'complete' };
    }
  }

  private async initializeSystemContext(): Promise<void> {
    try {
      // Get system data for context
      const [requests, stats] = await Promise.all([
        this.http.get<any[]>(`${this.apiBase}/requests`).toPromise(),
        this.http.get<any>(`${this.apiBase}/requests/admin/data-stats`).toPromise()
      ]);

      this.systemContext = {
        userRole: sessionStorage.getItem('userRole') || 'data_entry',
        currentUser: sessionStorage.getItem('username') || 'Unknown',
        availableData: {
          totalRequests: requests?.length || 0,
          recentRequests: requests?.slice(0, 5) || []
        },
        systemStatus: stats || {}
      };
    } catch (error) {
      console.error('Error initializing system context:', error);
    }
  }

  async sendMessage(userMessage: string, context?: any): Promise<{content: string, dropdownOptions?: any[], buttons?: any[], showDocumentForm?: boolean}> {
    try {
      console.log('🤖 User message:', userMessage);
      
      // Add user message to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage
      });
      console.log('🤖 Added user message to history. New length:', this.conversationHistory.length);

      // Check if this is a greeting first
      if (this.isGreeting(userMessage)) {
        console.log('🤖 Detected greeting');
        const greetingResponse = this.handleGreeting(userMessage);
        this.conversationHistory.push({ role: 'assistant', content: greetingResponse });
        this.aiResponseSubject.next(greetingResponse);
        console.log('🤖 Returning greeting response:', greetingResponse);
        return {
          content: greetingResponse,
          dropdownOptions: undefined,
          buttons: undefined
        };
      }

      // Check if user wants to create customer
      if (this.isCustomerCreationRequest(userMessage)) {
        console.log('🤖 Detected customer creation request');
        // Reset section transitions for new conversation
        this.resetSectionTransitions();
        const nextQuestion = this.getNextRequiredField();
        console.log('🤖 Next question from getNextRequiredField:', nextQuestion);
        this.conversationHistory.push({ role: 'assistant', content: nextQuestion });
        this.aiResponseSubject.next(nextQuestion);
        
        const dropdownOptions = this.extractDropdownOptions(nextQuestion);
        const buttons = this.extractButtons(nextQuestion);
        console.log('🤖 Dropdown options:', dropdownOptions);
        console.log('🤖 Buttons:', buttons);
        return {
          content: nextQuestion,
          dropdownOptions: dropdownOptions,
          buttons: buttons,
          showDocumentForm: false
        };
      }

      // Extract data from user message
      // Extract and store data from the conversation (user message already added above)
      // this.extractAndStoreData(userMessage); // Removed to avoid duplication

      // Check if we have all required data
      const collectedData = this.extractCustomerDataFromConversation();
      const isComplete = this.isCustomerDataComplete(collectedData);
      
      if (isComplete) {
        console.log('🤖 Data is complete! Saving to API...');
        // Save customer data to API
        const result = await this.saveCustomerToAPI(collectedData);
        console.log('🤖 Save result:', result);
        
        // Return success message
        return {
          content: result.success ? 
            '🎉 ممتاز! تم إرسال طلبك بنجاح للمراجعة. سيتم مراجعة البيانات والموافقة عليها قريباً.' :
            '❌ حدث خطأ في إرسال الطلب. يرجى المحاولة مرة أخرى.',
          dropdownOptions: undefined,
          buttons: undefined,
          showDocumentForm: false
        };
      }

      // Get next required field using script logic
      const nextQuestion = this.getNextRequiredField();
      console.log('🤖 Next question:', nextQuestion);
      this.conversationHistory.push({ role: 'assistant', content: nextQuestion });
      this.aiResponseSubject.next(nextQuestion);
      
      const dropdownOptions = this.extractDropdownOptions(nextQuestion);
      const buttons = this.extractButtons(nextQuestion);
      return {
        content: nextQuestion,
        dropdownOptions: dropdownOptions,
        buttons: buttons,
        showDocumentForm: false
      };
    } catch (error) {
      console.error('🤖 Error in AI service:', error);
      // Fallback to intelligent local responses
      return {
        content: this.getIntelligentResponse(userMessage),
        dropdownOptions: undefined,
        buttons: undefined,
        showDocumentForm: false
      };
    }
  }

  // Extract buttons from AI response
  private extractButtons(response: string): any[] | undefined {
    console.log('🔘 ====== EXTRACT BUTTONS START ======');
    console.log('🔘 Input response:', response);
    
  // Check for optional field questions that need skip buttons
  if (response.includes('رقم الأرضي') && response.includes('اختياري')) {
    console.log('🔘 Found landline skip button');
    const buttons = [
      { text: 'تخطي', value: 'تخطي', type: 'skip' }
    ];
    console.log('🔘 Built landline skip buttons:', buttons);
    console.log('🔘 ====== EXTRACT BUTTONS END (LANDLINE SKIP) ======');
    return buttons;
  }
  
  if (response.includes('وصف للمستند') && response.includes('اختياري')) {
    console.log('🔘 Found document description skip button');
    const buttons = [
      { text: 'تخطي', value: 'تخطي', type: 'skip' }
    ];
    console.log('🔘 Built document description skip buttons:', buttons);
    console.log('🔘 ====== EXTRACT BUTTONS END (DOCUMENT DESCRIPTION SKIP) ======');
    return buttons;
  }
  
  if (response.includes('رقم المبنى') && response.includes('اختياري')) {
    console.log('🔘 Found building number skip button');
    const buttons = [
      { text: 'تخطي', value: 'تخطي', type: 'skip' }
    ];
    console.log('🔘 Built building number skip buttons:', buttons);
    console.log('🔘 ====== EXTRACT BUTTONS END (BUILDING NUMBER SKIP) ======');
    return buttons;
  }
  
  if (response.includes('اسم الشارع') && response.includes('اختياري')) {
    console.log('🔘 Found street skip button');
    const buttons = [
      { text: 'تخطي', value: 'تخطي', type: 'skip' }
    ];
    console.log('🔘 Built street skip buttons:', buttons);
    console.log('🔘 ====== EXTRACT BUTTONS END (STREET SKIP) ======');
    return buttons;
  }
  
  if (response.includes('منظمة المبيعات') && response.includes('اختياري')) {
    console.log('🔘 Found sales org skip button');
    const buttons = [
      { text: 'تخطي', value: 'تخطي', type: 'skip' }
    ];
    console.log('🔘 Built sales org skip buttons:', buttons);
    console.log('🔘 ====== EXTRACT BUTTONS END (SALES ORG SKIP) ======');
    return buttons;
  }
  
  if (response.includes('قناة التوزيع') && response.includes('اختياري')) {
    console.log('🔘 Found distribution channel skip button');
    const buttons = [
      { text: 'تخطي', value: 'تخطي', type: 'skip' }
    ];
    console.log('🔘 Built distribution channel skip buttons:', buttons);
    console.log('🔘 ====== EXTRACT BUTTONS END (DISTRIBUTION CHANNEL SKIP) ======');
    return buttons;
  }
  
  if (response.includes('القسم') && response.includes('اختياري')) {
    console.log('🔘 Found division skip button');
    const buttons = [
      { text: 'تخطي', value: 'تخطي', type: 'skip' }
    ];
    console.log('🔘 Built division skip buttons:', buttons);
    console.log('🔘 ====== EXTRACT BUTTONS END (DIVISION SKIP) ======');
    return buttons;
  }
    
    // Check for Yes/No questions
    if (response.includes('هل تريد إضافة جهة اتصال أخرى') || response.includes('Do you want to add another contact')) {
      console.log('🔘 Found add another contact buttons');
      const buttons = [
        { text: 'نعم', value: 'نعم', type: 'yes' },
        { text: 'لا', value: 'لا', type: 'no' }
      ];
      console.log('🔘 Built add another contact buttons:', buttons);
      console.log('🔘 ====== EXTRACT BUTTONS END (ADD ANOTHER CONTACT) ======');
      return buttons;
    }
    
    if (response.includes('هل تريد إضافة مستند آخر') || response.includes('Do you want to add another document')) {
      console.log('🔘 Found add another document buttons');
      const buttons = [
        { text: 'نعم', value: 'نعم', type: 'yes' },
        { text: 'لا', value: 'لا', type: 'no' }
      ];
      console.log('🔘 Built add another document buttons:', buttons);
      console.log('🔘 ====== EXTRACT BUTTONS END (ADD ANOTHER DOCUMENT) ======');
      return buttons;
    }
    
    // Check for contact addition question
    if (response.includes('هل تريد إضافة جهة اتصال') || response.includes('Do you want to add a contact')) {
      console.log('🔘 Found add contact buttons');
      const buttons = [
        { text: 'نعم', value: 'نعم', type: 'yes' },
        { text: 'لا', value: 'لا', type: 'no' }
      ];
      console.log('🔘 Built add contact buttons:', buttons);
      console.log('🔘 ====== EXTRACT BUTTONS END (ADD CONTACT) ======');
      return buttons;
    }
    
    // Check for document addition question
    if (response.includes('هل تريد إضافة مستند') || response.includes('Do you want to add a document')) {
      console.log('🔘 Found add document buttons');
      const buttons = [
        { text: 'نعم', value: 'نعم', type: 'yes' },
        { text: 'لا', value: 'لا', type: 'no' }
      ];
      console.log('🔘 Built add document buttons:', buttons);
      console.log('🔘 ====== EXTRACT BUTTONS END (ADD DOCUMENT) ======');
      return buttons;
    }
    
    console.log('🔘 No buttons found for response');
    console.log('🔘 ====== EXTRACT BUTTONS END (NO BUTTONS) ======');
    return undefined;
  }

  // Check if response should show document upload form

  // Extract dropdown options from AI response
  private extractDropdownOptions(response: string): any[] | undefined {
    console.log('🔍 ====== EXTRACT DROPDOWN OPTIONS START ======');
    console.log('🔍 Input response:', response);
    
    // Check for specific field requests with more precise matching
    const fieldPatterns = {
      customerType: /إيه نوع العميل\?|What is the customer type\?|customer type\?|نوع العميل\?|نوع العميل|customer type|What is the Customer Type\?/i,
      country: /إيه البلد\?|What is the country\?|country\?|البلد\?|البلد|country|What is the Country\?/i,
      city: /إيه المدينة\?|What is the city\?|city\?|المدينة\?|المدينة|city|What is the City\?/i,
      preferredLanguage: /إيه اللغة المفضلة\?|What is the preferred language\?|preferred language\?|اللغة المفضلة\?|اللغة المفضلة|preferred language|What is the Preferred Language\?/i,
      salesOrg: /إيه منظمة المبيعات\?|What is the sales organization\?|sales organization\?|منظمة المبيعات\?|منظمة المبيعات|sales organization|What is the Sales Organization\?/i,
      distributionChannel: /إيه قناة التوزيع\?|What is the distribution channel\?|distribution channel\?|قناة التوزيع\?|قناة التوزيع|distribution channel|What is the Distribution Channel\?/i,
      division: /إيه القسم\?|What is the division\?|division\?|القسم\?|القسم|division|What is the Division\?/i,
      documentType: /إيه نوع المستند\?|What is the document type\?|document type\?|نوع المستند\?|What is the Document Type\?/i
    };
    
    // Find which specific field is being asked for
    let requestedField = null;
    let maxMatches = 0;
    
    // Check each field pattern and count matches
    for (const [field, pattern] of Object.entries(fieldPatterns)) {
      const matches = (response.match(pattern) || []).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        requestedField = field;
      }
    }
    
    // Special handling for document upload - override documentType if it's actually an upload request
    if (requestedField === 'documentType' && 
        (response.includes('يمكنك رفع المستند الآن') || response.includes('اسحب الملف هنا') || response.includes('upload the document now'))) {
      requestedField = null; // This should show file upload interface, not dropdown
      console.log('🔍 DEBUG: Overriding documentType to null for upload prompt');
    }
    
    // If multiple fields match, prioritize based on conversation context
    if (maxMatches > 0) {
      // Check conversation history to determine the most likely field
      const lastUserMessage = this.conversationHistory
        .filter(msg => msg.role === 'user')
        .pop()?.content || '';
      
      // If user just provided a country, next should be city
      if (lastUserMessage && COUNTRY_OPTIONS.some(country => 
        country.value === lastUserMessage || country.label === lastUserMessage)) {
        if (response.includes('المدينة') || response.includes('City') || response.includes('اختر المدينة')) {
          requestedField = 'city';
        }
      }
      
      // If user just provided a city, next should be street (no dropdown)
      if (lastUserMessage && response.includes('الشارع') || response.includes('Street')) {
        requestedField = null; // Street is free text, no dropdown
      }
    }
    
    // Additional check: Make sure we don't show dropdown for text fields
    const textFields = [
      'company owner', 'مالك الشركة', 'owner', 'name', 'اسم', 'address', 'عنوان',
      'street', 'شارع', 'building', 'مبنى', 'tax', 'ضريبة', 'email', 'إيميل',
      'mobile', 'موبايل', 'phone', 'هاتف', 'job title', 'مسمى وظيفي', 'description', 'وصف'
    ];
    
    // If response contains text field keywords, don't show dropdown
    const isTextField = textFields.some(field => 
      response.toLowerCase().includes(field.toLowerCase())
    );
    
    if (isTextField) {
      console.log('Text field detected, no dropdown needed');
      return undefined;
    }
    
    // Fallback: If no field detected but response contains common dropdown keywords
    if (!requestedField) {
      if (response.toLowerCase().includes('customer type') || response.includes('نوع العميل') || response.includes('type for this company') || response.includes('نوع العميل؟')) {
        requestedField = 'customerType';
      } else if (response.toLowerCase().includes('country') || response.includes('البلد') || response.includes('البلد؟')) {
        requestedField = 'country';
      } else if (response.toLowerCase().includes('city') || response.includes('المدينة') || response.includes('المدينة؟')) {
        requestedField = 'city';
      } else if (response.toLowerCase().includes('language') || response.includes('اللغة') || response.includes('اللغة المفضلة') || response.includes('اللغة المفضلة؟')) {
        requestedField = 'preferredLanguage';
      } else if (response.toLowerCase().includes('document') || response.includes('مستند') || response.includes('نوع المستند') || response.includes('نوع المستند؟')) {
        // Document type should show dropdown, but "هل تريد إضافة مستند؟" should show buttons
        if (response.includes('هل تريد إضافة مستند') || response.includes('Do you want to add a document')) {
          requestedField = null; // This should show buttons, not dropdown
        } else if (response.includes('يمكنك رفع المستند الآن') || response.includes('اسحب الملف هنا') || response.includes('upload the document now')) {
          requestedField = null; // This should show file upload interface, not dropdown
        } else {
          requestedField = 'documentType';
        }
      } else if (response.toLowerCase().includes('sales organization') || response.includes('منظمة المبيعات') || response.includes('منظمة المبيعات؟')) {
        requestedField = 'salesOrg';
      } else if (response.toLowerCase().includes('distribution channel') || response.includes('قناة التوزيع') || response.includes('قناة التوزيع؟')) {
        requestedField = 'distributionChannel';
      } else if (response.toLowerCase().includes('division') || response.includes('القسم') || response.includes('القسم؟')) {
        requestedField = 'division';
      }
    }
    
    console.log('=== DROPDOWN DETECTION DEBUG ===');
    console.log('Response being checked:', response);
    console.log('Requested field:', requestedField);
    console.log('Max matches:', maxMatches);
    console.log('All field patterns checked:', Object.keys(fieldPatterns));
    console.log('Pattern matches:', Object.entries(fieldPatterns).map(([field, pattern]) => ({
      field,
      matches: (response.match(pattern) || []).length,
      pattern: pattern.toString(),
      testResult: pattern.test(response)
    })));
    console.log('=== END DEBUG ===');
    
    if (!requestedField) return undefined;

    // Return dropdown options based on the specific requested field
    console.log('🔍 Returning dropdown options for field:', requestedField);
    switch (requestedField) {
      case 'customerType':
        console.log('🔍 Building customer type dropdown options');
        const customerTypeOptions = [
          { id: 0, value: '', label: 'اختر نوع العميل' }, // Placeholder
          ...CUSTOMER_TYPE_OPTIONS.map((option, index) => ({
            id: index + 1,
            value: option.value,
            label: option.label
          }))
        ];
        console.log('🔍 Built customer type options:', customerTypeOptions);
        console.log('🔍 ====== EXTRACT DROPDOWN OPTIONS END (CUSTOMER TYPE) ======');
        return customerTypeOptions;

      case 'country':
        console.log('🔍 Building country dropdown options');
        const countryOptions = [
          { id: 0, value: '', label: 'اختر البلد' }, // Placeholder
          ...COUNTRY_OPTIONS.map((option, index) => ({
            id: index + 1,
            value: option.value,
            label: option.label
          }))
        ];
        console.log('🔍 Built country options:', countryOptions);
        console.log('🔍 ====== EXTRACT DROPDOWN OPTIONS END (COUNTRY) ======');
        return countryOptions;

      case 'city':
        console.log('🔍 Building city dropdown options');
        const lastCountry = this.getLastSelectedCountry();
        console.log('Last selected country for city filtering:', lastCountry);
        
        if (lastCountry) {
          const cities = getCitiesByCountry(lastCountry);
          console.log('Available cities for', lastCountry, ':', cities);
          const cityOptions = [
            { id: 0, value: '', label: 'اختر المدينة' }, // Placeholder
            ...cities.map((city, index) => ({
              id: index + 1,
              value: city.value,
              label: city.label
            }))
          ];
          console.log('🔍 Built city options for', lastCountry, ':', cityOptions);
          console.log('🔍 ====== EXTRACT DROPDOWN OPTIONS END (CITY) ======');
          return cityOptions;
        }
        // Fallback: return all cities if no country selected
        const allCities: any[] = [{ id: 0, value: '', label: 'اختر المدينة' }]; // Placeholder
        let id = 1;
        Object.values(getCitiesByCountry('Egypt')).forEach(city => {
          allCities.push({ id: id++, value: city.value, label: city.label });
        });
        Object.values(getCitiesByCountry('Saudi Arabia')).forEach(city => {
          allCities.push({ id: id++, value: city.value, label: city.label });
        });
        Object.values(getCitiesByCountry('United Arab Emirates')).forEach(city => {
          allCities.push({ id: id++, value: city.value, label: city.label });
        });
        console.log('🔍 Built all cities options:', allCities);
        console.log('🔍 ====== EXTRACT DROPDOWN OPTIONS END (ALL CITIES) ======');
        return allCities;

      case 'preferredLanguage':
        console.log('🔍 Building preferred language dropdown options');
        const languageOptions = [
          { id: 0, value: '', label: 'اختر اللغة المفضلة' }, // Placeholder
          ...PREFERRED_LANGUAGE_OPTIONS.map((option, index) => ({
            id: index + 1,
            value: option.value,
            label: option.label
          }))
        ];
        console.log('🔍 Built language options:', languageOptions);
        console.log('🔍 ====== EXTRACT DROPDOWN OPTIONS END (LANGUAGE) ======');
        return languageOptions;

      case 'salesOrg':
        console.log('🔍 Building sales organization dropdown options');
        const salesOrgOptions = [
          { id: 0, value: '', label: 'اختر منظمة المبيعات' }, // Placeholder
          ...SALES_ORG_OPTIONS.map((option, index) => ({
            id: index + 1,
            value: option.value,
            label: option.label
          }))
        ];
        console.log('🔍 Built sales org options:', salesOrgOptions);
        console.log('🔍 ====== EXTRACT DROPDOWN OPTIONS END (SALES ORG) ======');
        return salesOrgOptions;

      case 'distributionChannel':
        console.log('🔍 Building distribution channel dropdown options');
        const distributionChannelOptions = [
          { id: 0, value: '', label: 'اختر قناة التوزيع' }, // Placeholder
          ...DISTRIBUTION_CHANNEL_OPTIONS.map((option, index) => ({
            id: index + 1,
            value: option.value,
            label: option.label
          }))
        ];
        console.log('🔍 Built distribution channel options:', distributionChannelOptions);
        console.log('🔍 ====== EXTRACT DROPDOWN OPTIONS END (DISTRIBUTION CHANNEL) ======');
        return distributionChannelOptions;

      case 'division':
        console.log('🔍 Building division dropdown options');
        const divisionOptions = [
          { id: 0, value: '', label: 'اختر القسم' }, // Placeholder
          ...DIVISION_OPTIONS.map((option, index) => ({
            id: index + 1,
            value: option.value,
            label: option.label
          }))
        ];
        console.log('🔍 Built division options:', divisionOptions);
        console.log('🔍 ====== EXTRACT DROPDOWN OPTIONS END (DIVISION) ======');
        return divisionOptions;

      case 'documentType':
        console.log('🔍 Building document type dropdown options');
        const documentTypeOptions = [
          { id: 0, value: '', label: 'اختر نوع المستند' }, // Placeholder
          ...DOCUMENT_TYPE_OPTIONS.map((option, index) => ({
            id: index + 1,
            value: option.value,
            label: option.label
          }))
        ];
        console.log('🔍 Built document type options:', documentTypeOptions);
        console.log('🔍 ====== EXTRACT DROPDOWN OPTIONS END (DOCUMENT TYPE) ======');
        return documentTypeOptions;

      default:
        console.log('🔍 No dropdown options found for field:', requestedField);
        console.log('🔍 ====== EXTRACT DROPDOWN OPTIONS END (NO OPTIONS) ======');
        return undefined;
    }
  }

  // Get the last selected country from conversation history
  private getLastSelectedCountry(): string | null {
    console.log('🌍 ====== GET LAST SELECTED COUNTRY START ======');
    console.log('🌍 Searching for country in conversation history:', this.conversationHistory);
    
    // Look through conversation history for country selection
    for (let i = this.conversationHistory.length - 1; i >= 0; i--) {
      const message = this.conversationHistory[i];
      if (message.role === 'user') {
        const content = message.content;
        console.log('Checking user message:', content);
        
        // Check if this is a country selection - exact match
        const countryMappings = {
          'Egypt': 'Egypt',
          'Saudi Arabia': 'Saudi Arabia', 
          'United Arab Emirates': 'United Arab Emirates',
          'Yemen': 'Yemen',
          'Kuwait': 'Kuwait',
          'Oman': 'Oman'
        };
        
        for (const [key, value] of Object.entries(countryMappings)) {
          if (content === key) {
            console.log('🌍 Found country match:', value);
            console.log('🌍 ====== GET LAST SELECTED COUNTRY END (COUNTRY FOUND) ======');
            return value;
          }
        }
      }
    }
    console.log('🌍 No country found in conversation history');
    console.log('🌍 ====== GET LAST SELECTED COUNTRY END (NO COUNTRY) ======');
    return null;
  }

  // Simple fallback - no pattern matching, just natural responses
  private getIntelligentResponse(userMessage: string): string {
    console.log('🧠 DEBUG: getIntelligentResponse - message:', userMessage);
    const isArabic = /[\u0600-\u06FF]/.test(userMessage);
    console.log('🧠 DEBUG: getIntelligentResponse - isArabic:', isArabic);
    
    // Check conversation context first
    const lastResponse = this.conversationHistory[this.conversationHistory.length - 1]?.content?.toLowerCase() || '';
    
    // If we just asked for company name, treat any response as company name
    if (lastResponse.includes('اسم الشركة') || lastResponse.includes('company name')) {
      const companyName = userMessage.trim();
      return isArabic 
        ? `ممتاز! تم حفظ اسم الشركة: ${companyName}. الآن ما هو عنوان الشركة؟`
        : `Great! Saved company name: ${companyName}. Now what's the company address?`;
    }
    
    // If we just asked for address, treat any response as address
    if (lastResponse.includes('عنوان الشركة') || lastResponse.includes('company address')) {
      const address = userMessage.trim();
      return isArabic 
        ? `رائع! العنوان: ${address}. ما هو رقم الهاتف؟`
        : `Great! Address: ${address}. What's the phone number?`;
    }
    
    // Simple natural response - no pattern matching
    const response = isArabic 
      ? 'مرحباً! 😊 أنا هنا لمساعدتك في إدارة البيانات. يمكنك أن تطلب مني إنشاء عملاء، تحديث المعلومات، عرض المهام، أو فحص الحالة. كيف يمكنني مساعدتك؟'
      : 'Hello! 😊 I\'m here to help you with data management. You can ask me to create customers, update information, view tasks, or check status. How can I assist you?';
    console.log('🧠 DEBUG: getIntelligentResponse - final response:', response);
    return response;
  }

  private async callOpenAIAPI(messages: any[]): Promise<ClaudeResponse> {
    console.log('🤖 DEBUG: callOpenAIAPI - messages:', messages);
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.openaiApiKey}`
    });

    const body = {
      model: this.openaiModel,
      max_tokens: 1000,
      messages: messages,
      temperature: 0.7
    };

    console.log('🤖 DEBUG: callOpenAIAPI - body:', body);
    const response = await this.http.post<any>(this.openaiApiUrl, body, { headers }).toPromise();
    console.log('🤖 DEBUG: callOpenAIAPI - response:', response);
    
    return {
      content: response.choices[0].message.content,
      usage: response.usage
    };
  }

  private buildConversationContext(): string {
    console.log('💬 DEBUG: buildConversationContext - history length:', this.conversationHistory.length);
    if (this.conversationHistory.length === 0) {
      console.log('💬 DEBUG: No conversation history, returning empty context');
      return '';
    }
    
    let context = 'Previous conversation:\n';
    this.conversationHistory.slice(-6).forEach(msg => {
      context += `${msg.role}: ${msg.content}\n`;
    });
    
    console.log('💬 DEBUG: Built conversation context:', context);
    return context;
  }

  private buildChecklist(): string {
    console.log('📋 ====== BUILD CHECKLIST START ======');
    const collectedData = this.extractCustomerDataFromConversation();
    console.log('📋 DEBUG: Collected data for checklist:', collectedData);
    
    const checklist = [
      { field: 'Company Name (firstName)', collected: !!collectedData.firstName, value: collectedData.firstName },
      { field: 'Company Name Arabic (firstNameAR)', collected: !!collectedData.firstNameAR, value: collectedData.firstNameAR },
      { field: 'Tax Number (tax)', collected: !!collectedData.tax, value: collectedData.tax },
      { field: 'Country (country)', collected: !!collectedData.country, value: collectedData.country },
      { field: 'City (city)', collected: !!collectedData.city, value: collectedData.city },
      { field: 'Street (street)', collected: !!collectedData.street, value: collectedData.street },
      { field: 'Building Number (buildingNumber)', collected: !!collectedData.buildingNumber, value: collectedData.buildingNumber },
      { field: 'Customer Type (CustomerType)', collected: !!collectedData.CustomerType, value: collectedData.CustomerType },
      { field: 'Company Owner (CompanyOwnerFullName)', collected: !!collectedData.CompanyOwnerFullName, value: collectedData.CompanyOwnerFullName },
      { field: 'Contact Name (ContactName)', collected: !!collectedData.ContactName, value: collectedData.ContactName },
      { field: 'Contact Job Title (JobTitle)', collected: !!collectedData.JobTitle, value: collectedData.JobTitle },
      { field: 'Contact Email (EmailAddress)', collected: !!collectedData.EmailAddress, value: collectedData.EmailAddress },
      { field: 'Contact Mobile (MobileNumber)', collected: !!collectedData.MobileNumber, value: collectedData.MobileNumber },
      { field: 'Contact Landline (Landline)', collected: !!collectedData.Landline, value: collectedData.Landline },
      { field: 'Contact Language (PrefferedLanguage)', collected: !!collectedData.PrefferedLanguage, value: collectedData.PrefferedLanguage },
      { field: 'Document Type (DocumentType)', collected: !!collectedData.DocumentType, value: collectedData.DocumentType },
      { field: 'Document Description (DocumentDescription)', collected: !!collectedData.DocumentDescription, value: collectedData.DocumentDescription },
      { field: 'Document Upload Confirmation', collected: !!collectedData.DocumentFile, value: collectedData.DocumentFile },
      { field: 'Sales Organization (SalesOrgOption)', collected: !!collectedData.SalesOrgOption, value: collectedData.SalesOrgOption },
      { field: 'Distribution Channel (DistributionChannelOption)', collected: !!collectedData.DistributionChannelOption, value: collectedData.DistributionChannelOption },
      { field: 'Division (DivisionOption)', collected: !!collectedData.DivisionOption, value: collectedData.DivisionOption }
    ];

    let checklistText = '';
    checklist.forEach((item, index) => {
      const status = item.collected ? '✅' : '❌';
      const value = item.collected ? ` (${item.value})` : '';
      checklistText += `${index + 1}. ${status} ${item.field}${value}\n`;
    });

    // Add summary
    const collectedCount = checklist.filter(item => item.collected).length;
    const totalCount = checklist.length;
    checklistText += `\nPROGRESS: ${collectedCount}/${totalCount} fields collected\n`;
    
    // Find next missing field
    const nextMissingField = checklist.find(item => !item.collected);
    if (nextMissingField) {
      checklistText += `NEXT: Ask for ${nextMissingField.field}\n`;
    } else {
      checklistText += `STATUS: All required fields collected! Ready to save.\n`;
    }

    console.log('📋 DEBUG: Generated checklist:', checklistText);
    console.log('📋 ====== BUILD CHECKLIST END ======');
    return checklistText;
  }

  // New helper methods for script-based flow control
  private isGreeting(message: string): boolean {
    const greetings = ['صباح الخير', 'صباخ الخير', 'صباح النور', 'مساء الخير', 'مساء النور', 'good morning', 'good afternoon', 'good evening', 'hello', 'hi', 'مرحبا', 'أهلا'];
    const result = greetings.some(greeting => message.toLowerCase().includes(greeting.toLowerCase()));
    console.log('🔍 DEBUG: isGreeting - message:', message);
    console.log('🔍 DEBUG: isGreeting - result:', result);
    return result;
  }

  private handleGreeting(message: string): string {
    console.log('👋 DEBUG: handleGreeting - message:', message);
    let response = '';
    if (message.includes('صباح') || message.includes('صباخ') || message.includes('مساء')) {
      response = 'صباح النور! كيف يمكنني مساعدتك اليوم؟';
    } else if (message.includes('good morning') || message.includes('good afternoon') || message.includes('good evening')) {
      response = 'Good morning! How can I help you today?';
    } else {
      response = 'مرحبا! كيف يمكنني مساعدتك اليوم؟';
    }
    console.log('👋 DEBUG: handleGreeting - response:', response);
    return response;
  }

  private isSkipResponse(message: string): boolean {
    const skipWords = ['تخطي', 'skip', 'تجاهل', 'ignore', 'لا', 'no', 'كفاية', 'enough', 'مش عايز', 'don\'t want', 'مش محتاج', 'don\'t need'];
    const result = skipWords.some(word => message.toLowerCase().includes(word.toLowerCase()));
    console.log('⏭️ DEBUG: isSkipResponse - message:', message, 'result:', result);
    return result;
  }

  private isCustomerCreationRequest(message: string): boolean {
    const requests = ['أريد إنشاء عميل جديد', 'create customer', 'new customer', 'عميل جديد', 'إنشاء عميل'];
    const result = requests.some(request => message.toLowerCase().includes(request.toLowerCase()));
    console.log('🔍 DEBUG: isCustomerCreationRequest - message:', message);
    console.log('🔍 DEBUG: isCustomerCreationRequest - result:', result);
    return result;
  }

  private getNextRequiredField(): string {
    const collectedData = this.extractCustomerDataFromConversation();
    
    // Check current section and add transition message if needed
    const sectionInfo = this.getCurrentSection(collectedData);
    if (sectionInfo.transitionMessage) {
      // Don't return transition message directly, continue to find the actual question
      console.log('📋 Section transition detected:', sectionInfo.transitionMessage);
    }
    
    // Define the exact sequence with proper workflow - MATCHING New Request Page
    const sequence = [
      { field: 'firstName', question: 'إيه اسم الشركة؟', questionEn: 'What is the company name?', optional: false },
      { field: 'firstNameAR', question: 'إيه اسم الشركة بالعربي؟', questionEn: 'What is the company name in Arabic?', optional: false },
      { field: 'CustomerType', question: 'إيه نوع العميل؟', questionEn: 'What is the customer type?', optional: false },
      { field: 'CompanyOwnerFullName', question: 'إيه اسم مالك الشركة؟', questionEn: 'What is the company owner name?', optional: false },
      { field: 'tax', question: 'إيه الرقم الضريبي؟', questionEn: 'What is the tax number?', optional: false },
      { field: 'country', question: 'إيه البلد؟', questionEn: 'What is the country?', optional: false },
      { field: 'city', question: 'إيه المدينة؟', questionEn: 'What is the city?', optional: false },
      { field: 'buildingNumber', question: 'إيه رقم المبنى؟', questionEn: 'What is the building number?', optional: false },
      { field: 'street', question: 'إيه اسم الشارع؟', questionEn: 'What is the street name?', optional: false },
      { field: 'AddContact', question: 'هل تريد إضافة جهة اتصال؟', questionEn: 'Do you want to add a contact?', optional: false },
      { field: 'ContactName', question: 'إيه اسم الشخص المسؤول؟', questionEn: 'What is the contact person name?', optional: false },
      { field: 'JobTitle', question: 'إيه المسمى الوظيفي؟', questionEn: 'What is the job title?', optional: false },
      { field: 'EmailAddress', question: 'إيه الإيميل؟', questionEn: 'What is the email address?', optional: false },
      { field: 'MobileNumber', question: 'إيه رقم الموبايل؟', questionEn: 'What is the mobile number?', optional: false },
      { field: 'Landline', question: 'إيه رقم الأرضي؟ (اختياري)', questionEn: 'What is the landline number? (optional)', optional: true },
      { field: 'PrefferedLanguage', question: 'إيه اللغة المفضلة؟', questionEn: 'What is the preferred language?', optional: false },
      { field: 'ContactComplete', question: 'هل تريد إضافة جهة اتصال أخرى؟', questionEn: 'Do you want to add another contact?', optional: false },
      { field: 'AddDocument', question: 'هل تريد إضافة مستند؟', questionEn: 'Do you want to add a document?', optional: false },
      { field: 'DocumentType', question: 'إيه نوع المستند؟', questionEn: 'What is the document type?', optional: false },
      { field: 'DocumentDescription', question: 'إيه الوصف للمستند؟ (اختياري)', questionEn: 'What is the document description? (optional)', optional: true },
      { field: 'DocumentUpload', question: 'ممتاز! يمكنك رفع المستند الآن. اسحب الملف هنا أو اضغط لاختياره', questionEn: 'Great! You can upload the document now. Drag the file here or click to select it', optional: false },
      { field: 'DocumentComplete', question: 'هل تريد إضافة مستند آخر؟', questionEn: 'Do you want to add another document?', optional: false },
      { field: 'SalesOrgOption', question: 'الآن سأضيف معلومات منطقة المبيعات. إيه منظمة المبيعات؟ (اختياري)', questionEn: 'Now I will add sales area information. What is the sales organization? (optional)', optional: true },
      { field: 'DistributionChannelOption', question: 'إيه قناة التوزيع؟ (اختياري)', questionEn: 'What is the distribution channel? (optional)', optional: true },
      { field: 'DivisionOption', question: 'إيه القسم؟ (اختياري)', questionEn: 'What is the division? (optional)', optional: true }
    ];

    // Special handling for contact workflow
    if (collectedData.AddContact === 'no') {
      // User said no to adding contact, skip to documents
      console.log('🔍 DEBUG: User said no to adding contact, skipping to documents');
      // Find first missing field after AddContact
      for (const item of sequence) {
        if (item.field === 'AddContact' || item.field === 'ContactName' || item.field === 'JobTitle' || 
            item.field === 'EmailAddress' || item.field === 'MobileNumber' || item.field === 'Landline' || 
            item.field === 'PrefferedLanguage' || item.field === 'ContactComplete') continue; // Skip all contact fields
        if (!collectedData[item.field] || collectedData[item.field] === '') {
          console.log('🔍 DEBUG: Found missing field after skipping contacts:', item.field);
          this.trackQuestion(item.question);
          return item.question;
        }
      }
    }
    
    if (collectedData.ContactComplete === 'no' || (collectedData.AddContact === 'no' && !collectedData.ContactComplete)) {
      // User said no to adding another contact OR no to adding contact in the first place, skip to documents
      console.log('🔍 DEBUG: User said no to adding contact, skipping to documents');
      // Find first missing field after ContactComplete
      for (const item of sequence) {
        if (item.field === 'ContactComplete') continue; // Skip the ContactComplete field
        if (item.field === 'Landline' && collectedData.AddContact === 'no') continue; // Skip Landline if no contact added
        if (!collectedData[item.field] || collectedData[item.field] === '') {
          console.log('🔍 DEBUG: Found missing field after ContactComplete:', item.field);
          this.trackQuestion(item.question);
          return item.question;
        }
      }
    }
    
    // Special handling for document workflow
    if (collectedData.AddDocument === 'no') {
      // User said no to adding document, skip to sales area
      console.log('🔍 DEBUG: User said no to adding document, skipping to sales area');
      // Find first missing field after AddDocument
      for (const item of sequence) {
        if (item.field === 'AddDocument' || item.field === 'DocumentType' || item.field === 'DocumentDescription' || item.field === 'DocumentUpload' || item.field === 'DocumentComplete') continue; // Skip all document fields
        if (!collectedData[item.field] || collectedData[item.field] === '') {
          console.log('🔍 DEBUG: Found missing field after skipping documents:', item.field);
          this.trackQuestion(item.question);
          return item.question;
        }
      }
    }
    
    if (collectedData.DocumentComplete === 'no') {
      // User said no to adding another document, skip to sales area
      console.log('🔍 DEBUG: User said no to adding another document, skipping to sales area');
      // Find first missing field after DocumentComplete
      for (const item of sequence) {
        if (item.field === 'DocumentComplete') continue; // Skip the DocumentComplete field
        if (!collectedData[item.field] || collectedData[item.field] === '') {
          console.log('🔍 DEBUG: Found missing field after DocumentComplete:', item.field);
          this.trackQuestion(item.question);
          return item.question;
        }
      }
    }

    // Validate document upload when we reach document workflow
    if (collectedData.AddDocument === 'yes' && collectedData.DocumentType && !collectedData.DocumentUploaded) {
      console.log('🔍 DEBUG: Document type provided but not uploaded yet, asking for upload');
      this.trackQuestion('ممتاز! يمكنك رفع المستند الآن. اسحب الملف هنا أو اضغط لاختياره');
      return 'ممتاز! يمكنك رفع المستند الآن. اسحب الملف هنا أو اضغط لاختياره';
    }
    
    if (collectedData.DocumentComplete === 'no') {
      // User said no to adding another document, skip to sales area
      console.log('🔍 DEBUG: User said no to adding another document, skipping to sales area');
      // Find first missing field after DocumentComplete
      for (const item of sequence) {
        if (item.field === 'DocumentComplete') continue; // Skip the DocumentComplete field
        if (!collectedData[item.field] || collectedData[item.field] === '') {
          console.log('🔍 DEBUG: Found missing field after DocumentComplete:', item.field);
          this.trackQuestion(item.question);
          return item.question;
        }
      }
    }

    // Find the first missing field
    for (const item of sequence) {
      const fieldValue = collectedData[item.field];
      const isEmpty = !fieldValue || fieldValue === '' || fieldValue === 'SKIPPED';
      
      console.log(`🔍 DEBUG: Checking field: ${item.field}, value: "${fieldValue}", isEmpty: ${isEmpty}, optional: ${item.optional}`);
      console.log(`🔍 DEBUG: Field type: ${typeof fieldValue}, length: ${fieldValue?.length || 0}`);
      
      // Skip contact fields if user said no to adding contact
      if (item.field === 'AddContact' && collectedData.AddContact === 'no') {
        console.log(`🔍 DEBUG: Skipping ${item.field} - user said no to adding contact`);
        continue;
      }
      
      // Skip contact fields if user said no to adding another contact
      if ((item.field === 'ContactName' || item.field === 'JobTitle' || item.field === 'EmailAddress' || 
           item.field === 'MobileNumber' || item.field === 'Landline' || item.field === 'PrefferedLanguage') && 
          (collectedData.AddContact === 'no' || collectedData.ContactComplete === 'no')) {
        console.log(`🔍 DEBUG: Skipping ${item.field} - no contact to add`);
        continue;
      }
      
      if (isEmpty && !item.optional) {
        console.log(`🔍 DEBUG: Found missing REQUIRED field: ${item.field}`);
        this.trackQuestion(item.question);
        return item.question;
      } else if (isEmpty && item.optional) {
        console.log(`🔍 DEBUG: Found missing OPTIONAL field: ${item.field} - SKIPPING`);
        // Skip optional fields - continue to next field
      } else {
        console.log(`🔍 DEBUG: Field ${item.field} already collected with value: "${fieldValue}"`);
      }
    }

    return 'تم جمع جميع المعلومات المطلوبة! هل تريد حفظ العميل الآن؟';
  }

  private extractAndStoreData(message: string): void {
    console.log('📝 ====== EXTRACT AND STORE DATA START ======');
    console.log('📝 Input message:', message);
    console.log('📝 Current conversation history length before:', this.conversationHistory.length);
    
    // Add user message to conversation history
    this.conversationHistory.push({ role: 'user', content: message });
    
    console.log('📝 Added user message to conversation history:', message);
    console.log('📝 Total conversation history length after:', this.conversationHistory.length);
    console.log('📝 ====== EXTRACT AND STORE DATA END ======');
  }

  private buildSystemPrompt(context?: any): string {
    console.log('📝 DEBUG: buildSystemPrompt - context:', context);
    const currentContext = this.systemContext || {
      userRole: 'data_entry',
      currentUser: 'Unknown',
      availableData: {},
      systemStatus: {}
    };
    console.log('📝 DEBUG: buildSystemPrompt - currentContext:', currentContext);

    // Build checklist based on conversation history
    const checklist = this.buildChecklist();

    const systemPrompt = `You are a data entry assistant. Your ONLY job is to ask for the next field. NEVER confirm or acknowledge previous answers.

FIRST PRIORITY - GREETING DETECTION:
- If user says "صباح الخير", "Good morning", "Hello", "Hi", etc. → Respond with greeting and ask how you can help
- ONLY start customer creation when user explicitly says "أريد إنشاء عميل جديد" or "create customer"
- NEVER assume user wants to create customer from greetings

CUSTOMER CREATION CHECKLIST:
${checklist}

CRITICAL: Use this checklist to know exactly what you've collected and what's missing. Always ask for the NEXT missing field in the sequence.

CHECKLIST USAGE RULES - CRITICAL:
1. ALWAYS look at the checklist above FIRST before asking any question
2. Find the NEXT missing field marked with ❌
3. Ask ONLY for that specific field - NEVER ask for fields marked with ✅
4. If a field is marked with ✅, it means you already collected it - DO NOT ask again
5. The "NEXT:" line tells you exactly what to ask for - follow it strictly
6. NEVER show error messages like "❌ Company Name Arabic (firstNameAR)" - this is FORBIDDEN
7. NEVER ask for fields that are already marked with ✅ in the checklist
8. ALWAYS follow the exact sequence in the checklist
6. NEVER ask for company name if it's marked with ✅ in the checklist
7. NEVER ask for contact job title if it's marked with ✅ in the checklist
8. NEVER ask for contact email if it's marked with ✅ in the checklist
9. ALWAYS check the checklist before every response

CHECKLIST EXAMPLES:
Example 1 - Start of conversation:
1. ❌ Company Name (firstName)
2. ❌ Company Name Arabic (firstNameAR)
...
NEXT: Ask for Company Name (firstName)
→ You should ask: "إيه اسم الشركة؟"

Example 2 - After collecting company name:
1. ✅ Company Name (firstName) (ABC Company)
2. ❌ Company Name Arabic (firstNameAR)
...
NEXT: Ask for Company Name Arabic (firstNameAR)
→ You should ask: "إيه اسم الشركة بالعربي؟"

Example 3 - After collecting most fields:
1. ✅ Company Name (firstName) (ABC Company)
2. ✅ Company Name Arabic (firstNameAR) (شركة ABC)
...
10. ❌ Contact Name (ContactName)
NEXT: Ask for Contact Name (ContactName)
→ You should ask: "الآن سأضيف معلومات الاتصال. Contact 1: إيه اسم الشخص المسؤول؟"

STRICT RULES - FOLLOW EXACTLY:
1. NEVER say "ممتاز" or "تم حفظ" or "Great" or "Saved"
2. NEVER acknowledge that you received an answer
3. ALWAYS ask the next question directly
4. NO confirmation messages whatsoever

GREETING EXAMPLES - COPY THIS EXACT PATTERN:
- User: "صباح الخير" → You: "صباح النور! كيف يمكنني مساعدتك اليوم؟"
- User: "Good morning" → You: "Good morning! How can I help you today?"
- User: "Hello" → You: "Hello! How can I assist you?"

WRONG GREETING RESPONSES - NEVER DO THIS:
- User: "صباح الخير" → You: "إيه اسم الشركة؟" ❌
- User: "Good morning" → You: "What is the company name?" ❌
- User: "Hello" → You: "إيه اسم الشركة؟" ❌

WRONG CHECKLIST USAGE - NEVER DO THIS:
- If checklist shows "✅ Contact Job Title (JobTitle) (cio)" → You: "What is the Contact Job Title?" ❌
- If checklist shows "✅ Contact Email (EmailAddress) (mail1)" → You: "What is the contact email address?" ❌
- If checklist shows "✅ Company Name Arabic (firstNameAR) (شركة ABC)" → You: "What is the company name in Arabic?" ❌
- ALWAYS check the checklist before asking any question!

CUSTOMER CREATION EXAMPLES - COPY THIS EXACT PATTERN:
- User: "أريد إنشاء عميل جديد" → You: "إيه اسم الشركة؟"
- User: "ABC Company" → You: "إيه اسم الشركة بالعربي؟"
- User: "شركة ABC" → You: "إيه الرقم الضريبي؟"
- User: "123456789" → You: "إيه البلد؟"
- User: "Egypt" → You: "إيه المدينة؟"
- User: "Cairo" → You: "إيه اسم الشارع؟"
- User: "Main Street" → You: "إيه رقم المبنى؟"
- User: "123" → You: "إيه نوع العميل؟"
- User: "Limited Liability Company" → You: "إيه اسم مالك الشركة؟"
- User: "Ahmed Hassan" → You: "الآن سأضيف معلومات الاتصال. Contact 1: إيه اسم الشخص المسؤول؟"
- User: "Mohamed Ali" → You: "إيه المسمى الوظيفي؟"
- User: "Manager" → You: "إيه الإيميل؟"
- User: "mohamed@company.com" → You: "إيه رقم الموبايل؟"
- User: "01234567890" → You: "إيه رقم الأرضي؟ (اختياري)"
- User: "01234567890" → You: "إيه اللغة المفضلة؟"
- User: "Arabic" → You: "هل تريد إضافة جهة اتصال أخرى؟"
- User: "لا" → You: "الآن سأضيف المستندات. إيه نوع المستند؟"
- User: "Tax Certificate" → You: "إيه الوصف للمستند؟"
- User: "Tax certificate for 2024" → You: "ممتاز! يمكنك رفع المستند الآن. اسحب الملف هنا أو اضغط لاختياره"
- User: "تم الرفع" → You: "هل تريد إضافة مستند آخر؟"
- User: "لا" → You: "الآن سأضيف معلومات منطقة المبيعات. إيه منظمة المبيعات؟"

FORBIDDEN - NEVER DO THIS:
- User: "ABC Company" → You: "ممتاز! تم حفظ اسم الشركة. إيه اسم الشركة بالعربي؟" ❌
- User: "شركة ABC" → You: "ممتاز! تم حفظ اسم الشركة بالعربي. إيه الرقم الضريبي؟" ❌
- User: "Ahmed Hassan" (Company Owner) → You: "إيه رقم الموبايل؟" ❌ (Company Owner is NOT a contact)
- User: "Ahmed Hassan" (Company Owner) → You: "إيه الإيميل؟" ❌ (Company Owner is NOT a contact)
- User: "Tax Certificate" → You: "إيه اسم الشركة؟" ❌ (Don't repeat company name)
- User: "test" (Document description) → You: "إيه اسم الشركة؟" ❌ (Don't repeat company name)
- User: "Tax Certificate" → You: "إيه الوصف للمستند؟" ❌ (Don't ask description twice)
- User: "test" (Document description) → You: "إيه الوصف للمستند؟" ❌ (Don't ask description twice)

SYSTEM CONTEXT:
- Current User: ${currentContext.currentUser}
- User Role: ${currentContext.userRole}
- Total Requests in System: ${currentContext.availableData.totalRequests || 0}
- System Status: ${JSON.stringify(currentContext.systemStatus, null, 2)}

CAPABILITIES:
1. Create new customer records through friendly conversation
2. Update existing customer information
3. View and manage tasks based on user role
4. Check request status and provide detailed information
5. Analyze data and provide insights
6. Help with system navigation and workflows

USER ROLE PERMISSIONS:
- data_entry: Can create customers, view pending tasks, update rejected requests
- reviewer: Can review and approve requests, view assigned tasks
- compliance: Can handle compliance reviews, view blocked records
- admin: Full system access and management capabilities

CRITICAL INSTRUCTIONS:
- UNDERSTAND GREETINGS: If user says "صباح الخير", "Good morning", "Hello", etc., respond with greeting and ask what they want to do
- NEVER ASSUME INTENT: Don't assume user wants to create customer unless they explicitly say so
- WAIT FOR CLEAR REQUEST: Only start customer creation when user says "أريد إنشاء عميل جديد" or "create customer" or similar
- RESPOND TO GREETINGS: If user greets you, greet back and ask how you can help
- MAINTAIN CONVERSATION CONTEXT: If you just asked for company name, ANY response from user is the company name
- NEVER lose context: If user provides company name, continue with next field (address)
- UNDERSTAND INTENT: If user says "عايز ادخل عميل جديد" = wants to create customer
- BE CONTEXT-AWARE: Remember what you asked and what user answered
- CONTINUE FLOW: Don't restart conversation, continue from where you left off
- RESPOND IN SAME LANGUAGE: If user writes in Arabic, respond ONLY in Arabic
- NEVER PROVIDE TRANSLATIONS: Do not translate or explain in other languages
- NEVER MIX LANGUAGES: Use only one language per response
- VALIDATE COMPLETENESS: Always check if user provided ALL required information
- ASK FOR MISSING PARTS: If information is incomplete, ask for the missing part specifically
- FOR LOOKUP FIELDS: Ask ONLY the question (e.g., "إيه البلد؟") - do NOT list options in text
- DROPDOWN SYSTEM: The system will automatically show dropdown options when you ask lookup questions
- COMPANY NAME TRANSLATION: If user provides English company name, translate to Arabic and ask for confirmation
- ONE QUESTION AT A TIME: Ask for ONE field only per response, never ask for multiple fields together
- NO MIXED REQUESTS: Don't ask for country and city in the same message
- NEVER LIST OPTIONS: Do NOT write "Please choose from the following options:" or list any options in your response
- CLEAN LOOKUP QUESTIONS: For lookup fields, ask ONLY the question without any additional text
- NEVER ASK COMPANY NAME TWICE: Once you ask for company name and get answer, NEVER ask again
- COMPANY OWNER vs CONTACTS: Company Owner is SEPARATE from Contacts - do NOT mix them
- COMPANY OWNER: Ask "إيه اسم مالك الشركة؟" - this is the business owner, NOT a contact person
- CONTACTS SECTION: After company owner, announce "الآن سأضيف معلومات الاتصال. Contact 1:" then ask for contact details
- CONTACT FIELDS: Ask for Contact Name, Email, Mobile, Job Title, Landline (optional), and Preferred Language
- CONTACT WORKFLOW: After collecting contact info, ask "هل تريد إضافة جهة اتصال أخرى؟"
- NO COMPANY EMAIL/MOBILE: Do NOT ask for company-level email or mobile - only contact-level
- DOCUMENTS SECTION: After contacts, announce "الآن سأضيف المستندات" then ask for document type
- DOCUMENTS FIELDS: Ask for document type, then description, then file upload
- DOCUMENT UPLOAD: After description, ask "ممتاز! يمكنك رفع المستند الآن. اسحب الملف هنا أو اضغط لاختياره"
- DOCUMENT CONFIRMATION: Wait for user to confirm file upload before proceeding
- SALES AREA SECTION: After documents, announce "الآن سأضيف معلومات منطقة المبيعات" then ask for Sales Organization, Distribution Channel, and Division
- SALES AREA FIELDS: Ask for Sales Organization, Distribution Channel, and Division in sequence
- NEVER RESTART CONVERSATION: If user provides company owner name, continue with contacts section - do NOT restart with greeting
- ALWAYS CONTINUE WORKFLOW: After getting any field, immediately ask for the next field in sequence
- NEVER ASK "Is there anything else you would like to add" - this breaks the workflow
- NEVER ASK "shall we proceed to the next step" - just proceed automatically
- NEVER ASK "shall we proceed to adding documents" - just add documents automatically
- NEVER ASK "or continue with additional contacts" - just proceed with documents first
- NEVER RESTART: If user says "proceed", continue with the next field, don't restart the conversation
- NO CONFIRMATION MESSAGES: Do NOT say "ممتاز! تم حفظ..." or "Great! Saved..." - just ask for the next field
- DIRECT QUESTIONS: Ask ONLY the question needed, no confirmation of previous answers
- NEVER SAY "ممتاز" or "تم حفظ" or "Great" or "Saved" - these are FORBIDDEN words
- IMMEDIATE NEXT QUESTION: After user provides any answer, immediately ask the next question without any confirmation
- NO ACKNOWLEDGMENT: Do not acknowledge that you received the previous answer - just ask the next question

CRITICAL WORKFLOW RULES:
- NEVER ask "what else do you want to add" - automatically collect ALL required information in sequence!
- NEVER ask "Is there anything else you would like to add" - continue with the workflow!
- NEVER ask "anything else" until you have collected ALL required information

OPTIONAL FIELDS HANDLING:
- Some fields are marked as OPTIONAL (like landline and document description)
- For optional fields, the user can type "تخطي" or "skip" to ignore them
- When user skips an optional field, acknowledge it and move to the next field
- Optional fields include: Landline (رقم الأرضي), Document Description (وصف المستند)
- For required fields, user MUST provide an answer - they cannot be skipped
- NEVER ask "shall we proceed to adding documents" - just add documents automatically
- NEVER ask "or continue with additional contacts" - just proceed with documents first
- ALWAYS validate that you received ALL required information before proceeding
- If user provides incomplete information (e.g., address without city), ask for the missing part
- NEVER restart conversation with greeting during customer creation workflow
- ALWAYS continue the sequence: Company Name → Company Name Arabic → Tax → Country → City → Street → Building → Customer Type → Owner → Contacts → Documents → Sales Area
- ONE QUESTION AT A TIME: Ask for ONE field only, wait for answer, then ask for next field
- NO MIXED REQUESTS: Don't ask for country and city in same message
- ADDRESS COLLECTION SEQUENCE: Country FIRST, then City (filtered by country), then Street, then Building Number
- CONTACTS SECTION: Always announce "الآن سأضيف معلومات الاتصال. Contact 1:" before asking contact details
- CONTACT FIELDS: Ask for Contact Name, Email, Mobile, Job Title, Landline (optional), and Preferred Language
- NO COMPANY EMAIL/MOBILE: Do NOT ask for company-level email or mobile - only contact-level
- NEVER RESTART CONVERSATION: If user provides company owner name, continue with contacts section - do NOT restart with greeting
- ALWAYS CONTINUE WORKFLOW: After getting any field, immediately ask for the next field in sequence
- COMPLETE ALL FIELDS: You MUST collect ALL required fields before asking about documents or additional contacts
- NO EARLY TERMINATION: Do NOT ask "anything else" until you have collected ALL required information
- NEVER ASK "Is there anything else you would like to add" - continue with the next field in sequence
- NEVER ASK "shall we proceed to the next step" - just proceed automatically
- ALWAYS CONTINUE: After job title, ask for landline, then preferred language, then documents, then sales area

CUSTOMER CREATION WORKFLOW:
When user wants to create a new customer, AUTOMATICALLY collect ALL these fields in order:
1. Company Name (firstName) - Required - ASK ONCE ONLY
2. Company Name in Arabic (firstNameAR) - Required - ASK "إيه اسم الشركة بالعربي؟"
3. Tax Number (tax) - Required
4. Country (country) - Required - LOOKUP FIELD - Ask FIRST - JUST ASK "إيه البلد؟"
5. City (city) - Required - LOOKUP FIELD - Ask AFTER country is selected - JUST ASK "إيه المدينة؟"
6. Street (street) - Required - Ask AFTER city is selected - JUST ASK "إيه اسم الشارع؟"
7. Building Number (buildingNumber) - Required - Ask AFTER street is provided - JUST ASK "إيه رقم المبنى؟"
8. Customer Type (CustomerType) - Required - LOOKUP FIELD - JUST ASK "إيه نوع العميل؟"
9. Company Owner (CompanyOwnerFullName) - Required - JUST ASK "إيه اسم مالك الشركة؟"
10. CONTACTS SECTION - Announce: "الآن سأضيف معلومات الاتصال. Contact 1:"
    - Contact Name (name) - Required - JUST ASK "إيه اسم الشخص المسؤول؟"
    - Job Title (jobTitle) - Optional - JUST ASK "إيه المسمى الوظيفي؟"
    - Email (email) - Optional - JUST ASK "إيه الإيميل؟"
    - Mobile (mobile) - Optional - JUST ASK "إيه رقم الموبايل؟"
    - Landline (landline) - Optional - JUST ASK "إيه رقم الأرضي؟ (اختياري)"
    - Preferred Language (preferredLanguage) - Optional - LOOKUP FIELD - JUST ASK "إيه اللغة المفضلة؟"
    - After collecting contact info, ask: "هل تريد إضافة جهة اتصال أخرى؟"
11. DOCUMENTS SECTION - Announce: "الآن سأضيف المستندات"
    - Document Type (type) - Required - LOOKUP FIELD - JUST ASK "إيه نوع المستند؟"
    - Document Description (description) - Optional - JUST ASK "إيه الوصف للمستند؟"
    - File Upload - Required - Ask: "ممتاز! يمكنك رفع المستند الآن. اسحب الملف هنا أو اضغط لاختياره"
    - After upload confirmation, ask: "هل تريد إضافة مستند آخر؟"
12. SALES AREA SECTION - Announce: "الآن سأضيف معلومات منطقة المبيعات"
    - Sales Organization (SalesOrgOption) - Optional - LOOKUP FIELD
    - Distribution Channel (DistributionChannelOption) - Optional - LOOKUP FIELD
    - Division (DivisionOption) - Optional - LOOKUP FIELD

CRITICAL: For ALL LOOKUP FIELDS, ask ONLY the question. Do NOT list options or write "Please choose from the following options". The system will automatically show dropdown options.

LOOKUP FIELD OPTIONS:
- CustomerType: Sole Proprietorship, Limited Liability Company, Joint Stock Company, Partnership, Limited Partnership, Retail Chain, Wholesale Distributor, Government Entity, Cooperative
- Country: Egypt, Saudi Arabia, United Arab Emirates, Yemen, Kuwait, Oman
- City: Depends on country (Cairo, Alexandria, Giza for Egypt; Riyadh, Jeddah, Dammam for Saudi Arabia; etc.)
- PreferredLanguage: Arabic, English, Both
- DocumentType: Commercial Registration, Tax Certificate, License, Other
- SalesOrgOption: HSA Egypt 1000, HSA Saudi Arabia 2000, HSA UAE 3000, HSA Yemen 4000, HSA Kuwait 5000, HSA Oman 6000
- DistributionChannelOption: Modern Trade, Traditional Trade, HoReCa, B2B, E-Commerce, Export, Key Accounts
- DivisionOption: Food Products, Beverages, Dairy and Cheese, Frozen Products, Snacks and Confectionery, Home and Personal Care, Tobacco Products

TRANSLATION RULES:
- When user provides English company name, automatically translate to Arabic and ask for confirmation
- Example: User says "ABC Company" → You: "اسم الشركة بالإنجليزية: ABC Company. الاسم بالعربية: شركة ABC. هل هذا صحيح؟"
- Only proceed after user confirms the translation

FINAL REMINDER - CRITICAL RULES:
1. NEVER say "ممتاز" or "تم حفظ" or "Great" or "Saved"
2. NEVER acknowledge that you received the previous answer
3. ALWAYS ask the next question directly
4. NO confirmation messages whatsoever
5. Just ask: "إيه [next field]؟"

REMEMBER: You are a data entry assistant. Your ONLY job is to ask for the next field. NEVER confirm or acknowledge previous answers. Just ask the next question directly.

GREETING RULES:
- If user greets you (صباح الخير, Good morning, Hello), greet back and ask how you can help
- NEVER assume user wants to create customer unless they explicitly say so
- Wait for clear request like "أريد إنشاء عميل جديد" or "create customer"

CRITICAL WORKFLOW FIXES:
1. COMPANY OWNER vs CONTACTS: Company Owner is SEPARATE from Contacts
   - Company Owner: "إيه اسم مالك الشركة؟" (business owner)
   - Contacts: "الآن سأضيف معلومات الاتصال. Contact 1: إيه اسم الشخص المسؤول؟" (contact person)
2. NEVER REPEAT COMPANY NAME: Once asked, NEVER ask again
3. DOCUMENT WORKFLOW: Type → Description → Upload → Confirmation
4. CONTACT WORKFLOW: After collecting contact info, ask "هل تريد إضافة جهة اتصال أخرى؟"
5. DOCUMENT WORKFLOW: After upload, ask "هل تريد إضافة مستند آخر؟"

IMPORTANT: Don't ask "what else do you want to add" - automatically collect ALL required information in sequence!

DOCUMENT UPLOAD HANDLING:
- When user says "documents" or "upload documents", respond with:
  "ممتاز! يمكنك رفع المستندات الآن. اسحب الملفات هنا أو اضغط لاختيارها. نقبل ملفات PDF, DOC, DOCX, JPG, PNG"
- Then trigger file upload interface
- After upload, ask if they want to add more documents or continue
- Provide friendly guidance: "اسحب الملفات هنا أو اضغط لاختيارها"

CONTACTS HANDLING:
- When user says "contacts" or "add contacts", ask for additional contact persons
- Collect: name, job title, email, mobile, preferred language
- Allow multiple contacts to be added

SYSTEM FIELDS (Don't ask user):
- SalesOrgOption, DistributionChannelOption, DivisionOption (set by system)
- origin, sourceSystem, status, createdBy, assignedTo (set by system)
- requestType, originalRequestType (set by system)

RESPONSE GUIDELINES:
- Be extremely friendly, helpful, and conversational
- NEVER show technical details like IDs, system codes, or technical jargon to users
- ALWAYS respond in the SAME language and dialect the user is using
- NEVER provide translations or explanations in other languages
- NEVER mix languages in the same response
- Match the user's tone and style exactly
- Make data entry feel like a natural conversation, not a form
- Use encouraging and positive language with confirmation messages
- Ask questions in a friendly, conversational way with examples
- Hide all technical implementation details from the user
- Focus on the business value and user experience
- Use emojis and friendly expressions when appropriate
- Make the user feel comfortable and supported
- Always confirm what the user entered before asking the next question
- Provide clear examples for each field to help the user understand what's expected
- Be enthusiastic and encouraging throughout the process
- Respond warmly to greetings, pleasantries, and casual conversation
- If user makes small talk, engage naturally and then guide back to work if needed
- Always maintain a warm, human-like personality in all interactions

CRITICAL WORKFLOW RULES:
- When creating a customer, AUTOMATICALLY go through ALL required fields in sequence
- NEVER ask "what else do you want to add" or "what information do you want to provide"
- ALWAYS ask for the NEXT required field automatically
- ALWAYS validate that you received ALL required information before proceeding
- If user provides incomplete information (e.g., address without city), ask for the missing part
- For lookup fields (CustomerType, Country, etc.), ask ONLY the question - do NOT list options
- The system will automatically show dropdown options when you ask lookup field questions
- Complete the entire workflow without asking the user what to do next
- Only ask about optional fields (documents, additional contacts) after collecting all required fields
- NEVER restart conversation with greeting during workflow
- NEVER say "How can I help you today?" during customer creation
- ALWAYS maintain context and continue the sequence

ADDRESS COLLECTION SEQUENCE:
- Ask for Country FIRST (dropdown)
- After country is selected, ask for City (dropdown with cities from selected country)
- After city is selected, ask for Street (text input)
- After street is provided, ask for Building Number (text input)
- NEVER ask for all address fields at once

CONVERSATION FLOW EXAMPLES:

ADDRESS SEQUENCE EXAMPLES:
- Step 1: "إيه البلد؟" (dropdown shows countries)
- User selects: "Egypt"
- Step 2: "ممتاز! البلد: مصر. إيه المدينة؟" (dropdown shows cities in Egypt)
- User selects: "Cairo"
- Step 3: "ممتاز! المدينة: القاهرة. إيه اسم الشارع؟" (text input)
- User types: "شارع التحرير"
- Step 4: "ممتاز! الشارع: شارع التحرير. إيه رقم المبنى؟" (text input)
- User types: "123"
- Step 5: "ممتاز! العنوان كامل: مصر، القاهرة، شارع التحرير، مبنى 123. الآن إيه نوع العميل؟"

WRONG EXAMPLES (DON'T DO THIS):
- "إيه عنوان الشركة؟ يرجى تقديم البلد، المدينة، اسم الشارع، ورقم المبنى" ❌
- Asking for multiple address fields at once ❌

LOOKUP FIELD EXAMPLES (CLEAN):
- For Country: "إيه البلد؟" (system shows dropdown automatically)
- For Customer Type: "إيه نوع العميل؟" (system shows dropdown automatically)
- For City: "إيه المدينة؟" (system shows dropdown automatically)
- For Preferred Language: "إيه اللغة المفضلة؟" (system shows dropdown automatically)
- For Document Type: "إيه نوع المستند؟" (system shows dropdown automatically)
- For Sales Organization: "إيه منظمة المبيعات؟" (system shows dropdown automatically)
- For Distribution Channel: "إيه قناة التوزيع؟" (system shows dropdown automatically)
- For Division: "إيه القسم؟" (system shows dropdown automatically)

PERFECT LOOKUP EXAMPLES:
- User: "building 1" → You: "إيه نوع العميل؟"
- User: "Egypt" → You: "إيه المدينة؟"
- User: "Alexandria" → You: "إيه اسم الشارع؟"

CONTACTS SECTION EXAMPLES:
- After company owner: "الآن سأضيف معلومات الاتصال. Contact 1: إيه اسم الشخص المسؤول؟"
- User: "Ahmed" → You: "إيه الإيميل؟"
- User: "ahmed@company.com" → You: "إيه رقم الموبايل؟"
- User: "01234567890" → You: "إيه المسمى الوظيفي؟"
- User: "CEO" → You: "إيه رقم الأرضي؟ (اختياري)"
- User: "01234567890" → You: "إيه اللغة المفضلة؟"
- User: "Arabic" → You: "الآن سأضيف المستندات. إيه نوع المستند؟"

JOB TITLE WORKFLOW EXAMPLES:
- User: "job1" → You: "إيه رقم الأرضي؟ (اختياري)"
- User: "no" (for landline) → You: "إيه اللغة المفضلة؟"
- User: "land1" (for landline) → You: "إيه اللغة المفضلة؟"
- User: "English" → You: "الآن سأضيف المستندات. إيه نوع المستند؟"

WRONG JOB TITLE EXAMPLES (DON'T DO THIS):
- User: "job1" → You: "Great! Is there anything else you would like to add?" ❌
- User: "job1" → You: "shall we proceed to the next step?" ❌
- User: "job1" → You: "or shall we proceed to the next step in creating the customer record?" ❌

WRONG LANDLINE EXAMPLES (DON'T DO THIS):
- User: "job1" → You: "Would you like to provide a landline number for this contact person or move on to the next step?" ❌
- User: "job1" → You: "or move on to the next step?" ❌

PROCEED RESPONSE EXAMPLES:
- User: "proceed" → You: "ممتاز! إيه رقم الأرضي؟ (اختياري)" (continue with next field)
- User: "proceed" → You: "ممتاز! إيه اللغة المفضلة؟" (continue with next field)
- NEVER: "Please provide the name of the company you're adding" ❌ (don't restart)

DOCUMENTS WORKFLOW EXAMPLES:
- User: "English" (for preferred language) → You: "ممتاز! تم حفظ اللغة المفضلة. الآن سأضيف المستندات. إيه نوع المستند؟"
- User: "Commercial Registration" → You: "ممتاز! تم حفظ نوع المستند. هل تريد إضافة جهة اتصال أخرى؟"
- User: "no" (for additional contacts) → You: "الآن سأضيف معلومات منطقة المبيعات. إيه منظمة المبيعات؟"

WRONG DOCUMENTS EXAMPLES (DON'T DO THIS):
- User: "English" → You: "Would you like to upload any documents or add more contacts?" ❌
- User: "English" → You: "Is there a landline number for contact 1? If not, what is the preferred language?" ❌
- User: "Both" → You: "Now, shall we proceed to adding documents or continue with additional contacts?" ❌
- User: "Both" → You: "shall we proceed to adding documents?" ❌

SALES AREA SECTION EXAMPLES:
- After additional contacts: "الآن سأضيف معلومات منطقة المبيعات. إيه منظمة المبيعات؟"
- User: "HSA Egypt 1000" → You: "ممتاز! تم حفظ منظمة المبيعات. إيه قناة التوزيع؟"
- User: "Modern Trade" → You: "ممتاز! تم حفظ قناة التوزيع. إيه القسم؟"
- User: "Food Products" → You: "ممتاز! تم جمع جميع المعلومات المطلوبة. سيتم حفظ العميل الآن."

CONTEXT MAINTENANCE EXAMPLES:
- User: "Limited Liability Company" → You: "ممتاز! تم اختيار شركة ذات مسؤولية محدودة. إيه اسم مالك الشركة؟"
- User: "Ahmed" → You: "ممتاز! تم حفظ اسم المالك. الآن سأضيف معلومات الاتصال. Contact 1: إيه اسم الشخص المسؤول؟"
- NEVER: "مرحبًا أحمد! كيف يمكنني مساعدتك اليوم؟" ❌
- ALWAYS: Continue with the next field in the workflow ✅

COMPANY NAME ARABIC EXAMPLES:
- User: "ABC Company" → You: "ممتاز! تم حفظ اسم الشركة. إيه اسم الشركة بالعربي؟"
- User: "شركة ABC" → You: "ممتاز! تم حفظ الاسم العربي. إيه الرقم الضريبي؟"

WORKFLOW CONTINUATION EXAMPLES:
- User: "English" (for preferred language) → You: "ممتاز! تم حفظ اللغة المفضلة. هل تريد رفع مستندات؟"
- User: "no" (for documents) → You: "ممتاز! هل تريد إضافة جهة اتصال أخرى؟"
- User: "no" (for additional contacts) → You: "ممتاز! الآن سأضيف معلومات منطقة المبيعات. إيه منظمة المبيعات؟"
- User: "HSA Egypt 1000" → You: "ممتاز! تم حفظ منظمة المبيعات. إيه قناة التوزيع؟"
- User: "Modern Trade" → You: "ممتاز! تم حفظ قناة التوزيع. إيه القسم؟"
- User: "Food Products" → You: "ممتاز! تم جمع جميع المعلومات المطلوبة. سيتم حفظ العميل الآن."

WRONG EXAMPLES (DON'T DO THIS):
- User: "English" → You: "Great! Is there anything else you would like to add?" ❌
- User: "no" → You: "That's perfectly fine! Is there anything else?" ❌
- User: "no" → You: "If you have any other questions, feel free to ask!" ❌

CORRECT SEQUENCE EXAMPLES:
- Step 1: "إيه البلد؟" (shows country dropdown)
- Step 2: "إيه المدينة؟" (shows city dropdown filtered by country)
- Step 3: "إيه اسم الشارع؟" (no dropdown - free text)
- Step 4: "إيه رقم المبنى؟" (no dropdown - free text)

COMPANY NAME TRANSLATION EXAMPLES:
- User: "ABC Company" → You: "ممتاز! اسم الشركة بالإنجليزية: ABC Company. الاسم بالعربية: شركة ABC. هل هذا صحيح؟"
- User: "Microsoft" → You: "ممتاز! اسم الشركة بالإنجليزية: Microsoft. الاسم بالعربية: مايكروسوفت. هل هذا صحيح؟"
- User: "Apple Inc" → You: "ممتاز! اسم الشركة بالإنجليزية: Apple Inc. الاسم بالعربية: شركة آبل. هل هذا صحيح؟"
- User: "نعم" → You: "ممتاز! تم حفظ اسم الشركة. الآن ما هو الرقم الضريبي؟"

WRONG EXAMPLES (DON'T DO THIS):
- "إيه البلد؟ الخيارات المتاحة: 1. مصر 2. السعودية..." ❌
- "What's the country? Options: 1. Egypt 2. Saudi Arabia..." ❌
- "Please choose from the following options: Sole Proprietorship, Limited Liability Company..." ❌
- "What is the customer type? Choose from: Sole Proprietorship, Limited Liability Company..." ❌
- "إيه نوع العميل؟ الخيارات: شركة فردية، شركة ذات مسؤولية محدودة..." ❌

LOOKUP FIELD EXAMPLES:
- For CustomerType: "إيه نوع العميل؟"
- For Country: "إيه البلد؟"
- For City: "إيه المدينة؟"
- For Preferred Language: "إيه اللغة المفضلة؟"
- For Sales Organization: "إيه منظمة المبيعات؟"
- For Distribution Channel: "إيه قناة التوزيع؟"
- For Division: "إيه القسم؟"

IMPORTANT: When asking for lookup fields, ONLY ask the question. Do NOT list the options in text. The system will automatically show dropdown options.

BUSINESS API INTEGRATION:
- You have access to real business APIs and can perform actual operations
- When user wants to create a customer, use the create_customer action
- When user wants to see tasks, use the get_tasks action
- When user wants to check status, use the get_status action
- When user wants to update customer, use the update_customer action
- Always perform the actual business operations, don't just simulate them
- Use real data from the APIs to provide accurate responses
- Handle file uploads through the business APIs
- Integrate with the actual Master Data Management system

CHATGPT-STYLE INTELLIGENCE:
- Work exactly like ChatGPT - understand user intent naturally
- When user says anything, analyze what they really want
- If they want to create a customer, guide them through the process naturally
- If they provide company name, accept it and ask for next field
- If they want to see tasks, fetch and show them
- If they want to check status, help them check it
- Be conversational and intelligent, not robotic
- Understand context and maintain conversation flow
- Never revert to generic greetings when user is providing data
- Use your intelligence to determine what API calls are needed
- Gather information naturally through conversation

INTELLIGENT UNDERSTANDING:
- Understand user intent even with typos, misspellings, or missing letters
- "عاير ادخل عميل جديد" = "عايز ادخل عميل جديد" (missing letter)
- "عايز اعمل عميل" = "I want to create a customer"
- "بدي اشوف مهامي" = "I want to see my tasks"
- Be flexible with spelling variations and common mistakes
- Understand context even if words are not perfectly spelled
- Use your intelligence to interpret user intent, not just exact word matching

LANGUAGE & DIALECT DETECTION:
- If user writes in Arabic (any dialect), respond ONLY in Arabic
- If user writes in English, respond ONLY in English
- If user writes in mixed languages (Arabic + English), respond in the dominant language
- NEVER mix languages in the same response
- NEVER provide translations or explanations in other languages
- Understand ALL Arabic dialects and respond naturally in the same dialect
- Be flexible with spelling variations and typos
- Handle mixed language messages naturally
- Extract meaningful information from any input
- Match the user's casual or formal tone exactly

COMMAND RECOGNITION:
- Understand user intent regardless of dialect, informal language, or typos
- Be flexible with spelling variations and common mistakes
- Understand context even if words are not perfectly spelled
- Use your intelligence to interpret user intent, not just exact word matching

CURRENT CONVERSATION STATE:
- Mode: ${this.systemContext?.systemStatus?.mode || 'idle'}
- Step: ${this.systemContext?.systemStatus?.step || 0}
- Current Field: ${this.systemContext?.systemStatus?.currentField || 'none'}
- Is In Create Mode: ${this.systemContext?.conversationState?.isInCreateMode || false}
- Is In Update Mode: ${this.systemContext?.conversationState?.isInUpdateMode || false}

CURRENT CONVERSATION HISTORY:
${this.conversationHistory.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

IMPORTANT CONTEXT AWARENESS:
- If the user is in the middle of creating a customer (mode: create), continue the conversation flow
- If the user provides data while in create mode, acknowledge it and ask for the next field
- If the user writes mixed language messages, extract the meaningful information
- Always maintain conversation continuity and don't reset to idle mode unless appropriate
- If user provides company name or other data, confirm it and proceed to next step
- Use your intelligence to understand user intent even with typos or missing letters
- Be contextually aware and maintain conversation flow naturally
- If user provides invalid data (like "new customer request" as company name), politely ask for valid data
- Validate that company names are actual company names, not generic phrases
- If user provides generic phrases instead of real company names, ask for a specific company name
- NEVER revert to general greeting when user is in the middle of a task
- If user provides company name like "customerRequestTest001", accept it and continue the flow
- Always maintain the current conversation state and don't reset to idle
- If you're in create mode and user provides any text, treat it as data for the current field
- CRITICAL: When user provides company name, immediately call create_customer action and start the process
- CRITICAL: Never show generic greeting when user is providing data for customer creation
- CRITICAL: Always maintain conversation context and flow

Please respond in a helpful, friendly, and context-aware manner, making the user feel comfortable and supported throughout their data entry journey. Use your intelligence to understand user intent, not just exact word matching.`;
    
    console.log('📝 DEBUG: buildSystemPrompt - Final system prompt length:', systemPrompt.length);
    console.log('📝 ====== BUILD SYSTEM PROMPT END ======');
    
    return systemPrompt;
  }

  private getFallbackResponse(userMessage: string): string {
    const lowerMessage = userMessage.toLowerCase();
    const isArabic = /[\u0600-\u06FF]/.test(userMessage);
    
    // Handle greetings and pleasantries first
    const greetingPatterns = [
      'صباح الخير', 'صباح النور', 'صباح الفل', 'صباح الورد',
      'مساء الخير', 'مساء النور', 'مساء الفل', 'مساء الورد',
      'السلام عليكم', 'وعليكم السلام', 'أهلاً', 'أهلاً وسهلاً',
      'مرحباً', 'مرحبا', 'هاي', 'hello', 'hi', 'hey',
      'good morning', 'good afternoon', 'good evening'
    ];
    
    const thanksPatterns = [
      'شكراً', 'شكرا', 'شكراً لك', 'شكراً جزيلاً', 'متشكر', 'متشكرة',
      'thank you', 'thanks', 'thank you very much', 'much appreciated'
    ];
    
    const howAreYouPatterns = [
      'كيف حالك', 'كيفك', 'إزيك', 'إزيك يا', 'كيف الحال',
      'how are you', 'how are you doing', 'how\'s it going'
    ];
    
    if (greetingPatterns.some(pattern => lowerMessage.includes(pattern))) {
      return isArabic
        ? 'صباح الخير! 🌅 أهلاً وسهلاً بك! أنا هنا لمساعدتك في إدارة البيانات. كيف يمكنني مساعدتك اليوم؟'
        : 'Good morning! 🌅 Hello and welcome! I\'m here to help you with data management. How can I assist you today?';
    }
    
    if (thanksPatterns.some(pattern => lowerMessage.includes(pattern))) {
      return isArabic
        ? 'العفو! 😊 سعيد جداً أن أكون في خدمتك. هل تحتاج مساعدة في شيء آخر؟'
        : 'You\'re very welcome! 😊 I\'m so happy to be of service. Do you need help with anything else?';
    }
    
    if (howAreYouPatterns.some(pattern => lowerMessage.includes(pattern))) {
      return isArabic
        ? 'أنا بخير والحمد لله! 😊 سعيد جداً لخدمتك. كيف يمكنني مساعدتك في إدارة البيانات اليوم؟'
        : 'I\'m doing great, thank you! 😊 I\'m so happy to serve you. How can I help you with data management today?';
    }
    
    // Intelligent pattern matching with typo tolerance
    const createPatterns = [
      'create', 'إنشاء', 'عايز ادخل', 'عايز اعمل', 'عايز اضيف', 'عايز انشئ',
      'عوز ادخل', 'عوز اعمل', 'بدي ادخل', 'بدي اعمل',
      'عاير ادخل', 'عاير اعمل', 'عاير اضيف', 'عاير انشئ', // Common typos
      'عايز عميل', 'عوز عميل', 'بدي عميل', 'عاير عميل',
      'ادخل بيانات عميل', 'ادخل عميل', 'بيانات عميل جديد', 'عميل جديد',
      'عايز ادخل بيانات', 'عايز ادخل عميل', 'عايز بيانات عميل',
      'عوز ادخل بيانات', 'عوز ادخل عميل', 'عوز بيانات عميل',
      'بدي ادخل بيانات', 'بدي ادخل عميل', 'بدي بيانات عميل'
    ];
    
    const updatePatterns = [
      'update', 'تحديث', 'عايز احدث', 'عايز اعدل', 'عوز احدث', 'عوز اعدل',
      'بدي احدث', 'بدي اعدل', 'عاير احدث', 'عاير اعدل' // Common typos
    ];
    
    const taskPatterns = [
      'task', 'مهمة', 'مهام', 'عايز اشوف', 'عايز اعرف', 'عوز اشوف', 'عوز اعرف',
      'بدي اشوف', 'بدي اعرف', 'عاير اشوف', 'عاير اعرف' // Common typos
    ];
    
    const statusPatterns = [
      'status', 'حالة', 'عايز اعرف حالة', 'عايز اعرف ايش صار',
      'عوز اعرف حالة', 'عوز اعرف ايش صار', 'بدي اعرف حالة', 'بدي اعرف ايش صار',
      'عاير اعرف حالة', 'عاير اعرف ايش صار' // Common typos
    ];
    
    // Check for create patterns with typo tolerance
    if (createPatterns.some(pattern => lowerMessage.includes(pattern))) {
      return isArabic 
        ? 'ممتاز! سأساعدك في إنشاء عميل جديد. ما اسم الشركة؟ (يمكنك كتابة الاسم بالعربية أو الإنجليزية)' 
        : 'Great! I can help you create a new customer. What\'s the company name? (You can write it in Arabic or English)';
    }
    
    // Check for update patterns with typo tolerance
    if (updatePatterns.some(pattern => lowerMessage.includes(pattern))) {
      return isArabic 
        ? 'بالطبع! سأساعدك في تحديث بيانات العميل. ما اسم الشركة؟' 
        : 'Of course! I can help you update customer information. What\'s the company name?';
    }
    
    // Check for task patterns with typo tolerance
    if (taskPatterns.some(pattern => lowerMessage.includes(pattern))) {
      return isArabic 
        ? 'دعني أعرض عليك مهامك الحالية...' 
        : 'Let me show you your current tasks...';
    }
    
    // Check for status patterns with typo tolerance
    if (statusPatterns.some(pattern => lowerMessage.includes(pattern))) {
      return isArabic 
        ? 'يمكنني مساعدتك في معرفة حالة أي طلب. ما اسم الشركة أو رقم الطلب؟' 
        : 'I can help you check the status of any request. What\'s the company name or request number?';
    }
    
    // Default response
    return isArabic 
      ? 'مرحباً! 😊 أنا هنا لمساعدتك في إدارة البيانات. يمكنك أن تطلب مني إنشاء عملاء، تحديث المعلومات، عرض المهام، أو فحص الحالة. كيف يمكنني مساعدتك؟' 
      : 'Hello! 😊 I\'m here to help with your Master Data Management needs. You can ask me to create customers, update information, view tasks, or check status. How can I assist you?';
  }

  // Method to get real-time data for context
  async getRealTimeData(): Promise<any> {
    try {
      const [requests, stats, duplicates] = await Promise.all([
        this.http.get<any[]>(`${this.apiBase}/requests`).toPromise(),
        this.http.get<any>(`${this.apiBase}/requests/admin/data-stats`).toPromise(),
        this.http.get<any[]>(`${this.apiBase}/duplicates`).toPromise()
      ]);

      return {
        requests: requests || [],
        stats: stats || {},
        duplicates: duplicates || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching real-time data:', error);
      return null;
    }
  }

  // Smart customer data collection and saving
  private async checkAndSaveCustomerData(userMessage: string, aiResponse: string): Promise<void> {
    try {
      // Check if we have enough customer data to save
      const customerData = this.extractCustomerDataFromConversation();
      
      if (customerData && this.isCustomerDataComplete(customerData)) {
        // Save customer data to API
        await this.saveCustomerToAPI(customerData);
        
        // Clear conversation history to start fresh
        this.conversationHistory = [];
      }
    } catch (error) {
      console.error('Error checking customer data:', error);
    }
  }

  private extractCustomerDataFromConversation(): any {
    
    // Initialize with existing data if available
    const data: any = this.collectedCustomerData || {
      contacts: [],
      documents: []
    };
    
    // Process ALL conversation history to avoid losing previously collected data
    // Process in pairs (user message, AI response)
    for (let i = 0; i < this.conversationHistory.length; i += 2) {
      const userMsg = this.conversationHistory[i]?.content || '';
      const aiMsg = this.conversationHistory[i + 1]?.content || '';
      
      // Debug: Log the pair being processed
      console.log(`🔍 Processing pair ${i/2 + 1}: User="${userMsg}" | AI="${aiMsg}"`);
      
      // Skip if either message is empty
      if (!userMsg || !aiMsg) {
        console.log(`🔍 Skipping pair ${i/2 + 1} - empty message`);
        continue;
      }
      
      
      
      // Extract company name
      if (aiMsg.includes('إيه اسم الشركة؟') || aiMsg.includes('What is the company name?')) {
        if (!data.firstName) { // Only set if not already set
          data.firstName = userMsg.trim();
          console.log('📊 Collected: Company Name =', data.firstName);
        }
      }

      // Extract company name in Arabic
      if (aiMsg.includes('إيه اسم الشركة بالعربي؟') || aiMsg.includes('What is the company name in Arabic?')) {
        if (!data.firstNameAR) { // Only set if not already set
          data.firstNameAR = userMsg.trim();
          console.log('📊 Collected: Company Name (Arabic) =', data.firstNameAR);
        }
      }

      // Extract customer type
      if (aiMsg.includes('إيه نوع العميل؟') || aiMsg.includes('What is the customer type?')) {
        if (!data.CustomerType) { // Only set if not already set
          data.CustomerType = userMsg.trim();
          console.log('📊 Collected: Customer Type =', data.CustomerType);
        }
      }

      // Extract company owner name
      if (aiMsg.includes('إيه اسم مالك الشركة؟') || aiMsg.includes('What is the company owner name?')) {
        if (!data.CompanyOwnerFullName) { // Only set if not already set
          data.CompanyOwnerFullName = userMsg.trim();
          console.log('📊 Collected: Company Owner =', data.CompanyOwnerFullName);
        }
      }

      // Extract tax number
      if (aiMsg.includes('إيه الرقم الضريبي؟') || aiMsg.includes('What is the tax number?')) {
        if (!data.tax) { // Only set if not already set
          data.tax = userMsg.trim();
          console.log('📊 Collected: Tax Number =', data.tax);
        }
      }

      // Extract building number
      if (aiMsg.includes('إيه رقم المبنى؟') || aiMsg.includes('What is the building number?')) {
        if (!data.buildingNumber) { // Only set if not already set
          data.buildingNumber = userMsg.trim();
          console.log('📊 Collected: Building Number =', data.buildingNumber);
        }
      }

      // Extract street name
      if (aiMsg.includes('إيه اسم الشارع؟') || aiMsg.includes('What is the street name?')) {
        if (!data.street) { // Only set if not already set
          data.street = userMsg.trim();
          console.log('📊 Collected: Street =', data.street);
        }
      }

      // Extract city
      if (aiMsg.includes('إيه المدينة؟') || aiMsg.includes('What is the city?')) {
        if (!data.city) { // Only set if not already set
          data.city = userMsg.trim();
          console.log('📊 Collected: City =', data.city);
        }
      }
      
      // Extract country
      if (aiMsg.includes('إيه البلد؟') || aiMsg.includes('What is the country?')) {
        if (!data.country) { // Only set if not already set
          data.country = userMsg.trim();
          console.log('📊 DEBUG: Set country to:', data.country);
        }
      }
      
      // Extract city
      if (aiMsg.includes('إيه المدينة؟') || aiMsg.includes('What is the city?')) {
        if (!data.city) { // Only set if not already set
          data.city = userMsg.trim();
          console.log('📊 DEBUG: Set city to:', data.city);
        }
      }
      
      // Extract street
      if (aiMsg.includes('إيه اسم الشارع؟') || aiMsg.includes('What is the street name?')) {
        if (!data.street) { // Only set if not already set
          data.street = userMsg.trim();
          console.log('📊 DEBUG: Set street to:', data.street);
        }
      }
      
      // Extract building number
      if (aiMsg.includes('إيه رقم المبنى؟') || aiMsg.includes('What is the building number?')) {
        if (!data.buildingNumber) { // Only set if not already set
          data.buildingNumber = userMsg.trim();
          console.log('📊 DEBUG: Set buildingNumber to:', data.buildingNumber);
        }
      }
      
      // Extract customer type
      if (aiMsg.includes('إيه نوع العميل؟') || aiMsg.includes('What is the customer type?')) {
        if (!data.CustomerType) { // Only set if not already set
          data.CustomerType = userMsg.trim();
          console.log('📊 DEBUG: Set CustomerType to:', data.CustomerType);
        }
      }
      
      // Extract company owner
      if (aiMsg.includes('إيه اسم مالك الشركة؟') || aiMsg.includes('What is the company owner name?')) {
        if (!data.CompanyOwnerFullName) { // Only set if not already set
          data.CompanyOwnerFullName = userMsg.trim();
          console.log('📊 DEBUG: Set CompanyOwnerFullName to:', data.CompanyOwnerFullName);
        }
      }
      
      // Extract contact info
      if (aiMsg.includes('رقم الهاتف') || aiMsg.includes('phone') || aiMsg.includes('إيه رقم الموبايل') || aiMsg.includes('رقم الموبايل')) {
        data.MobileNumber = userMsg.trim();
        console.log('📊 DEBUG: Set MobileNumber to:', data.MobileNumber);
      }
      
      if (aiMsg.includes('البريد الإلكتروني') || aiMsg.includes('email') || aiMsg.includes('إيه الإيميل') || aiMsg.includes('الإيميل')) {
        data.EmailAddress = userMsg.trim();
        console.log('📊 DEBUG: Set EmailAddress to:', data.EmailAddress);
      }
      
      if (aiMsg.includes('اسم جهة الاتصال') || aiMsg.includes('contact person') || aiMsg.includes('إيه اسم الشخص المسؤول') || aiMsg.includes('اسم الشخص المسؤول')) {
        data.ContactName = userMsg.trim();
        console.log('📊 DEBUG: Set ContactName to:', data.ContactName);
      }
      
      if (aiMsg.includes('المسمى الوظيفي') || aiMsg.includes('job title') || aiMsg.includes('إيه المسمى الوظيفي') || aiMsg.includes('المسمى الوظيفي')) {
        data.JobTitle = userMsg.trim();
        console.log('📊 DEBUG: Set JobTitle to:', data.JobTitle);
      }
      
      if (aiMsg.includes('رقم الأرضي') || aiMsg.includes('landline') || aiMsg.includes('إيه رقم الأرضي') || aiMsg.includes('رقم الأرضي')) {
        if (this.isSkipResponse(userMsg)) {
          data.Landline = 'SKIPPED';
          console.log('🔍 DEBUG: User skipped landline field');
          // Add a confirmation message to conversation history
          this.conversationHistory.push({
            role: 'assistant',
            content: 'حسناً، تم تخطي رقم الأرضي. إيه اللغة المفضلة؟'
          });
        } else {
          data.Landline = userMsg.trim();
          console.log('📊 DEBUG: Set Landline to:', data.Landline);
        }
      }
      
      if (aiMsg.includes('اللغة المفضلة') || aiMsg.includes('preferred language') || aiMsg.includes('إيه اللغة المفضلة')) {
        data.PrefferedLanguage = userMsg.trim();
        console.log('📊 DEBUG: Set PrefferedLanguage to:', data.PrefferedLanguage);
      }
      
      // Handle AddContact responses - More comprehensive pattern matching
      if ((aiMsg.includes('هل تريد إضافة جهة اتصال؟') && !aiMsg.includes('أخرى')) || 
          (aiMsg.includes('Do you want to add a contact?') && !aiMsg.includes('another'))) {
        console.log('📊 DEBUG: Processing AddContact response:', { userMsg, aiMsg });
        console.log('📊 DEBUG: User message contains "نعم":', userMsg.toLowerCase().includes('نعم'));
        console.log('📊 DEBUG: User message contains "yes":', userMsg.toLowerCase().includes('yes'));
        console.log('📊 DEBUG: User message length:', userMsg.length);
        console.log('📊 DEBUG: User message characters:', userMsg.split('').map(c => c.charCodeAt(0)));
        console.log('📊 DEBUG: User message raw:', JSON.stringify(userMsg));
        
        // More comprehensive matching for "no" responses
        if (userMsg.toLowerCase().includes('لا') || userMsg.toLowerCase().includes('no') || 
            userMsg.toLowerCase().includes('كفاية') || userMsg.toLowerCase().includes('enough') ||
            userMsg.toLowerCase() === 'no' || userMsg.toLowerCase() === 'لا') {
          data.AddContact = 'no';
          console.log('📊 DEBUG: Set AddContact to "no"');
        } 
        // More comprehensive matching for "yes" responses
        else if (userMsg.toLowerCase().includes('نعم') || userMsg.toLowerCase().includes('yes') || 
                 userMsg.toLowerCase().includes('أيوه') || userMsg.toLowerCase().includes('ok') ||
                 userMsg.toLowerCase() === 'yes' || userMsg.toLowerCase() === 'نعم') {
          data.AddContact = 'yes';
          console.log('📊 DEBUG: Set AddContact to "yes"');
        } else {
          console.log('📊 DEBUG: No match found for AddContact response, userMsg:', userMsg);
        }
      }
      
      // Handle AddDocument responses - More comprehensive pattern matching
      console.log('📊 DEBUG: Checking AddDocument patterns...');
      console.log('📊 DEBUG: AI message:', aiMsg);
      console.log('📊 DEBUG: Contains "هل تريد إضافة مستند":', aiMsg.includes('هل تريد إضافة مستند'));
      console.log('📊 DEBUG: Contains "Do you want to add a document":', aiMsg.includes('Do you want to add a document'));
      console.log('📊 DEBUG: Contains "إضافة مستند":', aiMsg.includes('إضافة مستند'));
      console.log('📊 DEBUG: Contains "add a document":', aiMsg.includes('add a document'));
      console.log('📊 DEBUG: Contains "مستند" and "إضافة":', aiMsg.includes('مستند') && aiMsg.includes('إضافة'));
      
      if (aiMsg.includes('هل تريد إضافة مستند') || aiMsg.includes('Do you want to add a document') || 
          aiMsg.includes('إضافة مستند') || aiMsg.includes('add a document') ||
          (aiMsg.includes('مستند') && aiMsg.includes('إضافة'))) {
        console.log('📊 DEBUG: Processing AddDocument response:', { userMsg, aiMsg });
        console.log('📊 DEBUG: User message contains "نعم":', userMsg.toLowerCase().includes('نعم'));
        console.log('📊 DEBUG: User message contains "yes":', userMsg.toLowerCase().includes('yes'));
        console.log('📊 DEBUG: User message exact match "نعم":', userMsg.toLowerCase() === 'نعم');
        console.log('📊 DEBUG: User message exact match "yes":', userMsg.toLowerCase() === 'yes');
        console.log('📊 DEBUG: User message length:', userMsg.length);
        console.log('📊 DEBUG: User message characters:', userMsg.split('').map(c => c.charCodeAt(0)));
        console.log('📊 DEBUG: User message raw:', JSON.stringify(userMsg));
        
        // More comprehensive matching for "no" responses
        if (userMsg.toLowerCase().includes('لا') || userMsg.toLowerCase().includes('no') || 
            userMsg.toLowerCase().includes('كفاية') || userMsg.toLowerCase().includes('enough') ||
            userMsg.toLowerCase() === 'no' || userMsg.toLowerCase() === 'لا') {
          data.AddDocument = 'no';
          console.log('📊 DEBUG: Set AddDocument to "no"');
        } 
        // More comprehensive matching for "yes" responses
        else if (userMsg.toLowerCase().includes('نعم') || userMsg.toLowerCase().includes('yes') || 
                 userMsg.toLowerCase().includes('أيوه') || userMsg.toLowerCase().includes('ok') ||
                 userMsg.toLowerCase() === 'yes' || userMsg.toLowerCase() === 'نعم') {
          data.AddDocument = 'yes';
          console.log('📊 DEBUG: Set AddDocument to "yes"');
        } else {
          console.log('📊 DEBUG: No match found for AddDocument response, userMsg:', userMsg);
        }
      } else {
        console.log('📊 DEBUG: No AddDocument pattern match found');
      }
      
      if (aiMsg.includes('نوع المستند') || aiMsg.includes('document type') || aiMsg.includes('إيه نوع المستند')) {
        if (!data.DocumentType) { // Only set if not already set
          data.DocumentType = userMsg.trim();
          console.log('📊 Collected: Document Type =', data.DocumentType);
        } else {
          console.log('📊 DEBUG: DocumentType already set to:', data.DocumentType, ', skipping user response:', userMsg);
        }
      }

      // Extract document upload confirmation
      if (aiMsg.includes('يمكنك رفع المستند الآن') || aiMsg.includes('upload the document now') || aiMsg.includes('اسحب الملف هنا')) {
        // Any response after upload request is considered as upload confirmation
        data.DocumentUploaded = 'yes';
        console.log('📊 Collected: Document Uploaded = yes (user response:', userMsg, ')');
      }

      // Handle "Add another document" question
      if (aiMsg.includes('هل تريد إضافة مستند آخر؟') || aiMsg.includes('Do you want to add another document?')) {
        if (userMsg.toLowerCase().includes('نعم') || userMsg.toLowerCase().includes('yes')) {
          data.DocumentComplete = 'no'; // User wants to add another document
          console.log('📊 Collected: Add Another Document = yes');
        } else if (userMsg.toLowerCase().includes('لا') || userMsg.toLowerCase().includes('no')) {
          data.DocumentComplete = 'yes'; // User does not want to add another document
          console.log('📊 Collected: Add Another Document = no');
        }
      }
      
      if (aiMsg.includes('منظمة المبيعات') || aiMsg.includes('sales organization') || aiMsg.includes('إيه منظمة المبيعات')) {
        data.SalesOrgOption = userMsg.trim();
        console.log('📊 DEBUG: Set SalesOrgOption to:', data.SalesOrgOption);
      }
      
      if (aiMsg.includes('قناة التوزيع') || aiMsg.includes('distribution channel') || aiMsg.includes('إيه قناة التوزيع')) {
        data.DistributionChannelOption = userMsg.trim();
        console.log('📊 DEBUG: Set DistributionChannelOption to:', data.DistributionChannelOption);
      }
      
      if (aiMsg.includes('القسم') || aiMsg.includes('division') || aiMsg.includes('إيه القسم')) {
        data.DivisionOption = userMsg.trim();
        console.log('📊 DEBUG: Set DivisionOption to:', data.DivisionOption);
      }
      
      // Handle contact completion responses - More comprehensive pattern matching
      if (aiMsg.includes('هل تريد إضافة جهة اتصال أخرى') || aiMsg.includes('Do you want to add another contact') ||
          aiMsg.includes('جهة اتصال أخرى') || aiMsg.includes('another contact')) {
        console.log('📊 DEBUG: Processing contact completion response:', { userMsg, aiMsg });
        console.log('📊 DEBUG: User message contains "لا":', userMsg.toLowerCase().includes('لا'));
        console.log('📊 DEBUG: User message contains "no":', userMsg.toLowerCase().includes('no'));
        
        // More comprehensive matching for "no" responses
        if (userMsg.toLowerCase().includes('لا') || userMsg.toLowerCase().includes('no') || 
            userMsg.toLowerCase().includes('كفاية') || userMsg.toLowerCase().includes('enough') ||
            userMsg.toLowerCase() === 'no' || userMsg.toLowerCase() === 'لا') {
          data.ContactComplete = 'no';
          console.log('📊 DEBUG: Set ContactComplete to "no"');
        } 
        // More comprehensive matching for "yes" responses
        else if (userMsg.toLowerCase().includes('نعم') || userMsg.toLowerCase().includes('yes') || 
                 userMsg.toLowerCase().includes('أيوه') || userMsg.toLowerCase().includes('ok') ||
                 userMsg.toLowerCase() === 'yes' || userMsg.toLowerCase() === 'نعم') {
          data.ContactComplete = 'yes';
          console.log('📊 DEBUG: Set ContactComplete to "yes"');
        } else {
          console.log('📊 DEBUG: No match found for ContactComplete response, userMsg:', userMsg);
        }
      }
      
      // Handle document upload confirmation
      if (aiMsg.includes('هل تم رفع المستند بنجاح') || aiMsg.includes('Was the document uploaded successfully')) {
        console.log('📊 DEBUG: Processing document upload confirmation:', { userMsg, aiMsg });
        if (userMsg.toLowerCase().includes('نعم') || userMsg.toLowerCase().includes('yes') || 
            userMsg.toLowerCase().includes('أيوه') || userMsg.toLowerCase().includes('ok') ||
            userMsg.toLowerCase().includes('تم') || userMsg.toLowerCase().includes('done')) {
          data.DocumentUploaded = 'yes';
          console.log('📊 DEBUG: Set DocumentUploaded to "yes"');
        } else if (userMsg.toLowerCase().includes('لا') || userMsg.toLowerCase().includes('no') || 
                   userMsg.toLowerCase().includes('لسه') || userMsg.toLowerCase().includes('not yet')) {
          data.DocumentUploaded = 'no';
          console.log('📊 DEBUG: Set DocumentUploaded to "no"');
        }
      }
      
      // Extract document description
      if (aiMsg.includes('وصف للمستند') || aiMsg.includes('document description') || aiMsg.includes('إيه الوصف للمستند')) {
        if (this.isSkipResponse(userMsg)) {
          data.DocumentDescription = 'SKIPPED';
          console.log('📊 DEBUG: User skipped document description field');
          // Add a confirmation message to conversation history
          this.conversationHistory.push({
            role: 'assistant',
            content: 'حسناً، تم تخطي وصف المستند. ممتاز! يمكنك رفع المستند الآن. اسحب الملف هنا أو اضغط لاختياره'
          });
        } else {
          data.DocumentDescription = userMsg.trim();
          console.log('📊 DEBUG: Set DocumentDescription to:', data.DocumentDescription);
        }
      }
      
      // Handle document completion responses - More comprehensive pattern matching
      if (aiMsg.includes('هل تريد إضافة مستند آخر') || aiMsg.includes('Do you want to add another document') ||
          aiMsg.includes('مستند آخر') || aiMsg.includes('another document')) {
        console.log('📊 DEBUG: Processing document completion response:', { userMsg, aiMsg });
        console.log('📊 DEBUG: User message contains "لا":', userMsg.toLowerCase().includes('لا'));
        console.log('📊 DEBUG: User message contains "no":', userMsg.toLowerCase().includes('no'));
        
        // More comprehensive matching for "no" responses
        if (userMsg.toLowerCase().includes('لا') || userMsg.toLowerCase().includes('no') || 
            userMsg.toLowerCase().includes('كفاية') || userMsg.toLowerCase().includes('enough') ||
            userMsg.toLowerCase() === 'no' || userMsg.toLowerCase() === 'لا') {
          data.DocumentUploadConfirm = 'no';
          console.log('📊 DEBUG: Set DocumentUploadConfirm to "no"');
        } 
        // More comprehensive matching for "yes" responses
        else if (userMsg.toLowerCase().includes('نعم') || userMsg.toLowerCase().includes('yes') || 
                 userMsg.toLowerCase().includes('أيوه') || userMsg.toLowerCase().includes('ok') ||
                 userMsg.toLowerCase() === 'yes' || userMsg.toLowerCase() === 'نعم') {
          data.DocumentUploadConfirm = 'yes';
          console.log('📊 DEBUG: Set DocumentUploadConfirm to "yes"');
        } else {
          console.log('📊 DEBUG: No match found for DocumentUploadConfirm response, userMsg:', userMsg);
        }
      }
    }
    
    // Log collected fields summary
    const collectedFields = Object.keys(data).filter(key => data[key] && data[key] !== '');
    if (collectedFields.length > 0) {
      console.log('📊 Collected fields:', collectedFields.join(', '));
    }
    
    // Cache the collected data
    this.collectedCustomerData = data;
    
    return data;
  }

  private isCustomerDataComplete(data: any): boolean {
    console.log('✅ ====== IS CUSTOMER DATA COMPLETE START ======');
    console.log('✅ Input data:', data);
    
    // Required fields for customer creation - MATCHING New Request Page
    const requiredFields = [
      'firstName',           // Company Name
      'firstNameAR',         // Company Name in Arabic
      'tax',                 // Tax Number
      'country',             // Country
      'city',                // City
      'CustomerType',        // Customer Type
      'CompanyOwnerFullName' // Company Owner
    ];
    console.log('✅ Required fields:', requiredFields);
    
    // Sales information fields
    const salesFields = [
      'SalesOrgOption',      // Sales Organization
      'DistributionChannelOption', // Distribution Channel
      'DivisionOption'       // Division
    ];
    
    // Check if all required fields are present and not empty (or skipped)
    const hasRequiredFields = requiredFields.every(field => {
      const value = data[field];
      const hasValue = value && (value.trim() || value === 'SKIPPED');
      console.log(`✅ Required field ${field}: "${value}" (hasValue: ${hasValue})`);
      return hasValue;
    });
    console.log('✅ Has all required fields?', hasRequiredFields);
    
    // Check if optional fields are handled (either filled or skipped)
    const optionalFields = ['buildingNumber', 'street', 'Landline', 'DocumentDescription', 'SalesOrgOption', 'DistributionChannelOption', 'DivisionOption'];
    const hasOptionalFields = optionalFields.every(field => {
      const value = data[field];
      const hasValue = value && (value.trim() || value === 'SKIPPED');
      console.log(`✅ Optional field ${field}: "${value}" (hasValue: ${hasValue})`);
      return hasValue;
    });
    console.log('✅ Has all optional fields?', hasOptionalFields);
    
    // Check if all sales fields are handled (either filled or skipped) - they are optional
    const hasSalesFields = salesFields.every(field => {
      const value = data[field];
      const hasValue = value && (value.trim() || value === 'SKIPPED');
      console.log(`✅ Sales field ${field}: "${value}" (hasValue: ${hasValue})`);
      return hasValue;
    });
    console.log('✅ Has all sales fields?', hasSalesFields);
    
    // Check if contact is handled (either added or skipped)
    const hasContact = (data.AddContact === 'no') || (data.ContactName && data.ContactName.trim());
    console.log('✅ Has contact?', hasContact, '(AddContact:', data.AddContact, ', ContactName:', data.ContactName, ')');
    
    // Check if document is handled (either added or skipped)
    const hasDocument = (data.AddDocument === 'no' && !data.DocumentType) || // User said no and no document type provided
                       (data.DocumentType && data.DocumentType.trim() && data.DocumentUploaded === 'yes'); // User provided document type and uploaded
    console.log('✅ Has document?', hasDocument, '(AddDocument:', data.AddDocument, ', DocumentType:', data.DocumentType, ', DocumentUploaded:', data.DocumentUploaded, ')');
    
    console.log('✅ DEBUG: isCustomerDataComplete check:', {
      hasRequiredFields,
      hasSalesFields,
      hasContact,
      hasDocument,
      data
    });
    
    const isComplete = hasRequiredFields && hasOptionalFields && hasContact && hasDocument && hasSalesFields;
    console.log('✅ Final result - is data complete?', isComplete);
    console.log('✅ ====== IS CUSTOMER DATA COMPLETE END ======');
    return isComplete;
  }

  private async saveCustomerToAPI(customerData: any): Promise<{success: boolean, error?: string}> {
    try {
      console.log('💾 ====== SAVE CUSTOMER TO API START ======');
      console.log('💾 Input customer data:', customerData);
      
      // Build contacts array - same structure as new-request component
      const contacts = [];
      if (customerData.ContactName) {
        contacts.push({
          name: customerData.ContactName,
          jobTitle: customerData.JobTitle || '',
          email: customerData.EmailAddress || '',
          mobile: customerData.MobileNumber || '',
          landline: customerData.Landline === 'SKIPPED' ? '' : (customerData.Landline || ''),
          preferredLanguage: customerData.PrefferedLanguage || 'Arabic'
        });
      }
      console.log('💾 Built contacts array:', contacts);
      
      // Build documents array - same structure as new-request component
      const documents = [];
      if (customerData.DocumentType) {
        documents.push({
          type: customerData.DocumentType,
          description: customerData.DocumentDescription === 'SKIPPED' ? '' : (customerData.DocumentDescription || ''),
          file: customerData.DocumentFile || 'uploaded_file.pdf' // Placeholder for file
        });
      }
      console.log('💾 Built documents array:', documents);
      
      // Build complete payload - same structure as new-request component
      const fullCustomerData = {
        firstName: customerData.firstName,
        firstNameAr: customerData.firstNameAR,
        tax: customerData.tax,
        buildingNumber: customerData.buildingNumber,
        street: customerData.street,
        country: customerData.country,
        city: customerData.city,
        CustomerType: customerData.CustomerType,
        CompanyOwner: customerData.CompanyOwnerFullName,
        SalesOrgOption: customerData.SalesOrgOption || 'HSA Egypt 1000',
        DistributionChannelOption: customerData.DistributionChannelOption || 'Modern Trade',
        DivisionOption: customerData.DivisionOption || 'Food Products',
        ContactName: customerData.ContactName,
        EmailAddress: customerData.EmailAddress,
        MobileNumber: customerData.MobileNumber,
        JobTitle: customerData.JobTitle,
        Landline: customerData.Landline === 'SKIPPED' ? '' : customerData.Landline,
        PrefferedLanguage: customerData.PrefferedLanguage,
        contacts: contacts,
        documents: documents,
        origin: 'dataEntry',
        sourceSystem: 'AI Assistant',
        createdBy: 'data_entry',
        status: 'Pending',
        assignedTo: 'reviewer'
      };
      console.log('💾 Full payload to send:', fullCustomerData);

      const response = await this.http.post(`${this.apiBase}/requests`, fullCustomerData).toPromise();
      console.log('💾 Customer saved successfully:', response);
      console.log('💾 ====== SAVE CUSTOMER TO API END ======');
      return { success: true };
    } catch (error) {
      console.error('💾 Error saving customer:', error);
      console.log('💾 ====== SAVE CUSTOMER TO API END (ERROR) ======');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Clear conversation history
  clearHistory(): void {
    this.conversationHistory = [];
  }

  // Get conversation history
  getHistory(): ClaudeMessage[] {
    return [...this.conversationHistory];
  }

  // Update system context
  updateContext(newContext: Partial<SystemContext>): void {
    if (this.systemContext) {
      this.systemContext = { ...this.systemContext, ...newContext };
    }
  }
}
