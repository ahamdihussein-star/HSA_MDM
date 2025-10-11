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
  
  // Document Content for parsing
  documentContent?: string;
  
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
  private apiBase = environment.apiBaseUrl || 'http://localhost:3000/api';
  private openaiApiUrl = environment.openaiApiUrl || 'https://api.openai.com/v1/chat/completions';
  private openaiApiKey = environment.openaiApiKey || '';
  private openaiModel = environment.openaiModel || 'gpt-4o';
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

  constructor(private http: HttpClient, private notificationService: NotificationService, private translate: TranslateService) {
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

  async uploadAndProcessDocuments(
    files: File[], 
    documentsMetadata?: Array<{ country?: string; type: string; description: string }>,
    lightweightMode: boolean = false  // ✅ NEW: Lightweight mode for additional documents
  ): Promise<ExtractedData> {
    try {
      console.log(`🚀 [SERVICE] uploadAndProcessDocuments called with ${files.length} files`);
      console.log(`🚀 [SERVICE] Lightweight mode: ${lightweightMode}`);
      
      // Validate files
      this.validateFiles(files);

      // Convert to base64 with optimization
      console.log('🔄 [SERVICE] Converting files to base64...');
      const base64Files = await this.convertFilesToBase64(files);
      
      // ✅ FIX 2: Validate Base64 content before processing
      base64Files.forEach((doc, index) => {
        console.log(`📄 [VALIDATION] Document ${index + 1}:`, {
          name: doc.name,
          type: doc.type,
          size: doc.size,
          contentLength: doc.content?.length || 0,
          contentPreview: doc.content?.substring(0, 50) + '...'
        });
        
        if (!doc.content || doc.content.length < 100) {
          throw new Error(`Document ${index + 1} (${doc.name}) has invalid Base64 content!`);
        }
        console.log(`✅ [VALIDATION] Document ${index + 1} has valid Base64`);
      });

      // Store documents with cleanup
      console.log('💾 [SERVICE] Storing documents...');
      this.storeDocuments(base64Files);

      // ✅ Extract data using AI with intelligent form filling
      console.log('🤖 [SERVICE] Starting AI extraction with multiple attempts...');
      const extractedData = await this.extractDataFromDocuments(base64Files, this.extractedData, lightweightMode);

      // Smart match dropdowns to exact system values
      let finalExtractedData = extractedData;

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

      // Merge with existing data and store document content
      this.extractedData = { ...this.extractedData, ...finalExtractedData };

      // Note: firstNameAR will be filled manually by user

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
    console.log('💾 [SERVICE] Storing documents - current count:', this.uploadedDocuments.length);
    console.log('💾 [SERVICE] New documents to store:', base64Files.length);
    console.log('💾 [SERVICE] New document names:', base64Files.map(f => f.name));
    
    // ✅ Prevent duplicates: filter by name AND content hash
    const existingNames = this.uploadedDocuments.map(d => d.name);
    const uniqueNewFiles = base64Files.filter(newFile => {
      const isDuplicate = this.uploadedDocuments.some(existing => 
        existing.name === newFile.name && existing.content === newFile.content
      );
      
      if (isDuplicate) {
        console.log('⏭️ [SERVICE] Skipping duplicate document:', newFile.name);
      }
      
      return !isDuplicate;
    });
    
    console.log('💾 [SERVICE] Unique new documents:', uniqueNewFiles.length);
    console.log('💾 [SERVICE] Unique document names:', uniqueNewFiles.map(f => f.name));
    
    // Limit stored documents to prevent memory issues
    if (this.uploadedDocuments.length > this.MAX_DOCUMENTS) {
      console.log('⚠️ [SERVICE] Trimming documents - exceeds MAX_DOCUMENTS:', this.MAX_DOCUMENTS);
      this.uploadedDocuments = this.uploadedDocuments.slice(-3);
    }
    
    // ✅ Add only unique documents
    this.uploadedDocuments.push(...uniqueNewFiles);
    
    console.log('✅ [SERVICE] Total documents after storage:', this.uploadedDocuments.length);
    console.log('✅ [SERVICE] All document names:', this.uploadedDocuments.map(d => d.name));
  }

  private cleanupMemory(base64Files: any[]): void {
    // ⚠️ NOTE: This method is no longer called during document processing
    // Memory cleanup now happens in submitCustomerRequest() after successful submission
    // Keeping this method for potential future use or manual cleanup
    base64Files.forEach(file => {
      file.content = '';
    });
  }

  private async extractDataFromDocuments(
    documents: Array<{content: string, name: string, type: string, size: number}>, 
    existingFormData?: Partial<ExtractedData>,
    lightweightMode: boolean = false
  ): Promise<Partial<ExtractedData>> {
    
    const maxRetries = lightweightMode ? 1 : 3;
    
    console.log(`🔍 [EXTRACTION] Starting extraction`);
    console.log(`📄 [EXTRACTION] Documents: ${documents.length}`);
    console.log(`🎯 [EXTRACTION] Mode: ${lightweightMode ? 'LIGHTWEIGHT' : 'FULL'}`);
    
    // ✅ FIX 3: Validate documents before processing
    const validDocuments = documents.filter((doc, index) => {
      const isValid = doc.content && doc.content.length > 100;
      if (!isValid) {
        console.error(`❌ [EXTRACTION] Invalid document ${index + 1}: ${doc.name}`);
      } else {
        console.log(`✅ [EXTRACTION] Valid document ${index + 1}: ${doc.name} (${doc.content.length} chars)`);
      }
      return isValid;
    });
    
    if (validDocuments.length === 0) {
      throw new Error('No valid documents to process!');
    }
    
    console.log(`✅ [EXTRACTION] Valid documents: ${validDocuments.length}/${documents.length}`);
    
    // SHA-256 deduplication
    const documentsWithHashes = await Promise.all(
      validDocuments.map(async (doc) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(doc.content);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return { ...doc, contentHash: hashHex };
      })
    );
    
    const uniqueDocuments = documentsWithHashes.filter((doc, index, self) => {
      const firstIndex = self.findIndex(d => d.contentHash === doc.contentHash);
      const isDuplicate = firstIndex !== index;
      if (isDuplicate) {
        console.log(`⏭️ [DEDUP] Skipping duplicate: "${doc.name}"`);
      }
      return !isDuplicate;
    });
    
    console.log(`✅ [DEDUP] Unique documents: ${uniqueDocuments.length}/${validDocuments.length}`);
    
    // Build context for lightweight mode
    let extractionContext = '';
    if (lightweightMode && existingFormData) {
      const missing = this.getMissingFields(existingFormData);
      extractionContext = `
**CONTEXT:** Additional document for existing company.
**Current company name:** "${existingFormData.firstName || 'Unknown'}"
**Missing fields (${missing.length}):** ${missing.join(', ') || 'None'}

**YOUR TASK:**
1. Extract company name to VERIFY this is the same company
2. Focus on filling the ${missing.length} missing fields
3. If all fields are filled, just extract company name for verification
`;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🤖 [OPENAI] Attempt ${attempt}/${maxRetries}`);
        
        // ✅ FIX 4: Log documents being sent to OpenAI
        console.log(`📤 [OPENAI] Sending ${uniqueDocuments.length} documents to OpenAI:`);
        uniqueDocuments.forEach((doc, index) => {
          console.log(`📄 [OPENAI] Document ${index + 1}:`, {
            name: doc.name,
            type: doc.type,
            contentLength: doc.content.length,
            contentHash: doc.contentHash?.substring(0, 16),
            contentPreview: doc.content.substring(0, 100) + '...'
          });
        });
        
        const requestBody = {
          model: environment.openaiModel || 'gpt-4o',
          messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                  text: `You are a business document data extractor. Extract EXACTLY these 8 fields from the document image.

${extractionContext}

**EXTRACTION RULES:**
1. Look for field labels in the document (e.g., "Company Name:", "Tax Number:")
2. Extract ONLY what you SEE - don't guess or infer
3. If a field is not visible, return empty string ""
4. Return clean values without labels or formatting

**FIELD MAPPING (Document → Output) - EXTRACT EXACTLY WHAT YOU SEE:**

Document says "Company Name:" → Extract to: "companyName" (exact text after colon)
Document says "Company Type:" → Extract to: "companyType" (exact text after colon)
Document says "Legal Status:" → Extract to: "companyType" (if Company Type not found)
Document says "Tax Number:" or "Registration No:" → Extract to: "taxNumber" (exact text after colon)
Document says "Company Owner:" or "Owner:" → Extract to: "ownerName" (exact text after colon)
Document says "Address:" → Parse and extract:
  - Building/house number → "buildingNumber"
  - Street name → "street"
  - City name → "city"
Document says "Country:" → Extract to: "country" (exact text after colon)

**CRITICAL: Read each field carefully and extract ONLY the exact text that appears after the colon (:). Do not guess or infer any values.**

**IMPORTANT ADDRESS PARSING:**
If you see "Address: 1075 Al-Qasr Street, Luxor, Egypt"
- buildingNumber: "1075"
- street: "Al-Qasr Street"
- city: "Luxor"
- country: "Egypt"

**OUTPUT FORMAT - JSON ONLY (no markdown, no comments):**
{
  "companyName": "exact company name from document",
  "companyType": "company type (Joint Stock, LLC, etc.)",
  "taxNumber": "tax or registration number",
  "ownerName": "owner/CEO name",
  "buildingNumber": "building number only",
  "street": "street name only",
  "city": "city name",
  "country": "country name"
}

**ANTI-HALLUCINATION RULES:**
❌ Don't guess city from country
❌ Don't infer type from company name
❌ Don't make up missing data
✅ Only extract visible text
✅ Return "" for missing fields

Extract now:`
              },
              ...uniqueDocuments.map(doc => ({
                type: 'image_url' as const,
                image_url: { url: `data:${doc.type};base64,${doc.content}` }
              }))
            ]
          }
          ],
          max_tokens: 1000,
          temperature: 0.1,
          seed: attempt * 1000
        };
        
        const requestSize = JSON.stringify(requestBody).length;
        console.log(`📊 [OPENAI] Request size: ${(requestSize / 1024).toFixed(2)} KB`);
        console.log(`🔍 [OPENAI DEBUG] Full request body:`, JSON.stringify(requestBody, null, 2));

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
        console.log(`🤖 [OPENAI] Raw response:`, content);
        
        const cleanedContent = content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        
        const extractedData = JSON.parse(cleanedContent);
        console.log(`✅ [OPENAI] Parsed data:`, extractedData);
        
        // Validate that we got the 8 fields
        const requiredFields = ['companyName', 'companyType', 'taxNumber', 'ownerName', 
                                'buildingNumber', 'street', 'city', 'country'];
        const missingFields = requiredFields.filter(f => !(f in extractedData));
        
        if (missingFields.length > 0) {
          console.warn(`⚠️ [VALIDATION] Missing fields in response: ${missingFields.join(', ')}`);
          missingFields.forEach(f => extractedData[f] = '');
        }
        
        // Map to system format
        const mappedData = this.mapExtractedToSystem(extractedData);
        
        console.log(`✅ [EXTRACTION] Success on attempt ${attempt}`);
        return mappedData;
        
      } catch (error: any) {
        console.error(`❌ [OPENAI] Attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          throw this.handleDocumentError(error);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    throw new Error('Extraction failed after all retries');
  }

  /**
   * Get missing fields for lightweight extraction
   */
  private getMissingFields(data: Partial<ExtractedData>): string[] {
    const required = ['companyName', 'companyType', 'taxNumber', 'ownerName',
                      'buildingNumber', 'street', 'city', 'country'];
    
    return required.filter(field => {
      const value = (data as any)[field] || (data as any)[this.mapFieldToOldName(field)];
      return !value || value.toString().trim() === '';
    });
  }

  /**
   * Map new field names to old system names (for compatibility)
   */
  private mapFieldToOldName(newField: string): string {
    const mapping: {[key: string]: string} = {
      'companyName': 'firstName',
      'companyType': 'CustomerType',
      'taxNumber': 'tax'
    };
    return mapping[newField] || newField;
  }

  /**
   * Map OpenAI extracted data to system format
   */
  private mapExtractedToSystem(extracted: any): Partial<ExtractedData> {
    console.log(`🔄 [MAPPING] Mapping OpenAI data to system format`);
    
    const mapped: any = {
      firstName: this.cleanText(extracted.companyName),
      firstNameAR: '',
      tax: this.cleanText(extracted.taxNumber),
      CustomerType: this.mapCustomerType(extracted.companyType),
      ownerName: this.cleanText(extracted.ownerName),
      buildingNumber: this.cleanText(extracted.buildingNumber),
      street: this.cleanText(extracted.street),
      city: this.cleanText(extracted.city),
      country: this.cleanText(extracted.country),
      salesOrganization: '',
      distributionChannel: '',
      division: '',
      contacts: []
    };
    
    console.log(`✅ [MAPPING] Completed:`);
    console.log(`   - Company: "${mapped.firstName}"`);
    console.log(`   - Type: "${mapped.CustomerType}"`);
    console.log(`   - Tax: "${mapped.tax}"`);
    console.log(`   - City: "${mapped.city}"`);
    
    return mapped;
  }

  /**
   * Clean extracted text
   */
  private cleanText(text: string | undefined): string {
    if (!text) return '';
    return text.toString().trim();
  }

  /**
   * Map customer type to system values
   */
  private mapCustomerType(rawType: string): string {
    if (!rawType) return '';
    
    const normalized = rawType.toLowerCase().trim();
    
    const mapping: {[key: string]: string} = {
      'joint stock': 'joint_stock',
      'joint-stock': 'joint_stock',
      'limited liability': 'limited_liability',
      'llc': 'limited_liability',
      'l.l.c': 'limited_liability',
      'sole proprietorship': 'sole_proprietorship',
      'partnership': 'partnership',
      'corporate': 'Corporate',
      'corporation': 'Corporate',
      'sme': 'SME',
      'small and medium enterprise': 'SME',
      'retail chain': 'Retail Chain',
      'public company': 'Public Company'
    };
    
    if (mapping[normalized]) {
      console.log(`✅ [TYPE] Mapped "${rawType}" → "${mapping[normalized]}"`);
      return mapping[normalized];
    }
    
    for (const [key, value] of Object.entries(mapping)) {
      if (normalized.includes(key)) {
        console.log(`✅ [TYPE] Partial match "${rawType}" → "${value}"`);
        return value;
      }
    }
    
    console.log(`⚠️ [TYPE] No mapping for "${rawType}", using as-is`);
    return rawType.trim();
  }

  private calculateDataCompleteness(data: any): number {
    let score = 0;
    // ✅ Core required fields (7 fields only - firstName and firstNameAR are optional)
    const requiredFields = [
      'tax', 'CustomerType', 
      'ownerName', 'buildingNumber', 'street', 'country', 'city'
    ];
    // ✅ Sales fields moved to optional (user will fill them manually)
    const optionalFields = [
      'salesOrganization', 'distributionChannel', 'division',
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
      // Only reset city if it's not already extracted from OCR
      if (!this.extractedData.city || this.extractedData.city === '') {
        this.extractedData.city = ''; // Reset city when country changes
        console.log('🧪 [Service] Reset city due to country change');
      } else {
        console.log('🧪 [Service] Keeping extracted city:', this.extractedData.city);
      }
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

  /**
   * ✅ NEW: Process documents from filesystem (bypasses base64 encoding issues)
   */
  async processDocumentsFromFilesystem(sessionId: string, documentIds: string[]): Promise<Partial<ExtractedData>> {
    try {
      console.log('🤖 [FILESYSTEM PROCESSING] Starting AI processing from filesystem...');
      console.log('🤖 [FILESYSTEM PROCESSING] Session ID:', sessionId);
      console.log('🤖 [FILESYSTEM PROCESSING] Document IDs:', documentIds);
      
      // ✅ Step 1: Retrieve documents from filesystem
      const response = await firstValueFrom(
        this.http.post<any>(`${this.apiBase}/session/get-documents-for-processing-files`, {
          sessionId,
          documentIds
        })
      );
      
      const documentsFromFS = response.documents;
      console.log('📥 [FILESYSTEM PROCESSING] Retrieved documents from filesystem:', documentsFromFS.length);
      
      // ✅ Step 2: VALIDATE documents before processing
      if (!documentsFromFS || documentsFromFS.length === 0) {
        throw new Error('No documents retrieved from filesystem!');
      }
      
      documentsFromFS.forEach((doc: any, index: number) => {
        console.log(`🔍 [FILESYSTEM VALIDATION] Checking document ${index + 1}:`, {
          id: doc.document_id,
          name: doc.document_name,
          type: doc.document_type,
          hasContent: !!doc.document_content,
          contentLength: doc.document_content?.length || 0,
          contentPreview: doc.document_content?.substring(0, 100) + '...'
        });
        
        // ✅ Validate document has content
        if (!doc.document_content || doc.document_content.length < 100) {
          throw new Error(`Document ${doc.document_name} has invalid or empty content!`);
        }
      });
      
      console.log('✅ [FILESYSTEM VALIDATION] All documents validated successfully');
      
      // ✅ Step 3: Convert filesystem format to processing format
      const documentsForAI = documentsFromFS.map((doc: any, index: number) => {
        console.log(`📄 [FILESYSTEM PROCESSING] Preparing document ${index + 1}:`, {
          id: doc.document_id,
          name: doc.document_name,
          type: doc.document_type,
          contentLength: doc.document_content?.length || 0
        });
        
        return {
          id: doc.document_id,
          name: doc.document_name,
          type: doc.document_type,
          size: doc.document_size,
          content: doc.document_content
        };
      });
      
      console.log('🤖 [FILESYSTEM PROCESSING] Documents prepared for OpenAI:', documentsForAI.length);
      
      // ✅ Step 4: Log what's being sent to OpenAI
      documentsForAI.forEach((doc: any, index: number) => {
        console.log(`📤 [FILESYSTEM OPENAI INPUT] Document ${index + 1} to send:`, {
          name: doc.name,
          type: doc.type,
          contentLength: doc.content?.length || 0,
          contentStart: doc.content?.substring(0, 50) + '...'
        });
        
        console.log(`🔍 [FILESYSTEM OPENAI DEBUG] Base64 content start: ${doc.content?.substring(0, 50)}...`);
        console.log(`🔍 [FILESYSTEM OPENAI DEBUG] Base64 content end: ...${doc.content?.substring(doc.content.length - 50)}`);
      });
      
      // ✅ Step 5: Send to OpenAI for extraction
      const extractedData = await this.extractDataFromDocuments(documentsForAI, undefined, false);
      
      console.log('✅ [FILESYSTEM PROCESSING] Extraction complete:', extractedData);
      
      // ✅ Step 6: Store extracted data in service
      this.extractedData = { ...this.extractedData, ...extractedData };
      
      // ✅ Step 7: Clear memory arrays (filesystem is source of truth!)
      this.uploadedDocuments = [];
      console.log('🧹 [FILESYSTEM PROCESSING] Memory cleared - using filesystem only');
      
      return extractedData;
      
    } catch (error: any) {
      console.error('❌ [FILESYSTEM PROCESSING] Error processing from filesystem:', error);
      throw error;
    }
  }

  /**
   * ✅ NEW: Process documents from database (not from memory)
   */
  async processDocumentsFromDatabase(sessionId: string, documentIds: string[]): Promise<Partial<ExtractedData>> {
    try {
      console.log('🤖 [AI PROCESSING] Starting AI processing from database...');
      console.log('🤖 [AI PROCESSING] Session ID:', sessionId);
      console.log('🤖 [AI PROCESSING] Document IDs:', documentIds);
      
      // ✅ Step 1: Retrieve documents from database
      const response = await firstValueFrom(
        this.http.post<any>(`${this.apiBase}/session/get-documents-for-processing`, {
          sessionId,
          documentIds
        })
      );
      
      const documentsFromDB = response.documents;
      console.log('📥 [AI PROCESSING] Retrieved documents from DB:', documentsFromDB.length);
      
      // ✅ Step 2: VALIDATE documents before processing
      if (!documentsFromDB || documentsFromDB.length === 0) {
        throw new Error('No documents retrieved from database!');
      }
      
      documentsFromDB.forEach((doc: any, index: number) => {
        console.log(`🔍 [VALIDATION] Checking document ${index + 1}:`, {
          id: doc.document_id,
          name: doc.document_name,
          type: doc.document_type,
          hasContent: !!doc.document_content,
          contentLength: doc.document_content?.length || 0,
          contentPreview: doc.document_content?.substring(0, 100) + '...'
        });
        
        // ✅ Validate document has content
        if (!doc.document_content || doc.document_content.length < 100) {
          throw new Error(`Document ${doc.document_name} has invalid or empty content!`);
        }
      });
      
      console.log('✅ [VALIDATION] All documents validated successfully');
      
      // ✅ Step 3: Convert database format to processing format
      const documentsForAI = documentsFromDB.map((doc: any, index: number) => {
        console.log(`📄 [AI PROCESSING] Preparing document ${index + 1}:`, {
          id: doc.document_id,
          name: doc.document_name,
          type: doc.document_type,
          contentLength: doc.document_content?.length || 0
        });
        
        return {
          id: doc.document_id,
          name: doc.document_name,
          type: doc.document_type,
          size: doc.document_size,
          content: doc.document_content
        };
      });
      
      console.log('🤖 [AI PROCESSING] Documents prepared for OpenAI:', documentsForAI.length);
      
      // ✅ Step 4: Log what's being sent to OpenAI
      documentsForAI.forEach((doc: any, index: number) => {
        console.log(`📤 [OPENAI INPUT] Document ${index + 1} to send:`, {
          name: doc.name,
          type: doc.type,
          contentLength: doc.content?.length || 0,
          contentStart: doc.content?.substring(0, 50) + '...'
        });
        
        console.log(`🔍 [OPENAI DEBUG] Base64 content start: ${doc.content?.substring(0, 50)}...`);
        console.log(`🔍 [OPENAI DEBUG] Base64 content end: ...${doc.content?.substring(doc.content.length - 50)}`);
      });
      
      // ✅ Step 3: Send to OpenAI for extraction
      const extractedData = await this.extractDataFromDocuments(documentsForAI, undefined, false);
      
      console.log('✅ [AI PROCESSING] Extraction complete:', extractedData);
      
      // ✅ Step 4: Store extracted data in service
      this.extractedData = { ...this.extractedData, ...extractedData };
      
      // ✅ Step 5: Clear memory arrays (database is source of truth!)
      this.uploadedDocuments = [];
      console.log('🧹 [AI PROCESSING] Memory cleared - using database only');
      
      return extractedData;
      
    } catch (error: any) {
      console.error('❌ [AI PROCESSING] Error processing from database:', error);
      throw error;
    }
  }

  async submitCustomerRequest(): Promise<any> {
    try {
      const payload = this.buildRequestPayload();

      console.log('📤 [SUBMIT] Submitting request with payload:', payload);
      console.log('📤 [SUBMIT] Contacts count:', payload.contacts?.length || 0);
      console.log('📤 [SUBMIT] Documents count:', payload.documents?.length || 0);
    console.log('📤 [SUBMIT] Document content length:', payload.documentContent?.length || 0);
    console.log('📤 [SUBMIT] CustomerType from parser:', payload.CustomerType);

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

  /**
   * ✅ NEW: Set documents with filesystem paths for submission
   * This is called before submit to use filesystem-based documents
   */
  public setDocumentsForSubmit(documents: any[]): void {
    console.log('📁 [SET DOCS] Setting documents for submit:', documents.length);
    
    // Store documents in a new property for filesystem-based submission
    (this as any).documentsForSubmit = documents;
    
    documents.forEach((doc, index) => {
      console.log(`📄 [SET DOCS] Document ${index + 1}:`, {
        id: doc.id,
        name: doc.name,
        document_path: doc.document_path,
        hasPath: !!doc.document_path
      });
    });
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

    // ✅ FIX: Use filesystem documents if available (new way)
    const documentsForSubmit = (this as any).documentsForSubmit;
    
    if (documentsForSubmit && documentsForSubmit.length > 0) {
      console.log('📁 [PAYLOAD] Using filesystem documents:', documentsForSubmit.length);
      payload.documents = documentsForSubmit.map((doc: any) => ({
        documentId: doc.id || doc.document_id,
        name: doc.name || doc.document_name,
        type: doc.type || doc.document_type || 'other',
        description: `Document uploaded via AI Agent: ${doc.name || doc.document_name}`,
        size: doc.size || doc.document_size,
        mime: doc.type || doc.document_type,
        document_path: doc.document_path,  // ✅ NEW: Include filesystem path
        contentBase64: '',  // Empty for filesystem docs
        source: 'Data Steward',
        uploadedBy: this.currentUser?.username || 'data_entry'
      }));
      console.log('📎 [PAYLOAD] Including filesystem documents:', payload.documents.length);
    }
    // Fallback to old way (base64) for backward compatibility
    else if (this.uploadedDocuments && this.uploadedDocuments.length > 0) {
      console.log('💾 [PAYLOAD] Using base64 documents (old way):', this.uploadedDocuments.length);
      payload.documents = this.uploadedDocuments.map(doc => ({
        documentId: doc.id,
        name: doc.name,
        type: doc.type || 'other',
        description: `Document uploaded via AI Agent: ${doc.name}`,
        size: doc.size,
        mime: doc.type,
        contentBase64: doc.content,
        document_path: null,  // No path for base64 docs
        source: 'Data Steward',
        uploadedBy: this.currentUser?.username || 'data_entry'
      }));
      console.log('📎 [PAYLOAD] Including base64 documents:', payload.documents.length);
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

  clearAllDocuments(): void {
    console.log('🗑️ [Service] Clearing all documents from service');
    this.uploadedDocuments = [];
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

  async callOpenAI(prompt: string, maxRetries: number = 3): Promise<string> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🧪 [Service] OpenAI call attempt ${attempt}/${maxRetries}`);
        
        const response = await this.http.post<any>(this.openaiApiUrl, {
          model: this.openaiModel,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.3
        }, {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }).toPromise();

        const content = response.choices[0].message.content;
        console.log(`🧪 [Service] OpenAI response (attempt ${attempt}):`, content);
        return content;

      } catch (error: any) {
        console.warn(`🧪 [Service] OpenAI attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    throw new Error('OpenAI call failed after all retries');
  }

}



