import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

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
  private extractedData: ExtractedData = {
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

  private uploadedDocuments: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    content: string;
  }> = [];

  private currentUser: any = null;
  private conversationHistory: Array<{role: string, content: string}> = [];

  constructor(private http: HttpClient) {
    this.loadCurrentUser();
  }

  private async loadCurrentUser(): Promise<void> {
    try {
      const username = sessionStorage.getItem('username') || localStorage.getItem('username');
      if (username) {
        const response = await this.http.get(`${environment.apiBaseUrl}/users/${username}`).toPromise();
        this.currentUser = response;
        this.initializeSystemPrompt();
      }
    } catch (error) {
      console.warn('Could not load current user:', error);
      this.currentUser = { fullName: 'Data Entry User', role: 'Data Entry' };
      this.initializeSystemPrompt();
    }
  }

  getCurrentUser(): any {
    return this.currentUser;
  }

  private initializeSystemPrompt(): void {
    const userName = this.currentUser?.fullName || 'Data Entry User';
    const userRole = this.currentUser?.role || 'Data Entry';
    
    this.conversationHistory = [
      {
        role: 'system',
        content: `You are an intelligent Data Entry Assistant for an MDM (Master Data Management) system. Your role is to help Data Entry users efficiently create new customer requests by extracting data from documents and guiding them through the process.

**Your Primary Role:**
- Extract customer data from uploaded documents using AI vision capabilities
- Identify missing required fields and ask users for them intelligently
- Guide users through dropdown selections and form completions
- Check for duplicates using the system's rules
- Provide a smooth, efficient user experience

**User Context:**
- Current User: ${userName}
- User Role: ${userRole}
- System: MDM Customer Creation

**Key Capabilities:**
1. **Document Processing**: Extract data from commercial registrations, tax cards, and other business documents
2. **Smart Field Detection**: Know which fields are dropdowns vs free text
3. **Missing Data Handling**: Ask for missing information one field at a time
4. **Duplicate Detection**: Use tax number and customer type to check for duplicates
5. **Arabic Translation**: Translate English company names to Arabic when needed

**Important Rules:**
- Always respond in Arabic and English
- Be concise and professional
- Ask for missing information one field at a time
- Use the exact dropdown values from the system
- Provide clear, actionable guidance
- Never show JSON or technical details to users

**Current Extracted Data:**
${JSON.stringify(this.extractedData, null, 2)}

Respond briefly and professionally. Focus on helping the user complete their data entry task efficiently.`
      }
    ];
  }

  async uploadAndProcessDocuments(files: File[], documentsMetadata?: Array<{ country?: string; type: string; description: string }>): Promise<ExtractedData> {
    try {
      // Check if OpenAI API key is configured
      if (!environment.openaiApiKey || environment.openaiApiKey === 'YOUR_OPENAI_API_KEY_HERE') {
        throw new Error('OpenAI API key is not configured. Please add your API key to environment.ts');
      }

      // Convert files to base64 and store
      const base64Files = await Promise.all(
        files.map(async (file) => {
          const base64 = await this.fileToBase64(file);
          return {
            id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            type: file.type,
            size: file.size,
            content: base64
          };
        })
      );

      // Store documents
      this.uploadedDocuments.push(...base64Files);

      // Check for PDFs and throw error if found
      const pdfFiles = files.filter(file => file.type === 'application/pdf');
      if (pdfFiles.length > 0) {
        throw new Error('PDF files are not supported. Please convert PDFs to images (JPG/PNG) and try again.');
      }

      // Extract data using OpenAI Vision
      const extractedData = await this.extractDataFromDocuments(base64Files);

      // Merge with existing data
      this.extractedData = { ...this.extractedData, ...extractedData };

      // Translate to Arabic if needed
      if (this.extractedData.firstName && !this.extractedData.firstNameAR) {
        this.extractedData.firstNameAR = await this.translateToArabic(this.extractedData.firstName);
      }

      return this.extractedData;
    } catch (error) {
      console.error('Error processing documents:', error);
      throw error;
    }
  }

  private async extractDataFromDocuments(documents: Array<{content: string, name: string, type: string, size: number}>): Promise<Partial<ExtractedData>> {
    try {
      // Validate document types
      const unsupportedTypes = documents.filter(doc => 
        !doc.type.startsWith('image/') && doc.type !== 'application/pdf'
      );
      
      if (unsupportedTypes.length > 0) {
        throw new Error(`Unsupported document types: ${unsupportedTypes.map(d => d.type).join(', ')}. Only images are supported.`);
      }

      // Log document details for debugging
      console.log('Processing documents:', documents.map(d => ({
        name: d.name,
        type: d.type,
        size: `${(d.size / 1024).toFixed(2)}KB`
      })));

      const messages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract customer data from these business documents. Return ONLY a JSON object with these exact fields:
{
  "firstName": "Company name in English",
  "firstNameAR": "Company name in Arabic", 
  "tax": "Tax number",
  "CustomerType": "Corporate or Individual",
  "ownerName": "Company owner name",
  "buildingNumber": "Building number",
  "street": "Street name",
  "country": "Country name",
  "city": "City name",
  "salesOrganization": "Sales organization code",
  "distributionChannel": "Distribution channel code", 
  "division": "Division code",
  "contacts": [{"name": "Contact name", "jobTitle": "Job title", "email": "Email", "mobile": "Mobile", "landline": "Landline", "preferredLanguage": "Language"}]
}

Extract data accurately from the documents. If any field is not found, leave it empty.`
            }
          ]
        }
      ];

      // Add image content
      documents.forEach(doc => {
        messages[0].content.push({
          type: 'image_url',
          image_url: {
            url: `data:${doc.type};base64,${doc.content}`,
            detail: 'auto'
          }
        });
      });

      const response = await this.http.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o',
        messages: messages,
        max_tokens: 4000,
        temperature: 0.1
      }, {
        headers: {
          'Authorization': `Bearer ${environment.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      }).toPromise() as any;

      const content = response.choices[0].message.content;
      
      // Clean and parse JSON
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/, '').replace(/```\n?$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?/, '').replace(/```\n?$/, '');
      }

      try {
        return JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Raw content:', content);
        throw new Error('Failed to parse extracted data. Please try again with clearer documents.');
      }

    } catch (error: any) {
      console.error('OpenAI API Error:', error);
      
      if (error.status === 400) {
        throw new Error('Invalid request to OpenAI. Please check document format and size (max 10MB per image).');
      } else if (error.status === 401) {
        throw new Error('OpenAI API key is invalid or expired. Please check your API key.');
      } else if (error.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again in a few minutes.');
      } else if (error.status === 500) {
        throw new Error('OpenAI server error. Please try again later.');
      } else if (error.status === 503) {
        throw new Error('OpenAI service temporarily unavailable. Please try again later.');
      } else {
        throw new Error(`OpenAI API error: ${error.message || 'Unknown error occurred'}`);
      }
    }
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  addDocument(document: {id: string, name: string, type: string, size: number, content: string}): void {
    this.uploadedDocuments.push(document);
  }

  removeDocument(id: string): void {
    this.uploadedDocuments = this.uploadedDocuments.filter(doc => doc.id !== id);
  }

  getDocuments(): Array<{id: string, name: string, type: string, size: number, content: string}> {
    return this.uploadedDocuments;
  }

  reset(): void {
    this.extractedData = {
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
    this.uploadedDocuments = [];
    this.conversationHistory = [];
    this.initializeSystemPrompt();
  }

  getWelcomeMessage(): string {
    const userName = this.currentUser?.fullName || 'Data Entry User';
    const greeting = this.getTimeBasedGreeting();
    
    return `${greeting} ${userName}! 👋

مرحباً بك في مساعد إدخال البيانات الذكي
Welcome to your intelligent Data Entry Assistant

كيف يمكنني مساعدتك اليوم؟ / How can I help you today?

1️⃣ ارفع مستندات العميل (السجل التجاري، البطاقة الضريبية، إلخ)
Upload customer documents (commercial registration, tax card, etc.)

2️⃣ سأقوم باستخراج البيانات تلقائياً من المستندات
I will automatically extract the data from documents

3️⃣ سأطلب منك أي معلومات ناقصة بطريقة ذكية
I'll intelligently ask for any missing information

4️⃣ سأتحقق من عدم وجود تكرار في النظام
I'll check for duplicates in the system

5️⃣ سأساعدك في إنشاء الطلب بسرعة وكفاءة
I'll help you create the request quickly and efficiently

📤 ابدأ برفع المستندات للبدء / Start by uploading documents to begin`;
  }

  private getTimeBasedGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  updateExtractedDataField(field: string, value: any): void {
    (this.extractedData as any)[field] = value;
  }

  getExtractedData(): ExtractedData {
    return this.extractedData;
  }

  private async translateToArabic(text: string): Promise<string> {
    try {
      const response = await this.http.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: `Translate this company name to Arabic: "${text}". Return only the Arabic translation.`
          }
        ],
        max_tokens: 100,
        temperature: 0.1
      }, {
        headers: {
          'Authorization': `Bearer ${environment.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      }).toPromise() as any;

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original if translation fails
    }
  }

  async sendMessage(userMessage: string, additionalContext?: any): Promise<string> {
    try {
      // Add user message to conversation history
      this.conversationHistory.push({ role: 'user', content: userMessage });

      // Limit conversation history to prevent token overflow
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      const contextPrompt = `Current extracted data: ${JSON.stringify(this.extractedData, null, 2)}

User message: ${userMessage}

Respond briefly and professionally in Arabic and English. Help the user with their data entry task.`;

      const requestBody = {
        model: 'gpt-4o',
        messages: [
          ...this.conversationHistory,
          {
            role: 'system',
            content: contextPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      };

      const response = await this.http.post('https://api.openai.com/v1/chat/completions', requestBody, {
        headers: {
          'Authorization': `Bearer ${environment.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      }).toPromise() as any;

      const aiResponse = response.choices[0].message.content;
      
      // Add AI response to conversation history
      this.conversationHistory.push({ role: 'assistant', content: aiResponse });

      return aiResponse;
    } catch (error: any) {
      console.error('Error in sendMessage:', error);
      throw new Error('Failed to process message. Please try again.');
    }
  }
}
