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
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from './notification.service';

export interface ExtractedData {
  // Company Information
  firstName: string;
  firstNameAR: string;
  tax: string;
  CustomerType: string;
  ownerName: string;
  
  // Address
  buildingNumber: string;
  street: string;
  country: string;
  city: string;
  
  // Sales
  salesOrganization: string;
  distributionChannel: string;
  division: string;
  
  // Related Data
  contacts: Array<{
    name: string;
    nameAr?: string;
    jobTitle: string;
    email: string;
    mobile: string;
    landline?: string;
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

  constructor(private http: HttpClient, private smartMatcher: SmartDropdownMatcherService, private notificationService: NotificationService, private translate: TranslateService) {
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

  private documentMetadata: Array<{ country: string; type: string; description: string }> | null = null;

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
      let finalExtractedData = extractedData;
      try {
        const matchResult = await this.smartMatcher.matchExtractedToSystemValues(extractedData);
        if (matchResult?.matchedValues) {
          console.log('🎯 [Service] Smart matched values:', matchResult.matchedValues);
          finalExtractedData = { ...extractedData, ...matchResult.matchedValues };
          // Optionally: store reasoning/confidence if needed later
        }
      } catch (e) {
        console.warn('⚠️ [Service] Smart matching failed, proceeding with raw values.', e);
      }

      // Auto-detect metadata when not provided
      if (!documentsMetadata || documentsMetadata.length === 0) {
        const autoMeta = this.smartDetectDocumentMetadata(files, extractedData as any);
        this.documentMetadata = autoMeta;
        // If country detected and not set, map key to label value
        if (autoMeta[0]?.country && !extractedData.country) {
          const countryMap: { [key: string]: string } = {
            'egypt': 'Egypt',
            'saudiArabia': 'Saudi Arabia',
            'uae': 'United Arab Emirates',
            'yemen': 'Yemen'
          };
          (extractedData as any).country = countryMap[autoMeta[0].country] || 'Egypt';
        }
      } else {
        // Normalize provided metadata to expected structure and store
        this.documentMetadata = (documentsMetadata || []).map(m => ({
          country: (m.country as any) || 'egypt',
          type: m.type,
          description: m.description
        }));
      }

      // Merge with existing data
      this.extractedData = { ...this.extractedData, ...finalExtractedData };

      // Translate if needed
      await this.handleArabicTranslation();

      // ✅ FIX: Don't cleanup memory here - documents still needed for submission
      // Memory will be cleaned up after successful submission in submitCustomerRequest()

      return this.extractedData;
    } catch (error: any) {
      console.error('Error processing documents:', error);
      throw this.handleDocumentError(error);
    }
  }

  getDocumentMetadata(): Array<{ country: string; type: string; description: string }> | null {
    return this.documentMetadata;
  }

