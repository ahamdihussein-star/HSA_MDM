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
      
      // Store document content for later parsing if needed
      if (finalExtractedData.documentContent) {
        this.extractedData.documentContent = finalExtractedData.documentContent;
        console.log(`💾 [Service] Stored document content (${finalExtractedData.documentContent.length} chars) for later parsing`);
      }

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
    const maxRetries = lightweightMode ? 1 : 3; // ✅ Only 1 attempt in lightweight mode
    const allAttempts: Array<{ data: any; score: number; attempt: number }> = [];
    
    console.log(`🔍 [EXTRACTION] Mode: ${lightweightMode ? 'LIGHTWEIGHT (company name + missing fields only)' : 'FULL (all fields)'}`);
    console.log(`🔍 [EXTRACTION] Max retries: ${maxRetries}`);

    // ✅ CRITICAL: Check for duplicates BEFORE sending to OpenAI using SHA-256 Content Hash
    console.log('🔍 [OPENAI INPUT] Total documents to process:', documents.length);
    console.log('🔍 [OPENAI INPUT] Document names:', documents.map(d => d.name));
    
    // ✅ Calculate SHA-256 hash for each document's content
    const documentsWithHashes = await Promise.all(
      documents.map(async (doc) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(doc.content);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        return {
          ...doc,
          contentHash: hashHex
        };
      })
    );
    
    console.log('🔐 [OPENAI INPUT] Content hashes calculated for all documents');
    
    // ✅ Deduplicate by content hash (most accurate) + name as secondary check
    const uniqueDocuments = documentsWithHashes.filter((doc, index, self) => {
      const firstIndex = self.findIndex(d => d.contentHash === doc.contentHash);
      const isDuplicate = firstIndex !== index;
      
      if (isDuplicate) {
        console.log(`⏭️ [OPENAI INPUT] Skipping duplicate: "${doc.name}" (hash: ${doc.contentHash.substring(0, 16)}...)`);
      }
      
      return !isDuplicate;
    });
    
    if (uniqueDocuments.length < documents.length) {
      console.warn(`⚠️ [OPENAI INPUT] Removed ${documents.length - uniqueDocuments.length} duplicate documents using SHA-256 hash!`);
      console.warn(`⚠️ [OPENAI INPUT] Original: ${documents.length}, Unique: ${uniqueDocuments.length}`);
    }
    
    console.log('✅ [OPENAI INPUT] Unique documents to send to OpenAI:', uniqueDocuments.length);
    console.log('✅ [OPENAI INPUT] Unique document names:', uniqueDocuments.map(d => d.name));
    console.log('✅ [OPENAI INPUT] Content hashes:', uniqueDocuments.map(d => d.contentHash.substring(0, 16) + '...'));

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let requestBody: any = null;
      try {
        console.log(`🧪 [Service] Starting intelligent document extraction (attempt ${attempt}/${maxRetries})...`);
        console.log(`🧪 [Service] Existing form data:`, existingFormData);

        if (!environment.openaiApiKey) {
          throw new Error('OpenAI API key not configured');
        }

        // Build intelligent prompt with existing data context
        let existingDataContext = '';
        
        if (lightweightMode && existingFormData && Object.keys(existingFormData).length > 0) {
          // ✅ LIGHTWEIGHT MODE: Focus on company name + missing fields only
          const filledFields = Object.keys(existingFormData).filter(key => {
            const value = existingFormData[key as keyof ExtractedData];
            return value && value.toString().trim() !== '';
          });
          const missingFields = ['companyName', 'companyType', 'tax', 'ownerName', 
            'buildingNumber', 'street', 'country', 'city', 'salesOrganization', 
            'distributionChannel', 'division'].filter(f => !filledFields.includes(f));
          
          existingDataContext = `\n\n**LIGHTWEIGHT EXTRACTION MODE**
**Form already has ${filledFields.length} fields filled.**

**YOUR TASK:** Extract ONLY these fields:
1. **COMPANY NAME** - MOST IMPORTANT for verification
2. **MISSING FIELDS**: ${missingFields.length > 0 ? missingFields.join(', ') : 'None - all fields filled!'}

**DO NOT extract fields that are already filled** - this saves time and processing!

**EXISTING FORM DATA:**
${JSON.stringify(existingFormData, null, 2)}`;
        } else if (existingFormData && Object.keys(existingFormData).length > 0) {
          // FULL MODE with existing data
          existingDataContext = `\n\n**EXISTING FORM DATA (already filled):**
${JSON.stringify(existingFormData, null, 2)}

**INTELLIGENT FORM FILLING RULES:**
1. **KEEP existing values** - DO NOT overwrite fields that are already filled UNLESS the new document provides MORE ACCURATE or MORE COMPLETE information
2. **FILL MISSING fields** - Focus on extracting data for fields that are currently empty ("")
3. **ENHANCE incomplete data** - If existing data is partial (e.g., only building number without street), complete it from the new document
4. **CONSISTENCY CHECK** - If you extract a company name that is DIFFERENT from the existing one, you MUST still extract it accurately (the system will handle conflicts)
5. **SMART MERGING** - Combine information from the new document with existing data intelligently

**YOUR TASK:** Extract data from the NEW document and intelligently decide which fields to fill/update based on the existing form data above.`;
        } else {
          // FULL MODE - first document
          existingDataContext = `\n\n**FIRST DOCUMENT** - This is the first document being processed, so extract ALL possible fields.`;
        }

        const messages = [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are an intelligent document processing AI. Extract customer data from these business documents and intelligently fill form fields.

Attempt ${attempt}/${maxRetries} - Focus on extracting ALL possible fields with MAXIMUM PRECISION.
${existingDataContext}

**CRITICAL EXTRACTION RULES:**
1. SCAN EVERY PIXEL - examine headers, footers, margins, stamps, logos, watermarks
2. **COMPANY NAME** - Look for "Company Name:" field in the document and return the EXACT text you see
3. Find ALL numbers - tax IDs, VAT numbers, registration numbers, license numbers
4. **CITY/LOCATION IS CRITICAL** - Look for city name near address, registration location, or branch. Examples: "Riyadh", "Cairo", "Dubai", "Jeddah", "Kuwait City"
5. Extract complete addresses including building numbers, streets, districts, cities
6. Find owner/CEO/manager names in signatures or official sections (store in "ownerName" or "CompanyOwner")
7. Extract ALL dates in any format
8. Extract contact information if available (name, jobTitle, email, mobile, landline, preferredLanguage)

**RETURN FORMAT:** Return ONLY valid JSON with ALL form fields. For fields not found in the document, use empty string "".

{
  "companyName": "",
  "tax": "",
  "ownerName": "",
  "CompanyOwner": "",
  "buildingNumber": "",
  "street": "",
  "country": "",
  "city": "",
  "registrationNumber": "",
  "commercialLicense": "",
  "vatNumber": "",
  "establishmentDate": "",
  "capital": "",
  "website": "",
  "poBox": "",
  "fax": "",
  "branch": "",
  "contacts": [],
  "documentContent": "",
  "confidence": {
    "companyName": 0.0-1.0,
    "tax": 0.0-1.0,
    "country": 0.0-1.0,
    "city": 0.0-1.0,
    "overall": 0.0-1.0
  },
  "dataSource": {
    "companyName": "exact location in document where found (e.g., 'Company Name section') or 'not found'",
    "tax": "exact location or 'not found'",
    "country": "exact location or 'not found'"
  }
}

**CRITICAL ANTI-HALLUCINATION RULES:**
1. **ONLY extract data that is CLEARLY VISIBLE in the document** - DO NOT guess, infer, or make up data
2. **If a field is not found, leave it as empty string ""** - DO NOT fill it with assumed or typical values
3. **Confidence scoring:**
   - 1.0 = Data is crystal clear and unambiguous in the document
   - 0.7-0.9 = Data is visible but slightly unclear or partially obscured
   - 0.5-0.6 = Data is barely visible or requires interpretation
   - Below 0.5 = DO NOT include the data, leave field empty
4. **Data source tracking:** For each extracted field, note the exact location where you found it in the document
5. **DO NOT:**
   - Infer company type from company name
   - Guess cities based on country
   - Make up tax numbers from partial numbers
   - Create contact information that doesn't exist
   - Fill fields with "typical" or "common" values
6. **If existing form data shows a different company, still extract the NEW document's data accurately** - the system will handle conflicts

**IMPORTANT:** 
1. Your response should be a JSON object that can directly fill the form
2. For "documentContent" field, extract and return ALL visible text content from the document as a single string
3. Think intelligently about what data to include based on the existing form context, but NEVER hallucinate or guess data.`
              },
              ...uniqueDocuments.map(doc => ({
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
        
        // ✅ Calculate and log request size
        const requestSize = JSON.stringify(requestBody).length;
        const requestSizeMB = (requestSize / (1024 * 1024)).toFixed(2);
        const estimatedTokens = Math.ceil(requestSize / 4); // Rough estimate: 1 token ≈ 4 chars
        
        console.log(`📊 [OPENAI REQUEST SIZE]:`);
        console.log(`   - Documents sent: ${uniqueDocuments.length}`);
        console.log(`   - Request size: ${requestSize} bytes (${requestSizeMB} MB)`);
        console.log(`   - Estimated tokens: ~${estimatedTokens.toLocaleString()}`);
        console.log(`   - Model: ${environment.openaiModel || 'gpt-4o'}`);
        console.log(`   - Attempt: ${attempt}/${maxRetries}`);
        
        if (estimatedTokens > 100000) {
          console.warn(`⚠️ [OPENAI] Large request! May cause timeout or failure.`);
        }

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
        console.log(`🧪 [Service] Raw OpenAI response (attempt ${attempt}):`, content);
        
        const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const extractedData = JSON.parse(cleanedContent);
        
        console.log(`🧪 [Service] Parsed extracted data (attempt ${attempt}):`, extractedData);
        console.log(`🧪 [Service] City extracted: "${extractedData.city}"`);
        
        // Map extracted fields to system fields
        if (extractedData.companyName) {
          console.log(`🔍 [CompanyName Debug] Raw extracted: "${extractedData.companyName}"`);
          extractedData.firstName = this.mapCompanyName(extractedData.companyName);
          console.log(`🔍 [CompanyName Debug] Mapped to firstName: "${extractedData.firstName}"`);
        } else {
          console.log(`⚠️ [CompanyName Debug] Company name not found`);
        }
        
        // Parse company type from document content
        if (extractedData.documentContent) {
          console.log(`🔍 [CustomerType Debug] Parsing from document content`);
          console.log(`📄 [Document Content] Length: ${extractedData.documentContent.length} chars`);
          console.log(`📄 [Document Content] Preview: ${extractedData.documentContent.substring(0, 200)}...`);
          extractedData.CustomerType = this.parseCompanyTypeFromContent(extractedData.documentContent);
          console.log(`🔍 [CustomerType Debug] Parsed CustomerType: "${extractedData.CustomerType}"`);
        } else {
          console.log(`⚠️ [CustomerType Debug] Document content not found`);
        }

        // ✅ Validate confidence scores to prevent hallucination
        if (extractedData.confidence) {
          console.log(`🎯 [Anti-Hallucination] Confidence scores:`, extractedData.confidence);
          console.log(`🎯 [Anti-Hallucination] Overall confidence: ${extractedData.confidence.overall}`);
          
          // Filter out low-confidence fields (below 0.5)
          const confidenceThreshold = 0.5;
          Object.keys(extractedData).forEach(field => {
            if (extractedData.confidence && extractedData.confidence[field] !== undefined) {
              if (extractedData.confidence[field] < confidenceThreshold) {
                console.warn(`⚠️ [Anti-Hallucination] Removing low-confidence field: ${field} (confidence: ${extractedData.confidence[field]})`);
                extractedData[field] = ''; // Clear low-confidence data
              }
            }
          });
        }

        // ✅ Log data sources for transparency
        if (extractedData.dataSource) {
          console.log(`📍 [Data Source Tracking]:`, extractedData.dataSource);
        }

        const score = this.calculateDataCompleteness(extractedData);
        console.log(`🧪 [Service] Attempt ${attempt} extracted ${score} fields`);
        allAttempts.push({ data: extractedData, score, attempt });

        // Check if current attempt has all core required fields (7 fields)
        if (score >= 7) {
          console.log(`✅ [Service] Attempt ${attempt} got all core required fields! Stopping.`);
          break;
        }
        
        // ✅ NEW: Check if merged data from all attempts so far has all core required fields
        if (attempt >= 2) {
          const mergedSoFar = this.mergeExtractedData(allAttempts);
          
          const mergedScore = this.calculateDataCompleteness(mergedSoFar);
          console.log(`🔍 [Service] Merged score after ${attempt} attempts: ${mergedScore}`);
          
          if (mergedScore >= 7) {
            console.log(`✅ [Service] Merged data has all core required fields after ${attempt} attempts! Stopping early.`);
            break;
          }
        }

        if (attempt < maxRetries) {
          const waitTime = attempt * 500;
          console.log(`⏳ [Service] Waiting ${waitTime}ms before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      } catch (error: any) {
        console.error(`❌ [Service] Extraction error (attempt ${attempt}/${maxRetries}):`, error);
        if (attempt < maxRetries) {
          const waitTime = attempt * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    if (allAttempts.length === 0) {
      throw new Error('فشلت جميع المحاولات / All extraction attempts failed');
    }

    allAttempts.sort((a, b) => b.score - a.score);
    const bestAttempt = allAttempts[0];
    console.log(`🏆 [Service] Best result from attempt ${bestAttempt.attempt} with score ${bestAttempt.score}`);
    console.log('📊 [Service] All attempts scores:', allAttempts.map(a => `Attempt ${a.attempt}: ${a.score} fields`));

    const mergedData = this.mergeExtractedData(allAttempts);
    if (!mergedData.country) {
      mergedData.country = this.detectCountryFromData(mergedData);
    }
    return mergedData;
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

  private async handleArabicTranslation(): Promise<void> {
    if (this.extractedData.firstName && !this.extractedData.firstNameAR) {
      this.extractedData.firstNameAR = await this.translateToArabic(this.extractedData.firstName);
    }
  }

  /**
   * Map raw company name text to clean format
   */
  private mapCompanyName(rawText: string): string {
    if (!rawText) return '';
    
    // Clean and normalize company name
    let cleanedName = rawText.trim();
    
    // Remove common prefixes/suffixes that might confuse the AI
    cleanedName = cleanedName.replace(/^(Company|Corp|Corporation|Ltd|Limited|LLC|Inc|Incorporated)\s*/i, '');
    cleanedName = cleanedName.replace(/\s+(Company|Corp|Corporation|Ltd|Limited|LLC|Inc|Incorporated)$/i, '');
    
    // Remove extra spaces and normalize
    cleanedName = cleanedName.replace(/\s+/g, ' ').trim();
    
    console.log(`🔍 [CompanyName Mapping] "${rawText}" → "${cleanedName}"`);
    return cleanedName;
  }

  /**
   * Parse company type from document content
   */
  private parseCompanyTypeFromContent(documentContent: string): string {
    if (!documentContent) {
      console.log(`⚠️ [CompanyType Parser] No document content provided`);
      return '';
    }
    
    console.log(`🔍 [CompanyType Parser] Starting parsing of document content (${documentContent.length} chars)`);
    const content = documentContent.toLowerCase();
    
    // Look for "Company Type:" pattern
    console.log(`🔍 [CompanyType Parser] Looking for "Company Type:" pattern...`);
    const companyTypeMatch = content.match(/company\s*type\s*:?\s*([^\n\r,]+)/i);
    if (companyTypeMatch) {
      const extractedType = companyTypeMatch[1].trim();
      console.log(`✅ [CompanyType Parser] Found "Company Type:" in document: "${extractedType}"`);
      const mappedType = this.mapCustomerType(extractedType);
      console.log(`✅ [CompanyType Parser] Final mapped type: "${mappedType}"`);
      return mappedType;
    }
    
    // Look for common company type patterns
    console.log(`🔍 [CompanyType Parser] Looking for common company type patterns...`);
    const patterns = [
      { pattern: /joint\s*stock/i, value: 'joint_stock' },
      { pattern: /limited\s*liability/i, value: 'limited_liability' },
      { pattern: /llc/i, value: 'limited_liability' },
      { pattern: /sole\s*proprietorship/i, value: 'sole_proprietorship' },
      { pattern: /partnership/i, value: 'partnership' },
      { pattern: /corporate/i, value: 'Corporate' },
      { pattern: /corporation/i, value: 'Corporate' },
      { pattern: /sme|small\s*medium\s*enterprise/i, value: 'SME' },
      { pattern: /retail\s*chain/i, value: 'Retail Chain' },
      { pattern: /public\s*company/i, value: 'Public Company' }
    ];
    
    for (const { pattern, value } of patterns) {
      if (pattern.test(content)) {
        console.log(`✅ [CompanyType Parser] Found pattern "${pattern}" in document: "${value}"`);
        return value;
      }
    }
    
    console.warn(`⚠️ [CompanyType Parser] No company type patterns found in document content`);
    console.log(`📄 [CompanyType Parser] Content sample: "${content.substring(0, 300)}..."`);
    return '';
  }

  /**
   * Map raw company type text to system values
   */
  private mapCustomerType(rawText: string): string {
    if (!rawText) return '';
    
    const normalizedText = rawText.trim().toLowerCase();
    
    // Mapping table
    const mapping: { [key: string]: string } = {
      'limited liability': 'limited_liability',
      'llc': 'limited_liability',
      'joint stock': 'joint_stock',
      'sole proprietorship': 'sole_proprietorship',
      'partnership': 'partnership',
      'corporate': 'Corporate',
      'corporation': 'Corporate',
      'sme': 'SME',
      'small medium enterprise': 'SME',
      'retail chain': 'Retail Chain',
      'public company': 'Public Company'
    };
    
    // Check for exact match
    if (mapping[normalizedText]) {
      console.log(`✅ [CustomerType] "${rawText}" → "${mapping[normalizedText]}"`);
      return mapping[normalizedText];
    }
    
    // Check for partial match (contains)
    for (const [key, value] of Object.entries(mapping)) {
      if (normalizedText.includes(key)) {
        console.log(`✅ [CustomerType] "${rawText}" → "${value}" (partial match: "${key}")`);
        return value;
      }
    }
    
    // Default fallback - return cleaned original
    console.warn(`⚠️ [CustomerType] Unknown company type: "${rawText}", using as-is`);
    return rawText.trim();
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
      documentContent: this.extractedData.documentContent || '',  // Include document content
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



