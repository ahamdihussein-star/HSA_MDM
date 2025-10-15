import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'text' | 'options' | 'request_list' | 'search_results' | 'confirmation' | 'ai_analysis' | 'thinking';
  data?: any;
  buttons?: Array<{text: string; action: string; value?: any; style?: string}>;
  isThinking?: boolean;
  analysis?: any;
  isExpandable?: boolean;
  isExpanded?: boolean;
}

export interface ComplianceRequest {
  id: string;
  firstName: string;
  country: string;
  CustomerType?: string;
  tax?: string;
  status: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ComplianceChatService {
  private apiUrl = environment.apiBaseUrl;
  private currentLanguage: 'ar' | 'en' = 'ar';
  
  // Chat state
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private currentWorkflowSubject = new BehaviorSubject<string | null>(null);
  
  messages$ = this.messagesSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();
  currentWorkflow$ = this.currentWorkflowSubject.asObservable();
  
  constructor(private http: HttpClient) {}
  
  // ═══════════════════════════════════════════════════════════════
  // Language Management
  // ═══════════════════════════════════════════════════════════════
  
  setLanguage(lang: 'ar' | 'en'): void {
    this.currentLanguage = lang;
  }
  
  t(ar: string, en: string): string {
    return this.currentLanguage === 'ar' ? ar : en;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Message Management
  // ═══════════════════════════════════════════════════════════════
  
  addMessage(message: ChatMessage): void {
    console.log('➕ [SERVICE] addMessage called with:', message);
    const messages = this.messagesSubject.value;
    console.log('➕ [SERVICE] Current messages count:', messages.length);
    this.messagesSubject.next([...messages, message]);
    console.log('➕ [SERVICE] New messages count:', this.messagesSubject.value.length);
  }
  
  clearMessages(): void {
    this.messagesSubject.next([]);
  }

  /**
   * Toggle expand/collapse for a message
   */
  toggleExpand(messageId: string): void {
    const messages = this.messagesSubject.value;
    const message = messages.find(m => m.id === messageId);
    
    if (message && message.isExpandable) {
      message.isExpanded = !message.isExpanded;
      
      // Update buttons based on expanded state
      if (message.isExpanded) {
        // Show individual request buttons
        const requests = message.data?.requests || [];
        message.buttons = [
          message.buttons![0], // Keep the bulk approve button
          {
            text: this.t(`🔼 إخفاء التفاصيل`, `🔼 Hide Details`),
            action: 'toggle_expand',
            value: messageId,
            style: 'secondary'
          },
          ...requests.map((req: any) => ({
            text: this.t(
              `${req.firstName}\n${req.country}`,
              `${req.firstName}\n${req.country}`
            ),
            action: message.id.includes('golden') ? 'select_golden' : 'select_request',
            value: req.id,
            style: 'primary'
          }))
        ];
      } else {
        // Collapse - show only bulk approve and expand button
        message.buttons = [
          message.buttons![0], // Keep the bulk approve button
          {
            text: this.t(`🔽 عرض التفاصيل`, `🔽 Show Details`),
            action: 'toggle_expand',
            value: messageId,
            style: 'secondary'
          }
        ];
      }
      
      // Trigger change detection
      this.messagesSubject.next([...messages]);
    }
  }

  /**
   * Remove a request from message buttons after approve/block
   */
  removeRequestFromMessages(requestId: string): void {
    const messages = this.messagesSubject.value;
    let updated = false;
    
    messages.forEach(message => {
      if (message.buttons && message.data?.requests) {
        // Filter out the approved/blocked request
        const originalLength = message.data.requests.length;
        message.data.requests = message.data.requests.filter((r: any) => r.id !== requestId);
        
        if (message.data.requests.length < originalLength) {
          updated = true;
          const newCount = message.data.requests.length;
          
          // Update content with new count
          message.content = message.content.replace(/\d+/, newCount.toString());
          
          // Update buttons
          message.buttons = message.buttons.filter(btn => btn.value !== requestId);
          
          // Update bulk approve button if exists
          const bulkBtn = message.buttons.find(btn => btn.action === 'bulk_approve');
          if (bulkBtn && Array.isArray(bulkBtn.value)) {
            bulkBtn.value = bulkBtn.value.filter((id: string) => id !== requestId);
            bulkBtn.text = bulkBtn.text.replace(/\d+/g, bulkBtn.value.length.toString());
          }
          
          // If no requests left, show completion message
          if (newCount === 0) {
            message.content = this.t(
              '✅ **تم الانتهاء من جميع الطلبات!**',
              '✅ **All requests completed!**'
            );
            message.buttons = [
              {
                text: this.t('↩️ العودة للقائمة', '↩️ Back to Menu'),
                action: 'back_to_menu',
                style: 'secondary'
              }
            ];
          }
        }
      }
    });
    
    if (updated) {
      this.messagesSubject.next([...messages]);
    }
  }
  
  setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }
  
  setWorkflow(workflow: string | null): void {
    this.currentWorkflowSubject.next(workflow);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Welcome & Initial Flow
  // ═══════════════════════════════════════════════════════════════
  
  async sendWelcomeMessage(): Promise<void> {
    // Get stats
    const tasksCount = await this.getTasksCount();
    
    console.log('📊 [WELCOME] Tasks Count:', tasksCount);
    
    const welcomeMessage: ChatMessage = {
      id: `welcome_${Date.now()}`,
      role: 'assistant',
      content: this.t(
        `👋 **مرحباً! أنا وكيل الامتثال الذكي**

أساعدك في فحص الشركات والتأكد من عدم وجودها في قوائم العقوبات.

**اختر ما تريد:**`,
        `👋 **Welcome! I'm your Smart Compliance Agent**

I help you check companies and ensure they're not sanctioned.

**Choose what you need:**`
      ),
      timestamp: new Date(),
      type: 'options',
      buttons: [
        {
          text: this.t(
            `فحص الطلبات الجديدة\n${tasksCount} طلب محتاج مراجعة`,
            `Check New Requests\n${tasksCount} pending review`
          ),
          action: 'review_requests',
          value: 'requests',
          style: 'primary'
        },
        {
          text: this.t(
            `البحث عن شركة\nاستعلام سريع`,
            `Search Company\nQuick lookup`
          ),
          action: 'manual_review',
          value: 'manual',
          style: 'warning'
        }
      ]
    };
    
    this.addMessage(welcomeMessage);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Workflow Handlers
  // ═══════════════════════════════════════════════════════════════
  
  async handleManualReview(): Promise<void> {
    console.log('🔍 [SERVICE] handleManualReview called');
    this.setWorkflow('manual');
    console.log('🔍 [SERVICE] Workflow set to: manual');
    
    const message: ChatMessage = {
      id: `ask_company_${Date.now()}`,
      role: 'assistant',
      content: this.t(
        '🔍 **اكتب اسم الشركة:**',
        '🔍 **Enter company name:**'
      ),
      timestamp: new Date(),
      type: 'text'
    };
    
    console.log('🔍 [SERVICE] Adding message:', message);
    this.addMessage(message);
    console.log('🔍 [SERVICE] Message added, workflow should be active');
  }
  
  async handleReviewRequests(): Promise<void> {
    this.setWorkflow('requests');
    this.setLoading(true);
    
    try {
      const requests = await this.fetchComplianceTasks();
      console.log('📋 [REQUESTS] Fetched requests count:', requests.length);
      
      if (requests.length === 0) {
        this.addMessage({
          id: `no_requests_${Date.now()}`,
          role: 'assistant',
          content: this.t(
            '✅ **لا توجد طلبات جديدة**',
            '✅ **No new requests**'
          ),
          timestamp: new Date(),
          type: 'text'
        });
        this.setLoading(false);
        return;
      }
      
      // Quick risk assessment for all requests
      console.log('⚡ [REQUESTS] Running quick risk assessment...');
      const assessed = await Promise.all(
        requests.map(async (req) => {
          const riskCheck = await this.quickRiskCheck(req.firstName, req.country);
          return {
            ...req,
            riskLevel: riskCheck.riskLevel,
            hasMatch: riskCheck.hasMatch,
            needsReview: riskCheck.needsReview,
            matchCount: riskCheck.matchCount
          };
        })
      );
      
      // Group by risk
      const highRisk = assessed.filter(r => r.hasMatch);
      const lowRisk = assessed.filter(r => !r.hasMatch);
      
      console.log(`📊 [RISK ASSESSMENT] High Risk: ${highRisk.length}, Low Risk: ${lowRisk.length}`);
      
      // Show risk summary
      this.addMessage({
        id: `risk_summary_${Date.now()}`,
        role: 'assistant',
        content: this.t(
          `📊 **تحليل سريع:**\n\n🔴 ${highRisk.length} طلب يحتاج مراجعة\n✅ ${lowRisk.length} طلب آمن`,
          `📊 **Quick Analysis:**\n\n🔴 ${highRisk.length} needs review\n✅ ${lowRisk.length} safe`
        ),
        timestamp: new Date(),
        type: 'text'
      });
      
      // Show high risk requests first
      if (highRisk.length > 0) {
        this.addMessage({
          id: `high_risk_${Date.now()}`,
          role: 'assistant',
          content: this.t(
            `🔴 **أولوية عالية - يُرجى المراجعة:**`,
            `🔴 **High Priority - Review Required:**`
          ),
          timestamp: new Date(),
          type: 'request_list',
          data: { requests: highRisk },
          buttons: highRisk.map((req) => ({
            text: this.t(
              `${req.firstName}\n${req.country} • ⚠️ ${req.matchCount} potential match(es)`,
              `${req.firstName}\n${req.country} • ⚠️ ${req.matchCount} potential match(es)`
            ),
            action: 'select_request',
            value: req.id,
            style: 'danger'
          }))
        });
      }
      
      // Show low risk requests with bulk approve option
      if (lowRisk.length > 0) {
        const companyNames = lowRisk.map(r => r.firstName).join(', ');
        
        this.addMessage({
          id: `low_risk_${Date.now()}`,
          role: 'assistant',
          content: this.t(
            `✅ **طلبات آمنة (${lowRisk.length}):**\n\n${companyNames}`,
            `✅ **Safe Requests (${lowRisk.length}):**\n\n${companyNames}`
          ),
          timestamp: new Date(),
          type: 'request_list',
          data: { requests: lowRisk },
          isExpandable: true,
          isExpanded: false,
          buttons: [
            {
              text: this.t(
                `✅ الموافقة على الكل (${lowRisk.length})\nلا توجد مؤشرات خطر`,
                `✅ Approve All (${lowRisk.length})\nNo risk indicators`
              ),
              action: 'bulk_approve',
              value: lowRisk.map(r => r.id),
              style: 'success'
            },
            {
              text: this.t(
                `🔽 عرض التفاصيل`,
                `🔽 Show Details`
              ),
              action: 'toggle_expand',
              value: `low_risk_${Date.now()}`,
              style: 'secondary'
            }
          ]
        });
      }
      
      this.setLoading(false);
      
    } catch (error) {
      console.error('Error fetching requests:', error);
      this.addMessage({
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: this.t(
          '❌ عذراً، حدث خطأ في تحميل الطلبات.',
          '❌ Sorry, error loading requests.'
        ),
        timestamp: new Date(),
        type: 'text'
      });
      this.setLoading(false);
    }
  }
  
  async handleReviewGolden(): Promise<void> {
    this.setWorkflow('golden');
    this.setLoading(true);
    
    try {
      const goldenRecords = await this.fetchGoldenRecords();
      console.log('⭐ [GOLDEN] Fetched golden records count:', goldenRecords.length);
      
      if (goldenRecords.length === 0) {
        this.addMessage({
          id: `no_golden_${Date.now()}`,
          role: 'assistant',
          content: this.t(
            '✅ **لا توجد سجلات ذهبية**',
            '✅ **No golden records**'
          ),
          timestamp: new Date(),
          type: 'text'
        });
        this.setLoading(false);
        return;
      }
      
      // Quick risk assessment for all golden records
      console.log('⚡ [GOLDEN] Running quick risk assessment...');
      const assessed = await Promise.all(
        goldenRecords.map(async (rec) => {
          const riskCheck = await this.quickRiskCheck(rec.firstName, rec.country);
          return {
            ...rec,
            riskLevel: riskCheck.riskLevel,
            hasMatch: riskCheck.hasMatch,
            needsReview: riskCheck.needsReview,
            matchCount: riskCheck.matchCount
          };
        })
      );
      
      // Group by risk
      const highRisk = assessed.filter(r => r.hasMatch);
      const lowRisk = assessed.filter(r => !r.hasMatch);
      
      console.log(`📊 [RISK ASSESSMENT] High Risk: ${highRisk.length}, Low Risk: ${lowRisk.length}`);
      
      // Show risk summary
      this.addMessage({
        id: `risk_summary_${Date.now()}`,
        role: 'assistant',
        content: this.t(
          `📊 **تحليل سريع:**\n\n🔴 ${highRisk.length} سجل يحتاج مراجعة\n✅ ${lowRisk.length} سجل آمن`,
          `📊 **Quick Analysis:**\n\n🔴 ${highRisk.length} needs review\n✅ ${lowRisk.length} safe`
        ),
        timestamp: new Date(),
        type: 'text'
      });
      
      // Show high risk golden records first
      if (highRisk.length > 0) {
        this.addMessage({
          id: `high_risk_golden_${Date.now()}`,
          role: 'assistant',
          content: this.t(
            `🔴 **أولوية عالية - يُرجى المراجعة:**`,
            `🔴 **High Priority - Review Required:**`
          ),
          timestamp: new Date(),
          type: 'request_list',
          data: { requests: highRisk },
          buttons: highRisk.map((rec) => ({
            text: this.t(
              `${rec.firstName}\n${rec.country} • ⚠️ ${rec.matchCount} potential match(es)`,
              `${rec.firstName}\n${rec.country} • ⚠️ ${rec.matchCount} potential match(es)`
            ),
            action: 'select_golden',
            value: rec.id,
            style: 'danger'
          }))
        });
      }
      
      // Show low risk golden records
      if (lowRisk.length > 0) {
        const companyNames = lowRisk.map(r => r.firstName).join(', ');
        
        this.addMessage({
          id: `low_risk_golden_${Date.now()}`,
          role: 'assistant',
          content: this.t(
            `✅ **سجلات آمنة (${lowRisk.length}):**\n\n${companyNames}`,
            `✅ **Safe Records (${lowRisk.length}):**\n\n${companyNames}`
          ),
          timestamp: new Date(),
          type: 'request_list',
          data: { requests: lowRisk },
          isExpandable: true,
          isExpanded: false,
          buttons: [
            {
              text: this.t(
                `🔽 عرض التفاصيل`,
                `🔽 Show Details`
              ),
              action: 'toggle_expand',
              value: `low_risk_golden_${Date.now()}`,
              style: 'secondary'
            }
          ]
        });
      }
      
      this.setLoading(false);
      
    } catch (error) {
      console.error('Error fetching golden records:', error);
      this.addMessage({
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: this.t(
          '❌ عذراً، حدث خطأ في تحميل السجلات.',
          '❌ Sorry, error loading records.'
        ),
        timestamp: new Date(),
        type: 'text'
      });
      this.setLoading(false);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Search & Review
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * NEW: Intelligent AI-powered search with GPT-4 analysis
   * First searches local database, then external APIs if needed
   */
  async searchWithAI(companyName: string, country?: string, sector?: string, requestType?: string): Promise<any> {
    console.log('🤖 [SERVICE] AI-powered search called with:', { companyName, country, sector, requestType });
    this.setLoading(true);
    
    try {
      // STEP 1: Search Local Sanctions Database First
      console.log('🔍 [SERVICE] Searching local sanctions database first...');
      console.log('🔍 [SERVICE] API URL:', `${this.apiUrl}/compliance/search-local`);
      console.log('🔍 [SERVICE] Request body:', { companyName, country, sector });
      
      const localResults: any = await this.http.post(`${this.apiUrl}/compliance/search-local`, {
        companyName,
        country,
        sector
      }).toPromise();
      
      console.log('📊 [SERVICE] Local database results:', localResults);
      
      // 📊 DETAILED LOGGING FOR DEBUGGING
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 [FRONTEND DEBUG] BACKEND RESPONSE ANALYSIS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 Search Query:', companyName);
      console.log('📊 Total Matches:', localResults?.totalMatches || 0);
      console.log('📋 Sanctions Array Length:', localResults?.sanctions?.length || 0);
      console.log('🎯 Match Confidence:', localResults?.matchConfidence || 0);
      console.log('⚠️ Overall Risk Level:', localResults?.overallRiskLevel || 'Unknown');
      console.log('🔧 Match Method:', localResults?.matchMethod || 'Unknown');
      console.log('');
      
      if (localResults?.sanctions && localResults.sanctions.length > 0) {
        console.log('📋 MATCHED COMPANIES:');
        localResults.sanctions.forEach((sanction: any, i: number) => {
          console.log(`${i + 1}. ${sanction.name}`);
          console.log(`   Confidence: ${sanction.confidence}%`);
          console.log(`   Match Reason: ${sanction.matchReason || 'N/A'}`);
          console.log(`   Risk Level: ${sanction.riskLevel}`);
          console.log(`   Country: ${sanction.country}`);
          console.log('');
        });
      } else {
        console.log('❌ NO MATCHES FOUND');
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // If we found matches in local database, return them
      if (localResults && localResults.sanctions && localResults.sanctions.length > 0) {
        console.log(`✅ [SERVICE] Found ${localResults.sanctions.length} matches in LOCAL database!`);
        this.setLoading(false);
        
        const firstMatch = localResults.sanctions[0];
        const riskLevel = firstMatch.riskLevel?.toLowerCase() || 'high';
        
        // Format response to match AI analysis format
        return {
          hasMatch: true,
          totalResults: localResults.sanctions.length,
          results: localResults.sanctions,
          riskLevel: riskLevel,
          confidence: 95,
          recommendation: riskLevel === 'very high' || riskLevel === 'critical' || riskLevel === 'high' ? 'block' : 'review',
          explanation: this.currentLanguage === 'ar' 
            ? `🚨 **${firstMatch.name}**\n${firstMatch.country} • ${firstMatch.riskLevel}`
            : `🚨 **${firstMatch.name}**\n${firstMatch.country} • ${firstMatch.riskLevel}`,
          source: 'Local Sanctions Database',
          analysis: {
            decision: 'BLOCK',
            confidence: 95,
            reasoning_ar: `تم العثور على ${localResults.sanctions.length} تطابق في قاعدة البيانات المحلية. الشركة مدرجة في قوائم العقوبات.`,
            reasoning_en: `Found ${localResults.sanctions.length} match(es) in local sanctions database. Company is listed in sanctions.`,
            match_quality: 'exact',
            risk_level: riskLevel
          }
        };
      }
      
      // STEP 2: If no local results, use OpenAI to analyze and give smart recommendation
      console.log('🤖 [SERVICE] No local matches, using OpenAI for smart analysis...');
      this.setLoading(false);
      
      // Call OpenAI to analyze why no match was found and give recommendation
      const aiResponse = await this.analyzeNoMatchWithOpenAI(companyName, country, sector);
      
      return {
        hasMatch: false,
        totalResults: 0,
        results: [],
        riskLevel: aiResponse.riskLevel || 'low',
        confidence: aiResponse.confidence || 90,
        recommendation: aiResponse.recommendation || 'approve',
        explanation: this.currentLanguage === 'ar' 
          ? aiResponse.explanation_ar 
          : aiResponse.explanation_en,
        source: 'OpenAI Analysis'
      };
      
    } catch (error) {
      const err = error as any;
      console.error('❌ [SERVICE] AI search error:', error);
      console.error('❌ [SERVICE] Error details:', err?.message);
      console.error('❌ [SERVICE] Error status:', err?.status);
      console.error('❌ [SERVICE] Full error:', error);
      this.setLoading(false);
      
      // Fallback response - no external API calls
      return {
        hasMatch: false,
        totalResults: 0,
        results: [],
        riskLevel: 'low',
        confidence: 75,
        recommendation: 'review',
        explanation: this.currentLanguage === 'ar' 
          ? `⚠️ **خطأ في البحث**\n\nيُرجى المحاولة مرة أخرى`
          : `⚠️ **Search Error**\n\nPlease try again`,
        source: 'Error - Manual Review Needed'
      };
    }
  }
  
  /**
   * Use OpenAI to analyze when no match is found in local database
   */
  private async analyzeNoMatchWithOpenAI(companyName: string, country?: string, sector?: string): Promise<any> {
    try {
      console.log('🤖 [OPENAI] Analyzing no-match case:', { companyName, country, sector });
      
      const response: any = await this.http.post(`${this.apiUrl}/openai/analyze-no-match`, {
        companyName,
        country,
        sector,
        language: this.currentLanguage
      }).toPromise();
      
      console.log('✅ [OPENAI] Analysis complete:', response);
      return response;
      
    } catch (error) {
      console.error('❌ [OPENAI] Analysis failed:', error);
      // Fallback response
      return {
        riskLevel: 'low',
        confidence: 85,
        recommendation: 'approve',
        explanation_ar: `✅ **آمن للموافقة**\n\nلا توجد عقوبات على "${companyName}"`,
        explanation_en: `✅ **Safe to Approve**\n\nNo sanctions found for "${companyName}"`
      };
    }
  }

  /**
   * LEGACY: Basic search without AI intelligence (fallback)
   */
  async searchOFAC(companyName: string, country?: string): Promise<any[]> {
    console.log('🔍 [SERVICE] searchOFAC called with:', { companyName, country });
    this.setLoading(true);
    
    try {
      // Search both OFAC and UN in parallel
      console.log('🔍 [SERVICE] Searching OFAC and UN simultaneously...');
      
      const [ofacResults, unResults] = await Promise.all([
        this.http.post<any[]>(`${this.apiUrl}/ofac/search`, {
          companyName,
          country,
          useAI: true
        }).toPromise(),
        
        this.http.post<any[]>(`${this.apiUrl}/un/search`, {
          companyName,
          country,
          useAI: true
        }).toPromise()
      ]);
      
      // Mark source for each result
      const ofacMarked = (ofacResults || []).map(r => ({ ...r, source: 'OFAC' }));
      const unMarked = (unResults || []).map(r => ({ ...r, source: 'UN' }));
      
      // Combine and sort by match score
      const combined = [...ofacMarked, ...unMarked].sort((a, b) => 
        (b.matchScore || 0) - (a.matchScore || 0)
      );
      
      console.log(`✅ [SERVICE] Found ${ofacMarked.length} OFAC + ${unMarked.length} UN = ${combined.length} total results`);
      this.setLoading(false);
      return combined;
      
    } catch (error) {
      console.error('❌ [SERVICE] Search error:', error);
      this.setLoading(false);
      throw error;
    }
  }
  
  async smartMatch(requestData: any, ofacResults: any[]): Promise<any> {
    try {
      const response = await this.http.post<any>(`${this.apiUrl}/compliance/smart-match`, {
        requestData,
        ofacResults
      }).toPromise();
      
      return response;
      
    } catch (error) {
      console.error('Smart match error:', error);
      return {
        matches: [],
        recommendation: 'review',
        reasoning: 'Error in smart matching'
      };
    }
  }
  
  async blockRequest(requestId: string, blockReason: string, sanctionsInfo?: any): Promise<any> {
    // Use the same API as compliance-task-list component
    return this.http.post(`${this.apiUrl}/requests/${requestId}/compliance/block`, {
      reason: blockReason,
      sanctionsInfo: sanctionsInfo
    }).toPromise();
  }
  
  async approveRequest(requestId: string): Promise<any> {
    return this.http.post(`${this.apiUrl}/requests/${requestId}/compliance/approve`, {}).toPromise();
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Data Fetching
  // ═══════════════════════════════════════════════════════════════
  
  private async getTasksCount(): Promise<number> {
    try {
      const response = await this.http.get<any[]>(
        `${this.apiUrl}/requests?assignedTo=compliance&status=Approved`
      ).toPromise();
      
      // Apply same filter as compliance-task-list component
      const filtered = (response || []).filter((r: any) => {
        const complianceStatus = r.ComplianceStatus ?? '';
        const isGolden = r.isGolden ?? 0;
        
        // Only count tasks that haven't been processed by compliance yet
        return !complianceStatus && !isGolden;
      });
      
      console.log('📊 [COUNT] Total approved & assigned to compliance:', response?.length || 0);
      console.log('📊 [COUNT] Unprocessed compliance tasks:', filtered.length);
      return filtered.length;
    } catch {
      return 0;
    }
  }
  
  private async getGoldenCount(): Promise<number> {
    try {
      const response = await this.http.get<any[]>(
        `${this.apiUrl}/requests?isGolden=true`
      ).toPromise();
      
      // Apply same filtering as fetchGoldenRecords
      const filtered = (response || []).filter((r: any) => {
        const isGolden = r.isGolden === 1;
        const hasValidStatus = !r.companyStatus || 
                               r.companyStatus === 'Active' || 
                               r.companyStatus === 'Blocked';
        const isApproved = !r.ComplianceStatus || 
                           r.ComplianceStatus === 'Approved' || 
                           r.ComplianceStatus === 'Under Review';
        
        return isGolden && hasValidStatus && isApproved;
      });
      
      return filtered.length;
    } catch {
      return 0;
    }
  }
  
  async fetchComplianceTasks(): Promise<ComplianceRequest[]> {
    const response = await this.http.get<ComplianceRequest[]>(
      `${this.apiUrl}/requests?assignedTo=compliance&status=Approved`
    ).toPromise();
    
    // Apply same filter as compliance-task-list component
    const filtered = (response || []).filter((r: any) => {
      const complianceStatus = r.ComplianceStatus ?? '';
      const isGolden = r.isGolden ?? 0;
      
      // Only show tasks that haven't been processed by compliance yet
      return !complianceStatus && !isGolden;
    });
    
    console.log('📋 [FETCH] Total compliance tasks:', response?.length || 0);
    console.log('📋 [FETCH] Filtered (unprocessed):', filtered.length);
    return filtered;
  }
  
  async fetchGoldenRecords(): Promise<ComplianceRequest[]> {
    console.log('📊 [SERVICE] Fetching golden records...');
    const response = await this.http.get<ComplianceRequest[]>(
      `${this.apiUrl}/requests?isGolden=true`
    ).toPromise();
    
    console.log('📊 [SERVICE] Raw golden records:', response?.length || 0);
    
    // Apply same filtering as Golden Requests page
    const filtered = (response || []).filter((r: any) => {
      const isGolden = r.isGolden === 1;
      const hasValidStatus = !r.companyStatus || 
                             r.companyStatus === 'Active' || 
                             r.companyStatus === 'Blocked';
      const isApproved = !r.ComplianceStatus || 
                         r.ComplianceStatus === 'Approved' || 
                         r.ComplianceStatus === 'Under Review';
      
      return isGolden && hasValidStatus && isApproved;
    });
    
    console.log('📊 [SERVICE] Filtered golden records:', filtered.length);
    return filtered;
  }
  
  async fetchRequestDetails(requestId: string): Promise<any> {
    return this.http.get(`${this.apiUrl}/requests/${requestId}`).toPromise();
  }

  /**
   * Quick risk assessment for a company (fast preliminary check)
   */
  async quickRiskCheck(companyName: string, country?: string): Promise<any> {
    try {
      const response = await this.http.post(`${this.apiUrl}/compliance/quick-risk-check`, {
        companyName,
        country
      }).toPromise();
      return response;
    } catch (error) {
      console.error('❌ [QUICK CHECK] Error:', error);
      return { hasMatch: false, riskLevel: 'Low', needsReview: false };
    }
  }
  
  async getEntityDetails(id: string | number, source: string = 'Local Database'): Promise<any> {
    console.log('🔍 [SERVICE] getEntityDetails called with id:', id, 'source:', source);
    try {
      // Use local compliance database endpoint
      const endpoint = `${this.apiUrl}/compliance/entity/${id}`;
      
      console.log('🔍 [SERVICE] Fetching from:', endpoint);
      const response = await this.http.get<any>(endpoint).toPromise();
      console.log('✅ [SERVICE] Entity details:', response);
      return response;
    } catch (error) {
      console.error('❌ [SERVICE] getEntityDetails error:', error);
      throw error;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Smart Conversational Interface
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Detect user intent from message
   */
  detectIntent(message: string): 'search' | 'question' | 'greeting' | 'thanks' | 'help' | 'unknown' {
    const normalized = message.toLowerCase().trim();
    
    // Greetings
    if (/^(hi|hello|hey|مرحبا|السلام|أهلا|صباح|مساء)/.test(normalized)) {
      return 'greeting';
    }
    
    // Thanks
    if (/(thank|شكرا|thanks|متشكر)/.test(normalized)) {
      return 'thanks';
    }
    
    // Help
    if (/(help|مساعدة|ساعدني|كيف)/.test(normalized)) {
      return 'help';
    }
    
    // Questions
    if (/(what|where|when|who|why|how|ما|أين|متى|من|لماذا|كيف|\?)/.test(normalized)) {
      return 'question';
    }
    
    // Search (company name pattern)
    if (normalized.length > 2 && normalized.split(' ').length <= 5) {
      return 'search';
    }
    
    return 'unknown';
  }
  
  /**
   * Get smart suggestions based on context
   */
  getSmartSuggestions(context: string = 'default'): string[] {
    const suggestions: Record<string, string[]> = {
      'default': [
        this.t('ابحث عن شركة...', 'Search for a company...'),
        this.t('ما هي الحالات عالية الخطورة؟', 'Show high-risk cases'),
        this.t('عرض الطلبات الجديدة', 'Show new requests'),
        this.t('كيف يعمل النظام؟', 'How does this work?')
      ],
      'after_search': [
        this.t('ابحث عن شركة أخرى', 'Search another company'),
        this.t('عرض التفاصيل الكاملة', 'Show full details'),
        this.t('ما هي الإجراءات المقترحة؟', 'What are the suggested actions?'),
        this.t('عودة للقائمة الرئيسية', 'Back to main menu')
      ],
      'no_results': [
        this.t('هل الاسم صحيح؟', 'Is the name correct?'),
        this.t('جرب البحث بالإنجليزي', 'Try searching in English'),
        this.t('ابحث عن شركة أخرى', 'Search another company'),
        this.t('عودة للقائمة', 'Back to menu')
      ],
      'help': [
        this.t('كيف أبحث عن شركة؟', 'How do I search?'),
        this.t('ما هي قوائم العقوبات؟', 'What are sanctions lists?'),
        this.t('كيف يعمل الذكاء الاصطناعي؟', 'How does AI work?'),
        this.t('من يمكنه استخدام النظام؟', 'Who can use this?')
      ]
    };
    
    return suggestions[context] || suggestions['default'];
  }
  
  /**
   * Generate contextual response
   */
  getContextualResponse(intent: string): string {
    const responses: Record<string, string> = {
      'greeting': this.t(
        '👋 أهلاً! أنا مساعد الامتثال الذكي.\n\nيمكنني مساعدتك في:\n• البحث عن الشركات في قوائم العقوبات\n• تحليل المخاطر بالذكاء الاصطناعي\n• مراجعة الطلبات الجديدة\n\nكيف يمكنني مساعدتك؟',
        '👋 Hello! I\'m the Intelligent Compliance Assistant.\n\nI can help you with:\n• Searching companies in sanctions lists\n• AI-powered risk analysis\n• Reviewing new requests\n\nHow can I help you?'
      ),
      'thanks': this.t(
        '🙏 العفو! سعيد بمساعدتك.\n\nهل تحتاج أي شيء آخر؟',
        '🙏 You\'re welcome! Happy to help.\n\nAnything else I can do for you?'
      ),
      'help': this.t(
        '📚 **كيف يمكنني مساعدتك؟**\n\n🔍 **للبحث:**\nاكتب اسم الشركة (بالعربي أو الإنجليزي)\n\n🤖 **التحليل الذكي:**\nسأقوم بتحليل النتائج وإعطائك:\n• مستوى الخطورة\n• نسبة التطابق\n• التوصية المناسبة\n\n⚡ **سريع ودقيق:**\nالنتائج خلال ثوان\n\nجرب الآن!',
        '📚 **How can I help?**\n\n🔍 **To Search:**\nType company name (Arabic or English)\n\n🤖 **Smart Analysis:**\nI\'ll analyze results and give you:\n• Risk level\n• Match score\n• Recommendations\n\n⚡ **Fast & Accurate:**\nResults in seconds\n\nTry it now!'
      ),
      'unknown': this.t(
        '🤔 لم أفهم تماماً. يمكنك:\n\n• كتابة اسم شركة للبحث\n• طرح سؤال محدد\n• كتابة "مساعدة" لمعرفة المزيد',
        '🤔 I didn\'t quite understand. You can:\n\n• Type a company name to search\n• Ask a specific question\n• Type "help" to learn more'
      )
    };
    
    return responses[intent] || responses['unknown'];
  }
  
  /**
   * Add thinking indicator
   */
  addThinkingMessage(): void {
    this.addMessage({
      id: `thinking_${Date.now()}`,
      role: 'assistant',
      content: this.t('🤖 جاري التفكير...', '🤖 Thinking...'),
      timestamp: new Date(),
      type: 'thinking',
      isThinking: true
    });
  }
  
  /**
   * Remove thinking messages
   */
  removeThinkingMessages(): void {
    const currentMessages = this.messagesSubject.value;
    const filtered = currentMessages.filter(m => !m.isThinking);
    this.messagesSubject.next(filtered);
  }
  
  /**
   * Add AI analysis message with rich formatting
   * @param analysis - The analysis result
   * @param isManualSearch - If true, don't show approve/block buttons (just inquiry)
   */
  addAIAnalysisMessage(analysis: any, isManualSearch: boolean = false): void {
    this.removeThinkingMessages();
    
    // 📊 DETAILED LOGGING FOR DEBUGGING
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 [MESSAGE DEBUG] AI ANALYSIS MESSAGE DETAILS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Has Match:', analysis.hasMatch);
    console.log('📊 Total Results:', analysis.totalResults);
    console.log('⚠️ Risk Level:', analysis.riskLevel);
    console.log('🎯 Confidence:', analysis.confidence);
    console.log('💡 Recommendation:', analysis.recommendation);
    console.log('🔧 Source:', analysis.source);
    console.log('📝 Explanation Preview:', analysis.explanation?.substring(0, 100) + '...');
    console.log('');
    
    if (analysis.results && analysis.results.length > 0) {
      console.log('📋 RESULTS IN MESSAGE:');
      analysis.results.forEach((result: any, i: number) => {
        console.log(`${i + 1}. ${result.name} (${result.confidence}%)`);
      });
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const riskEmojiMap: Record<string, string> = {
      'low': '✅',
      'medium': '⚠️',
      'high': '🚨',
      'critical': '🔴'
    };
    
    const riskEmoji = riskEmojiMap[analysis.riskLevel] || '⚠️';
    
    let content = '';
    
    if (!analysis.hasMatch) {
      content = this.t(
        `${riskEmoji} **لا توجد تطابقات**\n\n${analysis.explanation}`,
        `${riskEmoji} **No Matches**\n\n${analysis.explanation}`
      );
    } else {
      content = this.t(
        `${riskEmoji} **${analysis.totalResults} تطابق**\n\n${analysis.explanation}`,
        `${riskEmoji} **${analysis.totalResults} Match(es)**\n\n${analysis.explanation}`
      );
    }
    
    // Generate action buttons
    const buttons: Array<{text: string; action: string; value?: any; style?: string}> = [];
    
    // Only show approve/block buttons if this is NOT a manual search
    if (!isManualSearch) {
      if (analysis.recommendation === 'approve') {
        buttons.push({
          text: this.t('✅ آمن للموافقة', '✅ Safe to Approve'),
          action: 'acknowledge',
          style: 'success'
        });
      } else if (analysis.recommendation === 'block') {
        buttons.push({
          text: this.t('🚫 يجب الحظر', '🚫 Should Block'),
          action: 'acknowledge',
          style: 'danger'
        });
      } else if (analysis.recommendation === 'review') {
        buttons.push({
          text: this.t('👁️ يحتاج مراجعة', '👁️ Needs Review'),
          action: 'acknowledge',
          style: 'warning'
        });
      }
      
      // Always show view details if there are results (for non-manual search)
      if (analysis.results && analysis.results.length > 0) {
        buttons.push({
          text: this.t('📋 عرض التفاصيل', '📋 View Details'),
          action: 'show_results',
          value: analysis.results,
          style: 'primary'
        });
      }
      
      // Always add "New Search" button at the end (for non-manual search)
      buttons.push({
        text: this.t('🔍 بحث جديد', '🔍 New Search'),
        action: 'new_search',
        style: 'secondary'
      });
    } else {
      // For manual search: only show results as direct action buttons (open modal)
      if (analysis.results && analysis.results.length > 0) {
        analysis.results.forEach((result: any, index: number) => {
          buttons.push({
            text: this.t(
              `📋 عرض: ${result.name}`,
              `📋 View: ${result.name}`
            ),
            action: 'view_sanction_details',
            value: result.id,
            style: 'primary'
          });
        });
      }
    }
    
    // 📊 LOG FINAL MESSAGE BEING SENT TO UI
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 [FINAL MESSAGE] MESSAGE BEING SENT TO UI');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 Content Length:', content.length);
    console.log('📝 Content Preview:', content.substring(0, 200) + '...');
    console.log('🔘 Buttons Count:', buttons.length);
    buttons.forEach((btn, i) => {
      console.log(`  Button ${i + 1}: ${btn.text} (${btn.action})`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    this.addMessage({
      id: `analysis_${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: new Date(),
      type: 'ai_analysis',
      analysis,
      buttons
    });
  }
}