  private smartDetectDocumentMetadata(
    files: File[],
    extractedData?: any
  ): Array<{ country: string; type: string; description: string }> {
    return files.map((file) => {
      const filename = file.name.toLowerCase();
      let type = 'generalDocument'; // default translation key
      let country = 'egypt'; // default translation key

      if (extractedData) {
        const dataStr = JSON.stringify(extractedData).toLowerCase();
        const arabicDataStr = JSON.stringify(extractedData);

        // Commercial Registration
        if (
          dataStr.includes('commercial registration') ||
          dataStr.includes('commercial register') ||
          arabicDataStr.includes('سجل تجاري') ||
          arabicDataStr.includes('السجل التجاري') ||
          arabicDataStr.includes('وزارة التجارة') ||
          dataStr.includes('ministry of commerce') ||
          arabicDataStr.includes('غرفة التجارة') ||
          dataStr.includes('chamber of commerce') ||
          (extractedData.registrationNumber && String(extractedData.registrationNumber).length > 10)
        ) {
          type = 'commercialRegistration';
        }
        // Tax Card
        else if (
          dataStr.includes('tax card') ||
          dataStr.includes('tax registration') ||
          arabicDataStr.includes('البطاقة الضريبية') ||
          arabicDataStr.includes('بطاقة ضريبية') ||
          arabicDataStr.includes('مصلحة الضرائب') ||
          arabicDataStr.includes('مأمورية الضرائب') ||
          dataStr.includes('tax authority') ||
          dataStr.includes('tax office') ||
          dataStr.includes('tin') ||
          (extractedData.tax && String(extractedData.tax).match(/^\d{9}$/))
        ) {
          type = 'taxCard';
        }
        // VAT Certificate
        else if (
          dataStr.includes('vat certificate') ||
          dataStr.includes('value added tax') ||
          arabicDataStr.includes('شهادة ضريبة القيمة المضافة') ||
          arabicDataStr.includes('ضريبة القيمة المضافة') ||
          arabicDataStr.includes('ضريبة مضافة') ||
          dataStr.includes('vat number') ||
          dataStr.includes('vat registration') ||
          (extractedData.vatNumber && extractedData.vatNumber.length > 0)
        ) {
          type = 'vatCertificate';
        }
        // Business License
        else if (
          dataStr.includes('business license') ||
          dataStr.includes('trade license') ||
          arabicDataStr.includes('رخصة تجارية') ||
          arabicDataStr.includes('رخصة مزاولة') ||
          arabicDataStr.includes('ترخيص') ||
          dataStr.includes('license number') ||
          (extractedData.commercialLicense && extractedData.commercialLicense.length > 0)
        ) {
          type = 'businessLicense';
        }
        // Tax Certificate
        else if (
          dataStr.includes('tax certificate') ||
          arabicDataStr.includes('شهادة ضريبية') ||
          arabicDataStr.includes('إفادة ضريبية')
        ) {
          type = 'taxCertificate';
        }
        // Contract
        else if (
          dataStr.includes('contract') ||
          dataStr.includes('agreement') ||
          arabicDataStr.includes('عقد') ||
          arabicDataStr.includes('اتفاقية')
        ) {
          type = 'contract';
        }
        // Articles of Association
        else if (
          dataStr.includes('articles of association') ||
          arabicDataStr.includes('عقد التأسيس') ||
          arabicDataStr.includes('النظام الأساسي')
        ) {
          type = 'articlesOfAssociation';
        }
        // ID Document
        else if (
          dataStr.includes('identity') ||
          dataStr.includes('identification') ||
          arabicDataStr.includes('هوية') ||
          arabicDataStr.includes('بطاقة شخصية')
        ) {
          type = 'idDocument';
        }
        // Filename fallback
        else {
          if (filename.includes('commercial') || filename.includes('تجاري') || filename.includes('سجل')) {
            type = 'commercialRegistration';
          } else if (filename.includes('tax') || filename.includes('ضريب') || filename.includes('بطاقة')) {
            type = 'taxCard';
          } else if (filename.includes('vat') || filename.includes('قيمة')) {
            type = 'vatCertificate';
          } else if (filename.includes('license') || filename.includes('رخصة')) {
            type = 'businessLicense';
          }
        }

        // Country detection
        if (extractedData.country) {
          const countryLower = String(extractedData.country).toLowerCase();
          if (countryLower.includes('saudi')) country = 'saudiArabia';
          else if (countryLower.includes('emirates') || countryLower.includes('uae')) country = 'uae';
          else if (countryLower.includes('yemen')) country = 'yemen';
          else if (countryLower.includes('egypt')) country = 'egypt';
        } else {
          if (
            dataStr.includes('saudi') ||
            arabicDataStr.includes('السعودية') ||
            dataStr.includes('ksa') ||
            dataStr.includes('riyadh') ||
            arabicDataStr.includes('الرياض')
          ) {
            country = 'saudiArabia';
          } else if (
            dataStr.includes('emirates') ||
            arabicDataStr.includes('الإمارات') ||
            dataStr.includes('uae') ||
            dataStr.includes('dubai') ||
            arabicDataStr.includes('دبي')
          ) {
            country = 'uae';
          } else if (
            dataStr.includes('yemen') ||
            arabicDataStr.includes('اليمن') ||
            dataStr.includes('sana') ||
            arabicDataStr.includes('صنعاء')
          ) {
            country = 'yemen';
          } else if (
            dataStr.includes('egypt') ||
            arabicDataStr.includes('مصر') ||
            dataStr.includes('cairo') ||
            arabicDataStr.includes('القاهرة')
          ) {
            country = 'egypt';
          }

          if (extractedData.tax) {
            const taxStr = String(extractedData.tax);
            if (taxStr.match(/^\d{9}$/)) country = 'egypt';
            else if (taxStr.startsWith('3')) country = 'saudiArabia';
          }
        }
      } else {
        // No OCR data: filename-based fallback
        if (filename.includes('commercial') || filename.includes('تجاري') || filename.includes('سجل')) {
          type = 'commercialRegistration';
        } else if (filename.includes('tax') || filename.includes('ضريب') || filename.includes('بطاقة')) {
          type = 'taxCard';
        } else if (filename.includes('vat') || filename.includes('قيمة')) {
          type = 'vatCertificate';
        } else if (filename.includes('license') || filename.includes('رخصة')) {
          type = 'businessLicense';
        }
      }

      console.log(`🔍 Smart Detection for ${file.name}:`);
      console.log(`   📄 Type: ${type} (will be translated)`);
      console.log(`   🌍 Country: ${country} (will be translated)`);

      return {
        country,
        type,
        description: 'Auto-detected'
      };
    });
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
    // ⚠️ NOTE: This method is no longer called during document processing
    // Memory cleanup now happens in submitCustomerRequest() after successful submission
    // Keeping this method for potential future use or manual cleanup
    base64Files.forEach(file => {
      file.content = '';
    });
  }

