import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { 
  CUSTOMER_TYPE_OPTIONS,
  SALES_ORG_OPTIONS,
  DISTRIBUTION_CHANNEL_OPTIONS,
  DIVISION_OPTIONS,
  CITY_OPTIONS,
  getCitiesByCountry,
  PREFERRED_LANGUAGE_OPTIONS,
  DOCUMENT_TYPE_OPTIONS
} from '../shared/lookup-data';
import { SmartDropdownMatcherService } from './smart-dropdown-matcher.service';

export interface ExtractedData {
  firstName: string;
  firstNameAR: string;
  tax: string;
  CustomerType: string;
  ownerName: string;
  buildingNumber: string;
  street: string;
  country: string;
  city: string;
  salesOrganization: string;
  distributionChannel: string;
  division: string;
  contacts: Array<{
    name: string;
    jobTitle: string;
    email: string;
    mobile: string;
    landline: string;
    preferredLanguage: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class DataEntryAgentService {
  private apiBase = environment.apiBaseUrl || 'http://localhost:3001/api';
  private extractedData: ExtractedData;
  private uploadedDocuments: Array<{id: string, name: string, type: string, size: number, content: string}> = [];
  private conversationHistory: Array<{role: string, content: string}> = [];
  private systemPrompt = '';
  private currentUser: any = null;
  private sessionId: string;
  private requestId: string | null = null;
  
  // Performance optimizations
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly MAX_CONVERSATION_HISTORY = 10;
  private readonly MAX_DOCUMENTS = 5;

  constructor(private http: HttpClient, private smartMatcher: SmartDropdownMatcherService) {
    this.extractedData = this.initializeExtractedData();
    this.sessionId = this.generateSessionId();
    this.loadCurrentUser();
  }

  private initializeExtractedData(): ExtractedData {
    return {
      firstName: '',
      firstNameAR: '',
      tax: '',
      CustomerType: '',
      ownerName: '',
      buildingNumber: '',
      street: '',
      country: '',
      city: '',
      salesOrganization: '',
      distributionChannel: '',
      division: '',
      contacts: []
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadCurrentUser(): Promise<void> {
    const username = sessionStorage.getItem('username') || localStorage.getItem('username') || 'data_entry';
    console.log('🧪 [Service] Loading current user with username:', username);
    
    // Try to load user with retry logic
    let retries = 3;
    while (retries > 0) {
      try {
        const response = await firstValueFrom(
          this.http.get<any>(`${this.apiBase}/auth/me?username=${username}`)
        );
        this.currentUser = response;
        console.log('🧪 [Service] Current user loaded:', this.currentUser);
        break;
      } catch (error) {
        retries--;
        console.warn(`Could not load current user (${3 - retries}/3):`, error);
        
        if (retries === 0) {
          this.currentUser = { fullName: 'Data Entry User', role: 'data_entry', username: 'data_entry' };
          console.log('🧪 [Service] Using fallback user after all retries failed:', this.currentUser);
        } else {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    this.initializeSystemPrompt();
  }

  private initializeSystemPrompt(): void {
    const userName = this.currentUser?.fullName || 'User';
    const userRole = this.currentUser?.role || 'data_entry';
    
    this.systemPrompt = `You are an intelligent Data Entry AI Assistant for MDM (Master Data Management) system.

**Your Primary Role:**
- Extract customer data from uploaded documents using AI vision
- Ask for missing required fields one at a time
- Provide dropdown options for selection fields
- Guide users through the complete data entry process
- Check for duplicates before submission

**User Context:**
- Current User: ${userName}
- User Role: ${userRole}
- Session: ${this.sessionId}

**Key Behaviors:**
1. Always respond in both Arabic and English
2. Be concise and professional
3. Ask for ONE missing field at a time
4. For dropdown fields, provide numbered options for easy selection
5. Accept both number selection and text input
6. Validate all data before submission
7. Show progress to the user

**Important:**
- Never show JSON or technical details
- Always use friendly, clear language
- Minimize typing for the user
- Provide shortcuts and quick options`;
  }

  getCurrentUser(): any {
    return this.currentUser;
  }

  getWelcomeMessage(): string {
    const fullName = this.currentUser?.fullName || 'User';
    
    return `Welcome ${fullName}! 

Ready to save some time today? I'm your AI assistant - I can quickly extract data from your documents and help you create customer requests effortlessly. 

Just hit the paperclip icon to upload your files and watch the magic happen! ✨`;
  }

  private getTimeBasedGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير / Good morning';
    if (hour < 18) return 'مساء الخير / Good afternoon';
    return 'مساء الخير / Good evening';
  }

  async uploadAndProcessDocuments(files: File[], documentsMetadata?: Array<{ country?: string; type: string; description: string }>): Promise<ExtractedData> {
    try {
      // Validate files
      this.validateFiles(files);

      // Convert to base64 with optimization
      const base64Files = await this.convertFilesToBase64(files);

      // Store documents with cleanup
      this.storeDocuments(base64Files);

      // Extract data using AI
      const extractedData = await this.extractDataFromDocuments(base64Files);

      // Smart match dropdowns to exact system values
      try {
        const matchResult = await this.smartMatcher.matchExtractedToSystemValues(extractedData);
        if (matchResult?.matchedValues) {
          console.log('🎯 [Service] Smart matched values:', matchResult.matchedValues);
          this.extractedData = { ...this.extractedData, ...matchResult.matchedValues } as ExtractedData;
          // Optionally: store reasoning/confidence if needed later
        }
      } catch (e) {
        console.warn('⚠️ [Service] Smart matching failed, proceeding with raw values.', e);
      }

      // Merge with existing data
      this.extractedData = { ...this.extractedData, ...extractedData };

      // Translate if needed
      await this.handleArabicTranslation();

      // Clean up memory
      this.cleanupMemory(base64Files);

      return this.extractedData;
    } catch (error: any) {
      console.error('Error processing documents:', error);
      throw this.handleDocumentError(error);
    }
  }

  private validateFiles(files: File[]): void {
    const oversizedFiles = files.filter(f => f.size > this.MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      throw new Error(`الملفات كبيرة جداً (الحد الأقصى 5MB) / Files too large (max 5MB): ${oversizedFiles.map(f => f.name).join(', ')}`);
    }

    const pdfFiles = files.filter(f => f.type === 'application/pdf');
    if (pdfFiles.length > 0) {
      throw new Error('ملفات PDF غير مدعومة. الرجاء تحويلها لصور (JPG/PNG) / PDF files not supported. Please convert to images (JPG/PNG)');
    }
  }

  private async convertFilesToBase64(files: File[]): Promise<any[]> {
    const base64Files = [];
    for (const file of files) {
      const base64 = await this.fileToBase64(file);
      base64Files.push({
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        content: base64
      });
      // Small delay to prevent memory spike
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return base64Files;
  }

  private storeDocuments(base64Files: any[]): void {
    // Limit stored documents to prevent memory issues
    if (this.uploadedDocuments.length > this.MAX_DOCUMENTS) {
      this.uploadedDocuments = this.uploadedDocuments.slice(-3);
    }
    this.uploadedDocuments.push(...base64Files);
  }

  private cleanupMemory(base64Files: any[]): void {
    // Clear base64 content after processing
    base64Files.forEach(file => {
      file.content = '';
    });
  }

  private async extractDataFromDocuments(documents: Array<{content: string, name: string, type: string, size: number}>): Promise<Partial<ExtractedData>> {
    const maxRetries = 3;
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let requestBody: any = null;
      try {
        console.log(`🧪 [Service] Starting document extraction (attempt ${attempt}/${maxRetries})...`, {
          documentCount: documents.length,
          hasApiKey: !!environment.openaiApiKey,
          apiKeyLength: environment.openaiApiKey?.length || 0,
          model: environment.openaiModel
        });

      // Validate API key
      if (!environment.openaiApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const messages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract customer data from these business documents with MAXIMUM PRECISION.

CRITICAL EXTRACTION RULES:
1. SCAN EVERY PIXEL - examine headers, footers, margins, stamps, logos, watermarks
2. For Arabic text, provide both Arabic and transliterated English versions
3. Find ALL numbers - tax IDs, VAT numbers, registration numbers, license numbers, certificate numbers
4. Look for company names in headers, logos, official stamps, or anywhere on the document
5. Extract complete addresses from all sections including building numbers, street names, districts
6. Find owner/CEO/manager names in signatures, official sections, or any text
7. Extract ALL dates in any format (DD/MM/YYYY, YYYY-MM-DD, Arabic dates, etc.)
8. Look for business activity descriptions, company purpose, or trade descriptions

SPECIAL ATTENTION TO TAX NUMBERS:
- Look for patterns like: EG-XXXXXXX, VAT numbers, Tax ID, Registration numbers
- Check headers, footers, official stamps, and certificate numbers
- Include any number that looks like an official identifier
- Even if partially visible, extract what you can see

REQUIRED JSON FORMAT (NO OTHER TEXT):
{
  "firstName": "Complete company name in English",
  "firstNameAR": "اسم الشركة الكامل بالعربية",
  "tax": "Tax number, VAT number, or ANY official ID number found",
  "CustomerType": "Corporate or Individual",
  "ownerName": "Owner/CEO/Manager/Director name",
  "buildingNumber": "Building, unit, or property number",
  "street": "Complete street address",
  "country": "Country name",
  "city": "City name",
  "registrationNumber": "Commercial registration or license number",
  "issueDate": "Document issue date (any format)",
  "expiryDate": "Document expiry date (any format)",
  "businessActivity": "Business type, activity, or company purpose"
}

MANDATORY REQUIREMENTS:
- If you see ANY number that could be a tax/registration/VAT ID - extract it EXACTLY
- If you see a company name - extract the COMPLETE name
- If you see an address - extract the FULL address including building numbers
- If you see dates - extract them in ANY readable format
- If you see owner names - extract them COMPLETELY
- NEVER leave tax, registration, or ID fields empty if ANY number is visible
- SCAN the entire document multiple times for completeness
- Double-check every field for accuracy`
            },
            ...documents.map(doc => ({
              type: 'image_url',
              image_url: {
                url: `data:${doc.type};base64,${doc.content}`
              }
            }))
          ]
        }
      ];

      const requestBody = {
        model: environment.openaiModel || 'gpt-4o',
        messages,
        max_tokens: 4000,
        temperature: 0.0, // More deterministic for consistent extraction
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0
      };

      console.log('🧪 [Service] Sending request to OpenAI...', {
        model: requestBody.model,
        messageCount: messages.length,
        documentCount: documents.length,
        documentTypes: documents.map(doc => ({ name: doc.name, type: doc.type, contentLength: doc.content.length }))
      });

      // Validate request structure before sending
      console.log('🧪 [Service] Validating request structure...');
      
      // Check if messages array exists and has content
      if (!requestBody.messages || requestBody.messages.length === 0) {
        throw new Error('No messages to send');
      }
      
      // Check each message
      requestBody.messages.forEach((message, index) => {
        if (!message.role) {
          throw new Error(`Message ${index} missing role`);
        }
        if (!message.content || message.content.length === 0) {
          throw new Error(`Message ${index} missing content`);
        }
        
        // Check each content item
        message.content.forEach((content, contentIndex) => {
          if (!content.type) {
            throw new Error(`Message ${index}, Content ${contentIndex} missing type`);
          }
          
          if (content.type === 'image_url') {
            if (!(content as any).image_url || !(content as any).image_url.url) {
              throw new Error(`Message ${index}, Content ${contentIndex} image_url missing or invalid`);
            }
            
            const url = (content as any).image_url.url;
            if (!url.startsWith('data:')) {
              throw new Error(`Message ${index}, Content ${contentIndex} image_url does not start with 'data:'`);
            }
            
            console.log(`🧪 [Service] Validated image_url: ${url.substring(0, 50)}...`);
          }
        });
      });
      
      console.log('🧪 [Service] Request structure validation passed ✅');

      // Log the actual request body structure for debugging
      console.log('🧪 [Service] Request body structure:', {
        model: requestBody.model,
        messageCount: requestBody.messages.length,
        firstMessageContentTypes: requestBody.messages[0]?.content?.map(c => c.type),
        imageUrls: requestBody.messages[0]?.content?.filter(c => c.type === 'image_url')?.map(c => ({
          type: c.type,
          urlPrefix: (c as any).image_url?.url?.substring(0, 50) + '...'
        }))
      });

      // Log the full request body for debugging (be careful with large data)
      console.log('🧪 [Service] Full request body (first 500 chars):', JSON.stringify(requestBody).substring(0, 500));
      
      // Log each message content in detail
      requestBody.messages.forEach((message, index) => {
        console.log(`🧪 [Service] Message ${index}:`, {
          role: message.role,
          contentTypes: message.content?.map(c => c.type),
          contentCount: message.content?.length
        });
        
        if (message.content) {
          message.content.forEach((content, contentIndex) => {
            if (content.type === 'image_url') {
              console.log(`🧪 [Service] Content ${contentIndex} (image_url):`, {
                type: content.type,
                urlLength: (content as any).image_url?.url?.length,
                urlPrefix: (content as any).image_url?.url?.substring(0, 100) + '...'
              });
            } else {
              console.log(`🧪 [Service] Content ${contentIndex} (${content.type}):`, {
                type: content.type,
                textLength: (content as any).text?.length,
                textPreview: (content as any).text?.substring(0, 100) + '...'
              });
            }
          });
        }
      });

      const response = await firstValueFrom(
        this.http.post<any>('https://api.openai.com/v1/chat/completions', requestBody, {
          headers: {
            'Authorization': `Bearer ${environment.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        })
      );

      console.log('🧪 [Service] OpenAI response received:', {
        hasChoices: !!response.choices,
        choiceCount: response.choices?.length || 0,
        hasContent: !!response.choices?.[0]?.message?.content
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response from OpenAI');
      }

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      console.log('🧪 [Service] Raw OpenAI content:', content.substring(0, 200) + '...');

      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      console.log('🧪 [Service] Cleaned content:', cleanedContent.substring(0, 200) + '...');

      const extractedData = JSON.parse(cleanedContent);
      console.log('🧪 [Service] Parsed data:', extractedData);
      
      // Auto-detect country from content if not set
      if (!extractedData.country) {
        extractedData.country = this.detectCountryFromData(extractedData);
      }

        return extractedData;
      } catch (error: any) {
        lastError = error;
        console.error(`🧪 [Service] Extraction error (attempt ${attempt}/${maxRetries}):`, error);
        
        // Log detailed error information
        if (error.error) {
          console.error('🧪 [Service] Error details:', {
            message: error.error.message,
            type: error.error.type,
            param: error.error.param,
            code: error.error.code,
            status: error.status,
            statusText: error.statusText
          });
        }
        
        // Log the request that caused the error
        console.error('🧪 [Service] Failed request details:', {
          model: requestBody?.model || 'unknown',
          messageCount: requestBody?.messages?.length || 0,
          firstMessageContentTypes: requestBody?.messages?.[0]?.content?.map((c: any) => c.type) || []
        });
        
        // If this is not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          const waitTime = attempt * 1000; // Exponential backoff: 1s, 2s, 3s
          console.log(`🧪 [Service] Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // If we get here, all retries failed
    console.error('🧪 [Service] All extraction attempts failed');
    throw this.handleExtractionError(lastError);
  }

  private detectCountryFromData(data: any): string {
    const text = JSON.stringify(data).toLowerCase();
    if (text.includes('egypt') || text.includes('مصر')) return 'Egypt';
    if (text.includes('saudi') || text.includes('السعودية')) return 'Saudi Arabia';
    if (text.includes('emirates') || text.includes('الإمارات')) return 'United Arab Emirates';
    if (text.includes('yemen') || text.includes('اليمن')) return 'Yemen';
    return '';
  }

  private async handleArabicTranslation(): Promise<void> {
    if (this.extractedData.firstName && !this.extractedData.firstNameAR) {
      this.extractedData.firstNameAR = await this.translateToArabic(this.extractedData.firstName);
    }
  }

  private async translateToArabic(text: string): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.http.post<any>('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: `Translate this company name to Arabic. Return ONLY the Arabic translation, nothing else: "${text}"`
            }
          ],
          max_tokens: 100,
          temperature: 0.3
        }, {
          headers: {
            'Authorization': `Bearer ${environment.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        })
      );
      
      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original if translation fails
    }
  }

  async sendMessage(userMessage: string, additionalContext?: any): Promise<string> {
    try {
      // Add to conversation with cleanup
      this.addToConversation('user', userMessage);

      // Build context-aware prompt
      const contextPrompt = this.buildContextPrompt(userMessage, additionalContext);

      const requestBody = {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: this.systemPrompt },
          ...this.conversationHistory.slice(-5), // Only last 5 messages
          { role: 'system', content: contextPrompt }
        ],
        max_tokens: 500,
        temperature: 0.7
      };

      const response = await firstValueFrom(
        this.http.post<any>('https://api.openai.com/v1/chat/completions', requestBody, {
          headers: {
            'Authorization': `Bearer ${environment.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        })
      );

      const aiResponse = response.choices[0].message.content;
      this.addToConversation('assistant', aiResponse);
      
      return aiResponse;
    } catch (error: any) {
      console.error('Error in sendMessage:', error);
      throw new Error('فشل في معالجة الرسالة / Failed to process message');
    }
  }

  private addToConversation(role: string, content: string): void {
    this.conversationHistory.push({ role, content });
    
    // Strictly limit history
    if (this.conversationHistory.length > this.MAX_CONVERSATION_HISTORY) {
      this.conversationHistory = this.conversationHistory.slice(-8);
    }
  }

  private buildContextPrompt(userMessage: string, additionalContext?: any): string {
    const missingFields = this.getMissingRequiredFields();
    const progress = this.calculateProgress();
    
    return `Current Progress: ${progress}% complete
Missing Fields: ${missingFields.join(', ') || 'None'}
Extracted Data Summary: 
- Company: ${this.extractedData.firstName || 'Not set'}
- Tax: ${this.extractedData.tax || 'Not set'}
- Type: ${this.extractedData.CustomerType || 'Not set'}

User Message: ${userMessage}
Additional Context: ${JSON.stringify(additionalContext || {})}

Respond helpfully and guide the user to complete missing information.
If user provides a field value, confirm it was saved.
For dropdown fields, provide numbered options.`;
  }

  private getMissingRequiredFields(): string[] {
    const required = [
      'firstName', 'firstNameAR', 'tax', 'CustomerType',
      'ownerName', 'buildingNumber', 'street', 'country', 'city',
      'salesOrganization', 'distributionChannel', 'division'
    ];
    
    return required.filter(field => !(this.extractedData as any)[field]);
  }

  private calculateProgress(): number {
    const total = 13; // Total required fields
    const completed = 13 - this.getMissingRequiredFields().length;
    return Math.round((completed / total) * 100);
  }

  updateExtractedDataField(field: string, value: any): void {
    console.log('🧪 [Service] updateExtractedDataField called:', { field, value });
    console.log('🧪 [Service] Before update - extractedData:', this.extractedData);
    
    (this.extractedData as any)[field] = value;
    
    console.log('🧪 [Service] After update - extractedData:', this.extractedData);
    
    // Handle country-city relationship
    if (field === 'country') {
      this.extractedData.city = ''; // Reset city when country changes
      console.log('🧪 [Service] Reset city due to country change');
    }
  }

  getExtractedData(): ExtractedData {
    return this.extractedData;
  }

  getDropdownOptions(fieldName: string): any[] {
    const mapping: { [key: string]: any[] } = {
      'CustomerType': CUSTOMER_TYPE_OPTIONS.map(opt => ({ value: opt, label: opt })),
      'country': Object.keys(CITY_OPTIONS).map(c => ({ value: c, label: c })),
      'city': getCitiesByCountry(this.extractedData.country).map(c => ({ value: c, label: c })),
      'salesOrganization': this.getSalesOrgOptionsByCountry(this.extractedData.country),
      'distributionChannel': (DISTRIBUTION_CHANNEL_OPTIONS as any[]).map(opt => ({ value: opt.value, label: opt.label })),
      'division': (DIVISION_OPTIONS as any[]).map(opt => ({ value: opt.value, label: opt.label })),
      'preferredLanguage': (PREFERRED_LANGUAGE_OPTIONS as any[]).map(opt => ({ value: opt, label: opt }))
    };
    
    return mapping[fieldName] || [];
  }

  private getSalesOrgOptionsByCountry(country: string): any[] {
    if (!country || country.trim() === '') {
      return (SALES_ORG_OPTIONS as any[]).map(opt => ({ value: opt.value, label: opt.label }));
    }

    console.log('🧪 [Service] Filtering sales org options for country:', country);
    
    // Map country names to their prefixes in sales org values
    const countryPrefixMap: { [key: string]: string } = {
      'Egypt': 'egypt_',
      'Saudi Arabia': 'ksa_',
      'United Arab Emirates': 'uae_',
      'UAE': 'uae_',
      'Yemen': 'yemen_',
      'Kuwait': 'kuwait_',
      'Qatar': 'qatar_',
      'Bahrain': 'bahrain_',
      'Oman': 'oman_'
    };

    const prefix = countryPrefixMap[country] || '';
    console.log('🧪 [Service] Using prefix:', prefix);

    if (prefix) {
      const filteredOptions = (SALES_ORG_OPTIONS as any[]).filter(opt => opt.value.startsWith(prefix));
      console.log('🧪 [Service] Filtered sales org options:', filteredOptions.length, 'options found');
      return filteredOptions.map(opt => ({ value: opt.value, label: opt.label }));
    } else {
      // If no prefix found, return all options
      console.log('🧪 [Service] No prefix found, returning all sales org options');
      return (SALES_ORG_OPTIONS as any[]).map(opt => ({ value: opt.value, label: opt.label }));
    }
  }

  getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'firstName': 'اسم الشركة (إنجليزي) / Company Name (English)',
      'firstNameAR': 'اسم الشركة (عربي) / Company Name (Arabic)',
      'tax': 'الرقم الضريبي / Tax Number',
      'CustomerType': 'نوع العميل / Customer Type',
      'ownerName': 'اسم المالك / Owner Name',
      'buildingNumber': 'رقم المبنى / Building Number',
      'street': 'الشارع / Street',
      'country': 'الدولة / Country',
      'city': 'المدينة / City',
      'salesOrganization': 'منظمة المبيعات / Sales Organization',
      'distributionChannel': 'قناة التوزيع / Distribution Channel',
      'division': 'القسم / Division',
      'contacts': 'جهات الاتصال / Contacts'
    };
    return labels[fieldName] || fieldName;
  }

  async checkForDuplicates(): Promise<{ isDuplicate: boolean; existingRecord?: any; message?: string }> {
    try {
      if (!this.extractedData.tax || !this.extractedData.CustomerType) {
        return { isDuplicate: false };
      }

      const response = await firstValueFrom(
        this.http.post<any>(`${this.apiBase}/requests/check-duplicate`, {
          tax: this.extractedData.tax,
          CustomerType: this.extractedData.CustomerType
        })
      );

      return response;
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return { isDuplicate: false };
    }
  }

  async submitCustomerRequest(): Promise<any> {
    try {
      const payload = this.buildRequestPayload();
      
      const response = await firstValueFrom(
        this.http.post<any>(`${this.apiBase}/requests`, payload)
      );

      this.requestId = response.id;
      
      // Upload documents if any
      if (this.uploadedDocuments.length > 0 && response.id) {
        await this.uploadDocumentsToRequest(response.id);
      }
      
      return response;
    } catch (error: any) {
      console.error('Error submitting request:', error);
      throw error;
    }
  }

  private buildRequestPayload(): any {
    return {
      // Correct field names matching new-request component
      firstName: this.extractedData.firstName,
      firstNameAR: this.extractedData.firstNameAR,
      tax: this.extractedData.tax,
      CustomerType: this.extractedData.CustomerType,
      CompanyOwner: this.extractedData.ownerName, // FIXED: was CompanyOwnerFullName
      buildingNumber: this.extractedData.buildingNumber,
      street: this.extractedData.street,
      country: this.extractedData.country,
      city: this.extractedData.city,
      salesOrganization: this.extractedData.salesOrganization, // FIXED: was SalesOrgOption
      distributionChannel: this.extractedData.distributionChannel, // FIXED: was DistributionChannelOption
      division: this.extractedData.division, // FIXED: was DivisionOption
      status: 'pending',
      created_at: new Date().toISOString(),
      created_by: this.currentUser?.username || 'data_entry',
      contacts: this.extractedData.contacts || [],
      documents: []
    };
  }

  private async uploadDocumentsToRequest(requestId: string): Promise<void> {
    // Implementation for document upload - if needed
    console.log('Documents would be uploaded for request:', requestId);
  }

  reset(): void {
    this.extractedData = this.initializeExtractedData();
    
    // Clear documents with memory cleanup
    this.uploadedDocuments.forEach(doc => {
      doc.content = '';
    });
    this.uploadedDocuments = [];
    
    this.conversationHistory = [];
    this.requestId = null;
    this.initializeSystemPrompt();
    
    // Hint garbage collection
    if (typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  }

  private handleDocumentError(error: any): Error {
    if (error.status === 413) {
      return new Error('الملف كبير جداً / File too large');
    } else if (error.status === 401) {
      return new Error('OpenAI API key غير صالح / Invalid API key');
    } else if (error.status === 429) {
      return new Error('تجاوزت حد الاستخدام، حاول بعد دقائق / Rate limit exceeded');
    }
    return new Error(error.message || 'خطأ في معالجة المستندات / Document processing error');
  }

  private handleExtractionError(error: any): Error {
    console.error('Extraction error details:', error);
    
    // Provide more specific error messages
    if (error.status === 401) {
      return new Error('مفتاح OpenAI غير صالح / Invalid OpenAI API key');
    } else if (error.status === 429) {
      return new Error('تجاوزت حد الاستخدام، حاول بعد دقائق / Rate limit exceeded, try again later');
    } else if (error.status === 400) {
      return new Error('خطأ في البيانات المرسلة / Bad request - check image format');
    } else if (error.status === 413) {
      return new Error('الصورة كبيرة جداً / Image too large');
    } else if (error.status === 0 || !navigator.onLine) {
      return new Error('لا يوجد اتصال بالإنترنت / No internet connection');
    } else if (error.message?.includes('JSON')) {
      return new Error('خطأ في تحليل البيانات المستخرجة / Error parsing extracted data');
    }
    
    return new Error(`فشل استخراج البيانات / Extraction failed: ${error.message || 'Unknown error'}`);
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  addDocument(document: any): void {
    if (this.uploadedDocuments.length < this.MAX_DOCUMENTS) {
      this.uploadedDocuments.push(document);
    }
  }

  removeDocument(id: string): void {
    this.uploadedDocuments = this.uploadedDocuments.filter(doc => doc.id !== id);
  }

  getDocuments(): Array<any> {
    return this.uploadedDocuments;
  }

  getSessionInfo(): { sessionId: string; requestId?: string } {
    return {
      sessionId: this.sessionId,
      requestId: this.requestId || undefined
    };
  }
}



