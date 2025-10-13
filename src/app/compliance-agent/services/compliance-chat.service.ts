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
    const goldenCount = await this.getGoldenCount();
    
    const welcomeMessage: ChatMessage = {
      id: `welcome_${Date.now()}`,
      role: 'assistant',
      content: this.t(
        `مرحباً بك في وكيل الامتثال! 👋

كيف يمكنني مساعدتك اليوم؟`,
        `Welcome to Compliance Agent! 👋

How can I help you today?`
      ),
      timestamp: new Date(),
      type: 'options',
      buttons: [
        {
          text: this.t(
            `📋 مراجعة يدوية\n(استعلام عن شركة)`,
            `📋 Manual Review\n(Query a company)`
          ),
          action: 'manual_review',
          value: 'manual',
          style: 'primary'
        },
        {
          text: this.t(
            `✉️ مراجعة الطلبات الجديدة\n(${tasksCount} طلب)`,
            `✉️ Review New Requests\n(${tasksCount} requests)`
          ),
          action: 'review_requests',
          value: 'requests',
          style: 'primary'
        },
        {
          text: this.t(
            `⭐ مراجعة السجلات المعتمدة\n(${goldenCount} سجل)`,
            `⭐ Review Golden Records\n(${goldenCount} records)`
          ),
          action: 'review_golden',
          value: 'golden',
          style: 'primary'
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
        '🔍 ممتاز! الرجاء إدخال اسم الشركة للبحث:',
        '🔍 Great! Please enter the company name to search:'
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
      
      if (requests.length === 0) {
        this.addMessage({
          id: `no_requests_${Date.now()}`,
          role: 'assistant',
          content: this.t(
            '✅ لا توجد طلبات جديدة للمراجعة!',
            '✅ No new requests to review!'
          ),
          timestamp: new Date(),
          type: 'text'
        });
        this.setLoading(false);
        return;
      }
      
      const message: ChatMessage = {
        id: `request_list_${Date.now()}`,
        role: 'assistant',
        content: this.t(
          `📋 لديك ${requests.length} طلب للمراجعة:\n\nاختر طلباً لبدء المراجعة:`,
          `📋 You have ${requests.length} request(s) to review:\n\nSelect a request to start review:`
        ),
        timestamp: new Date(),
        type: 'request_list',
        data: { requests },
        buttons: requests.map((req, index) => ({
          text: this.t(
            `${index + 1}. ${req.firstName}\n   ${req.country}`,
            `${index + 1}. ${req.firstName}\n   ${req.country}`
          ),
          action: 'select_request',
          value: req.id
        }))
      };
      
      this.addMessage(message);
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
      
      if (goldenRecords.length === 0) {
        this.addMessage({
          id: `no_golden_${Date.now()}`,
          role: 'assistant',
          content: this.t(
            '✅ لا توجد سجلات معتمدة حالياً!',
            '✅ No golden records currently!'
          ),
          timestamp: new Date(),
          type: 'text'
        });
        this.setLoading(false);
        return;
      }
      
      const message: ChatMessage = {
        id: `golden_list_${Date.now()}`,
        role: 'assistant',
        content: this.t(
          `⭐ لديك ${goldenRecords.length} سجل معتمد:\n\nاختر سجلاً لإعادة الفحص:`,
          `⭐ You have ${goldenRecords.length} golden record(s):\n\nSelect a record to re-check:`
        ),
        timestamp: new Date(),
        type: 'request_list',
        data: { requests: goldenRecords },
        buttons: goldenRecords.slice(0, 10).map((rec, index) => ({
          text: this.t(
            `${index + 1}. ${rec.firstName}\n   ${rec.country}`,
            `${index + 1}. ${rec.firstName}\n   ${rec.country}`
          ),
          action: 'select_golden',
          value: rec.id
        }))
      };
      
      this.addMessage(message);
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
   */
  async searchWithAI(companyName: string, country?: string, sector?: string, requestType?: string): Promise<any> {
    console.log('🤖 [SERVICE] AI-powered search called with:', { companyName, country, sector, requestType });
    this.setLoading(true);
    
    try {
      const sessionId = `session_${Date.now()}`;
      
      const response: any = await this.http.post(`${this.apiUrl}/compliance/ai-analyze`, {
        companyName,
        country,
        sector,
        requestType,
        sessionId
      }).toPromise();
      
      console.log('✅ [SERVICE] AI analysis complete:', response);
      this.setLoading(false);
      return response;
      
    } catch (error) {
      console.error('❌ [SERVICE] AI search error:', error);
      this.setLoading(false);
      // Fallback to basic search
      return this.searchOFAC(companyName, country);
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
  
  async blockRequest(requestId: string, blockReason: string, sanctionsInfo: any): Promise<any> {
    return this.http.post(`${this.apiUrl}/compliance/block-with-sanctions`, {
      requestId,
      blockReason,
      sanctionsInfo
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
        `${this.apiUrl}/requests?assignedTo=compliance&status=Pending`
      ).toPromise();
      return response?.length || 0;
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
      `${this.apiUrl}/requests?assignedTo=compliance&status=Pending`
    ).toPromise();
    return response || [];
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
  
  async getEntityDetails(id: string | number, source: string = 'OFAC'): Promise<any> {
    console.log('🔍 [SERVICE] getEntityDetails called with id:', id, 'source:', source);
    try {
      const endpoint = source === 'UN' 
        ? `${this.apiUrl}/un/entity/${id}`
        : `${this.apiUrl}/ofac/entity/${id}`;
      
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
   */
  addAIAnalysisMessage(analysis: any): void {
    this.removeThinkingMessages();
    
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
        `${riskEmoji} **لا توجد تطابقات!**\n\n${analysis.explanation}\n\n📊 **الثقة:** ${analysis.confidence}%`,
        `${riskEmoji} **No Matches!**\n\n${analysis.explanation}\n\n📊 **Confidence:** ${analysis.confidence}%`
      );
    } else {
      content = this.t(
        `${riskEmoji} **تحليل ذكي**\n\n${analysis.explanation}\n\n📊 **المخاطر:** ${analysis.riskLevel}\n💯 **الثقة:** ${analysis.confidence}%\n📋 **النتائج:** ${analysis.totalResults}`,
        `${riskEmoji} **Smart Analysis**\n\n${analysis.explanation}\n\n📊 **Risk:** ${analysis.riskLevel}\n💯 **Confidence:** ${analysis.confidence}%\n📋 **Results:** ${analysis.totalResults}`
      );
    }
    
    // Generate action buttons
    const buttons: Array<{text: string; action: string; value?: any; style?: string}> = [];
    
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
    
    if (analysis.results && analysis.results.length > 0) {
      buttons.push({
        text: this.t('📋 عرض التفاصيل', '📋 View Details'),
        action: 'show_results',
        value: analysis.results,
        style: 'primary'
      });
    }
    
    buttons.push({
      text: this.t('🔍 بحث جديد', '🔍 New Search'),
      action: 'new_search',
      style: 'secondary'
    });
    
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