  private async extractDataFromDocuments(documents: Array<{content: string, name: string, type: string, size: number}>): Promise<Partial<ExtractedData>> {
    const maxRetries = 3;
    const allAttempts: Array<{ data: any; score: number; attempt: number }> = [];
    let lastError: any = null;
    let networkIssueEncountered = false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let requestBody: any = null;
      try {
        console.log(`🧪 [Service] Starting document extraction (attempt ${attempt}/${maxRetries})...`);

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
                
                Attempt ${attempt}/${maxRetries} - Focus on extracting ALL possible fields.
                
                CRITICAL EXTRACTION RULES:
                1. SCAN EVERY PIXEL - examine headers, footers, margins, stamps, logos, watermarks
                2. **COMPANY NAME IS THE MOST IMPORTANT FIELD** - Look for:
                   - Company/Establishment name in document header
                   - Name field in registration documents (اسم المنشأة، اسم الشركة)
                   - Name in logos or stamps
                   - Any prominent business name anywhere in the document
                3. For Arabic text, provide both Arabic (in firstNameAR) and English versions (in firstName)
                4. Find ALL numbers - tax IDs, VAT numbers, registration numbers, license numbers
                5. **CITY/LOCATION** - Look for city name near address, registration location, or branch
                6. Extract complete addresses including building numbers, streets, districts, cities
                7. Find owner/CEO/manager names in signatures or official sections
                8. Extract ALL dates in any format
                9. Double-check for fields you might have missed in previous attempts
                
                Return ONLY valid JSON with these fields (leave empty string "" if not found):
                {
                  "firstName": "",
                  "firstNameAR": "",
                  "tax": "",
                  "CustomerType": "",
                  "ownerName": "",
                  "buildingNumber": "",
                  "street": "",
                  "country": "",
                  "city": "",
                  "registrationNumber": "",
                  "commercialLicense": "",
                  "vatNumber": "",
                  "establishmentDate": "",
                  "legalForm": "",
                  "capital": "",
                  "website": "",
                  "poBox": "",
                  "fax": "",
                  "branch": ""
                }`
              },
              ...documents.map(doc => ({
                type: 'image_url' as const,
                image_url: { url: `data:${doc.type};base64,${doc.content}` }
              }))
            ]
          }
        ];

        requestBody = {
          model: environment.openaiModel || 'gpt-4o',
          messages,
          max_tokens: 4000,
          temperature: attempt === 1 ? 0.1 : (attempt === 2 ? 0.3 : 0.5),
          seed: attempt * 1000
        };

        const response = await firstValueFrom(
          this.http.post<any>('https://api.openai.com/v1/chat/completions', requestBody, {
            headers: {
              'Authorization': `Bearer ${environment.openaiApiKey}`,
              'Content-Type': 'application/json'
            }
          })
        );

        if (!response.choices || response.choices.length === 0) {
          throw new Error('No response from OpenAI');
        }

        const content = response.choices[0].message.content;
        const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const extractedData = JSON.parse(cleanedContent);

        const score = this.calculateDataCompleteness(extractedData);
        console.log(`🧪 [Service] Attempt ${attempt} extracted ${score} fields`);
        allAttempts.push({ data: extractedData, score, attempt });

        if (score >= 12) {
          console.log(`✅ [Service] Attempt ${attempt} got all required fields! Stopping.`);
          break;
        }

        if (attempt < maxRetries) {
          const waitTime = attempt * 500;
          console.log(`⏳ [Service] Waiting ${waitTime}ms before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      } catch (error: any) {
        console.error(`❌ [Service] Extraction error (attempt ${attempt}/${maxRetries}):`, error);
        lastError = error;
        // Detect likely internet/network issues from browser/network context
        const offline = typeof navigator !== 'undefined' && navigator && (navigator as any).onLine === false;
        const statusZero = error?.status === 0;
        const messageLooksNetwork = typeof error?.message === 'string' && /(ECONN|ENOTFOUND|ETIMEDOUT|ECONNRESET|EAI_AGAIN|network|offline|Failed to fetch)/i.test(error.message);
        if (offline || statusZero || messageLooksNetwork) {
          networkIssueEncountered = true;
        }

        if (attempt < maxRetries) {
          const waitTime = attempt * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    if (allAttempts.length === 0) {
      // Gate internet error message: only show if extracted fields < 2
      // Since no attempts succeeded, extracted fields count is 0
      if (networkIssueEncountered) {
        throw new Error('⚠️ تعذر الاتصال بخدمة الذكاء الاصطناعي. تحقق من اتصال الإنترنت ثم حاول مرة أخرى.\nAI service unreachable. Please check your internet connection and try again.');
      }
      throw new Error('فشلت جميع المحاولات / All extraction attempts failed');
    }

    allAttempts.sort((a, b) => b.score - a.score);
    const bestAttempt = allAttempts[0];
    console.log(`🏆 [Service] Best result from attempt ${bestAttempt.attempt} with score ${bestAttempt.score}`);
    console.log('📊 [Service] All attempts scores:', allAttempts.map(a => `Attempt ${a.attempt}: ${a.score} fields`));

    const mergedData = this.mergeExtractedData(allAttempts);
    // If a network issue happened during attempts, only surface an internet message
    // when the number of non-empty extracted fields is less than 2
    if (networkIssueEncountered) {
      const fieldsForCount = [
        'firstName', 'firstNameAR', 'tax', 'CustomerType', 'ownerName',
        'buildingNumber', 'street', 'country', 'city',
        'salesOrganization', 'distributionChannel', 'division'
      ];
      const extractedCount = fieldsForCount.reduce((count, key) => {
        const value = (mergedData as any)[key];
        return value && value.toString().trim() !== '' ? count + 1 : count;
      }, 0);
      if (extractedCount < 2) {
        throw new Error('⚠️ تعذر الاتصال بخدمة الذكاء الاصطناعي. تحقق من اتصال الإنترنت ثم حاول مرة أخرى.\nAI service unreachable. Please check your internet connection and try again.');
      }
    }

    if (!mergedData.country) {
      mergedData.country = this.detectCountryFromData(mergedData);
    }
    return mergedData;
  }

  private calculateDataCompleteness(data: any): number {
    let score = 0;
    const requiredFields = [
      'firstName', 'firstNameAR', 'tax', 'CustomerType', 
      'ownerName', 'buildingNumber', 'street', 'country', 
      'city', 'salesOrganization', 'distributionChannel', 'division'
    ];
    const optionalFields = [
      'registrationNumber', 'commercialLicense', 'vatNumber', 
      'establishmentDate', 'legalForm', 'capital', 'website', 
      'poBox', 'fax', 'branch'
    ];
    requiredFields.forEach(field => {
      if (data[field] && data[field].toString().trim() !== '') score++;
    });
    optionalFields.forEach(field => {
      if (data[field] && data[field].toString().trim() !== '') score += 0.5;
    });
    return score;
  }

  private mergeExtractedData(attempts: Array<{ data: any; score: number; attempt: number }>): any {
    const merged: any = {};
    const allFields = [
      'firstName', 'firstNameAR', 'tax', 'CustomerType', 
      'ownerName', 'buildingNumber', 'street', 'country', 
      'city', 'salesOrganization', 'distributionChannel', 'division',
      'registrationNumber', 'commercialLicense', 'vatNumber', 
      'establishmentDate', 'legalForm', 'capital', 'website', 
      'poBox', 'fax', 'branch'
    ];
    allFields.forEach(field => {
      for (const attempt of attempts) {
        if (attempt.data[field] && attempt.data[field].toString().trim() !== '') {
          merged[field] = attempt.data[field];
          console.log(`📝 [Service] Field '${field}' taken from attempt ${attempt.attempt}`);
          break;
        }
      }
      if (!merged[field]) merged[field] = '';
    });
    console.log(`✨ [Service] Merged data from ${attempts.length} attempts`);
    return merged;
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

  getDropdownOptions(fieldName: string): Array<{ label: string; value: string }> {
    switch (fieldName) {
      case 'CustomerType':
        return (CUSTOMER_TYPE_OPTIONS as any[]).map((opt: any) => ({ label: opt, value: opt }));
      case 'country':
        return Object.keys(CITY_OPTIONS).map(c => ({ label: c, value: c }));
      case 'city': {
        const country = this.extractedData.country;
        const cities = country ? getCitiesByCountry(country) : [];
        return cities.map((c: any) => ({ label: c.label || c, value: c.value || c }));
      }
      case 'salesOrganization':
        return this.getSalesOrgOptionsByCountry(this.extractedData.country);
      case 'distributionChannel':
        return (DISTRIBUTION_CHANNEL_OPTIONS as any[]).map(opt => ({ label: opt.label, value: opt.value }));
      case 'division':
        return (DIVISION_OPTIONS as any[]).map(opt => ({ label: opt.label, value: opt.value }));
      case 'preferredLanguage':
        return (PREFERRED_LANGUAGE_OPTIONS as any[]).map(opt => ({ label: opt, value: opt }));
      default:
        console.warn('Unknown dropdown field:', fieldName);
        return [];
    }
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
        console.log('⚠️ [DUPLICATE] Missing required fields for duplicate check');
        return { isDuplicate: false, message: 'Missing required fields' };
      }

      const response = await firstValueFrom(
        this.http.post<any>(`${this.apiBase}/requests/check-duplicate`, {
          tax: this.extractedData.tax,
          CustomerType: this.extractedData.CustomerType
        })
      );

      if (response.isDuplicate && response.existingCustomers?.length > 0) {
        return {
          isDuplicate: true,
          existingRecord: response.existingCustomers[0],
          message: response.message || 'Duplicate record found'
        };
      }
      return { isDuplicate: response.isDuplicate || false, message: response.message || 'No duplicates found' };
    } catch (error) {
      console.error('❌ [DUPLICATE] Error checking for duplicates:', error);
      return { isDuplicate: false, message: 'Duplicate check failed' };
    }
  }

  async submitCustomerRequest(): Promise<any> {
    try {
      const payload = this.buildRequestPayload();

      console.log('📤 [SUBMIT] Submitting request with payload:', payload);
      console.log('📤 [SUBMIT] Contacts count:', payload.contacts?.length || 0);
      console.log('📤 [SUBMIT] Documents count:', payload.documents?.length || 0);

      const response = await firstValueFrom(
        this.http.post<any>(`${this.apiBase}/requests`, payload)
      );

      console.log('✅ [SUBMIT] Request created:', response);
      console.log('✅ [SUBMIT] Documents included:', payload.documents?.length || 0);
      this.requestId = response.id;

      // Notify reviewer on new request
      if (response?.id) {
        this.notifyReviewerOnCreation(response.id);
      }

      // ✅ FIX: Clear document content from memory AFTER successful submission
      if (this.uploadedDocuments && this.uploadedDocuments.length > 0) {
        this.uploadedDocuments.forEach(doc => {
          doc.content = '';  // Clear base64 content to free memory
        });
        console.log('🧹 [SUBMIT] Cleared document content from memory after successful submission');
      }

      return response;
    } catch (error: any) {
      console.error('❌ [SUBMIT] Error submitting request:', error);
      throw new Error(error?.error?.message || 'Failed to submit customer request');
    }
  }

  private buildRequestPayload(): any {
    const payload: any = {
      firstName: this.extractedData.firstName,
      firstNameAr: this.extractedData.firstNameAR,
      tax: this.extractedData.tax,
      CustomerType: this.extractedData.CustomerType,
      CompanyOwner: this.extractedData.ownerName,
      buildingNumber: this.extractedData.buildingNumber || '',
      street: this.extractedData.street || '',
      country: this.extractedData.country,
      city: this.extractedData.city,
      SalesOrgOption: this.extractedData.salesOrganization || '',
      DistributionChannelOption: this.extractedData.distributionChannel || '',
      DivisionOption: this.extractedData.division || '',
      status: 'Pending',  // ✅ FIX: Capital P for Pending
      assignedTo: 'reviewer',  // ✅ FIX: Assign to reviewer automatically
      created_at: new Date().toISOString(),
      created_by: this.currentUser?.username || 'data_entry',
      requestType: 'New',
      ComplianceStatus: 'Pending Review',
      contacts: this.extractedData.contacts || [],
      documents: []
    };

    if (this.extractedData.contacts && this.extractedData.contacts.length > 0) {
      payload.contacts = this.extractedData.contacts.map(c => ({
        name: c.name,
        nameAr: c.nameAr || '',
        jobTitle: c.jobTitle,
        email: c.email,
        mobile: c.mobile,
        landline: c.landline || '',
        preferredLanguage: c.preferredLanguage || 'Arabic'
      }));
    }

    // Include documents in initial payload so backend saves them
    if (this.uploadedDocuments && this.uploadedDocuments.length > 0) {
      payload.documents = this.uploadedDocuments.map(doc => ({
        documentId: doc.id,
        name: doc.name,
        type: doc.type || 'other',
        description: `Document uploaded via AI Agent: ${doc.name}`,
        size: doc.size,
        mime: doc.type,
        contentBase64: doc.content,
        source: 'Data Steward',
        uploadedBy: this.currentUser?.username || 'data_entry'
      }));
      console.log('📎 [PAYLOAD] Including documents in payload:', payload.documents.length);
    }

    return payload;
  }

  // Helper: notify reviewer on new request creation
  private notifyReviewerOnCreation(requestId: string): void {
    try {
      const companyName = this.extractedData?.firstName || 'Request';
      const message = `New request for ${companyName} awaits your review`;
      this.notificationService.sendTaskNotification({
        userId: '2',
        companyName,
        type: 'request_created',
        link: `/dashboard/new-request/${requestId}`,
        message
      });
    } catch (_) {}
  }


  // Debug helper to log current state
  debugCurrentState(): void {
    console.log('🔍 [DEBUG] Current Extracted Data:', this.extractedData);
    console.log('🔍 [DEBUG] Contacts:', this.extractedData.contacts);
    console.log('🔍 [DEBUG] Documents:', this.uploadedDocuments.length);
    console.log('🔍 [DEBUG] Current User:', this.currentUser);
    console.log('🔍 [DEBUG] Session ID:', this.sessionId);
    console.log('🔍 [DEBUG] Request ID:', this.requestId);
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
    } else if (error.status === 0 || (typeof navigator !== 'undefined' && (navigator as any).onLine === false)) {
      // Use clearer wording, actual surfacing is gated where we have field counts
      return new Error('⚠️ تعذر الاتصال بالإنترنت / Internet connectivity issue');
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



