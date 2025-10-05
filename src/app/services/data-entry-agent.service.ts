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

  constructor(private http: HttpClient) {
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
    try {
      const username = sessionStorage.getItem('username') || localStorage.getItem('username');
      if (username) {
        const response = await firstValueFrom(
          this.http.get<any>(`${this.apiBase}/users/${username}`)
        );
        this.currentUser = response;
      }
    } catch (error) {
      console.warn('Could not load current user:', error);
      this.currentUser = { fullName: 'Data Entry User', role: 'data_entry', username: 'data_entry' };
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
    const userName = this.currentUser?.fullName || 'Data Entry User';
    const greeting = this.getTimeBasedGreeting();
    
    return `${greeting} ${userName}! 👋

مرحباً بك في مساعد إدخال البيانات الذكي / Welcome to Data Entry AI Assistant

يمكنني مساعدتك في:
I can help you with:

📄 استخراج البيانات من المستندات / Extract data from documents
✍️ إكمال البيانات الناقصة / Complete missing information
✅ التحقق من التكرارات / Check for duplicates
📤 إرسال الطلبات للمراجعة / Submit requests for review

ابدأ برفع المستندات أو اكتب "help" للمساعدة
Start by uploading documents or type "help" for assistance`;
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
    try {
      const messages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract customer data from these business documents. 
              
CRITICAL INSTRUCTIONS:
1. Extract ALL visible information accurately
2. For Arabic text, provide both Arabic and transliterated English
3. Identify the document type (Commercial Registration, Tax Card, etc.)
4. Look for company names, tax numbers, addresses, owner names
5. Extract registration numbers, dates, and official stamps
6. If multiple languages exist, extract both

Return ONLY a JSON object with these exact fields:
{
  "firstName": "Company name in English",
  "firstNameAR": "اسم الشركة بالعربية",
  "tax": "Tax/Registration number",
  "CustomerType": "Corporate or Individual",
  "ownerName": "Owner/CEO/Manager name",
  "buildingNumber": "Building/Unit number",
  "street": "Street name/address",
  "country": "Country",
  "city": "City",
  "registrationNumber": "Commercial registration number",
  "issueDate": "Document issue date",
  "expiryDate": "Document expiry date",
  "businessActivity": "Business type/activity"
}

IMPORTANT: Extract EVERYTHING visible, even if some fields remain empty.`
            },
            ...documents.map(doc => ({
              type: 'image',
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
        temperature: 0.1
      };

      const response = await firstValueFrom(
        this.http.post<any>('https://api.openai.com/v1/chat/completions', requestBody, {
          headers: {
            'Authorization': `Bearer ${environment.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        })
      );

      const content = response.choices[0].message.content;
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const extractedData = JSON.parse(cleanedContent);
      
      // Auto-detect country from content if not set
      if (!extractedData.country) {
        extractedData.country = this.detectCountryFromData(extractedData);
      }

      return extractedData;
    } catch (error: any) {
      throw this.handleExtractionError(error);
    }
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
    (this.extractedData as any)[field] = value;
    
    // Handle country-city relationship
    if (field === 'country') {
      this.extractedData.city = ''; // Reset city when country changes
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
      'salesOrganization': (SALES_ORG_OPTIONS as any[]).map(opt => ({ value: opt.value, label: opt.label })),
      'distributionChannel': (DISTRIBUTION_CHANNEL_OPTIONS as any[]).map(opt => ({ value: opt.value, label: opt.label })),
      'division': (DIVISION_OPTIONS as any[]).map(opt => ({ value: opt.value, label: opt.label })),
      'preferredLanguage': (PREFERRED_LANGUAGE_OPTIONS as any[]).map(opt => ({ value: opt, label: opt }))
    };
    
    return mapping[fieldName] || [];
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
      // Map to correct field names used by new-request component
      firstName: this.extractedData.firstName,
      firstNameAR: this.extractedData.firstNameAR,
      tax: this.extractedData.tax,
      CustomerType: this.extractedData.CustomerType,
      CompanyOwnerFullName: this.extractedData.ownerName, // Different field name!
      buildingNumber: this.extractedData.buildingNumber,
      street: this.extractedData.street,
      country: this.extractedData.country,
      city: this.extractedData.city,
      SalesOrgOption: this.extractedData.salesOrganization, // Different field name!
      DistributionChannelOption: this.extractedData.distributionChannel, // Different field name!
      DivisionOption: this.extractedData.division, // Different field name!
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
    return new Error('فشل استخراج البيانات من المستند / Failed to extract data');
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


