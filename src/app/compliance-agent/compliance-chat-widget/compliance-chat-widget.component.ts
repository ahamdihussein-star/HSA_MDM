import { Component, OnInit, OnDestroy, ViewChild, ElementRef, EventEmitter, Output } from '@angular/core';
import { ComplianceChatService, ChatMessage } from '../services/compliance-chat.service';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-compliance-chat-widget',
  templateUrl: './compliance-chat-widget.component.html',
  styleUrls: ['./compliance-chat-widget.component.scss']
})
export class ComplianceChatWidgetComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @Output() viewDetailsRequested = new EventEmitter<any>();
  
  // UI State (Like Data Entry Agent)
  isOpen = false;
  isMinimized = true;
  messages: ChatMessage[] = [];
  newMessage = '';
  loading = false;
  currentWorkflow: string | null = null;
  
  // Current context
  currentRequest: any = null;
  currentOFACResults: any[] = [];
  currentSmartMatch: any = null;
  
  // Language (Auto-detect from TranslateService)
  currentLang: 'ar' | 'en' = 'en';
  
  // Subscriptions
  private subscriptions: Subscription[] = [];
  
  constructor(
    public chatService: ComplianceChatService,
    public translate: TranslateService
  ) {}
  
  ngOnInit(): void {
    // Get current language from TranslateService
    this.currentLang = this.translate.currentLang as 'ar' | 'en' || 'en';
    
    this.setupSubscriptions();
    this.chatService.setLanguage(this.currentLang);
    
    // Listen to language changes
    this.translate.onLangChange.subscribe(event => {
      this.currentLang = event.lang as 'ar' | 'en';
      this.chatService.setLanguage(this.currentLang);
    });
  }
  
  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Setup
  // ═══════════════════════════════════════════════════════════════
  
  private setupSubscriptions(): void {
    this.subscriptions.push(
      this.chatService.messages$.subscribe(messages => {
        console.log('📨 [COMPONENT] messages$ updated:', messages.length, 'messages');
        console.log('📨 [COMPONENT] Last message:', messages[messages.length - 1]);
        this.messages = messages;
      }),
      this.chatService.loading$.subscribe(loading => {
        this.loading = loading;
      }),
      this.chatService.currentWorkflow$.subscribe(workflow => {
        console.log('🔄 [COMPONENT] Workflow changed to:', workflow);
        this.currentWorkflow = workflow;
        console.log('🔄 [COMPONENT] currentWorkflow set to:', this.currentWorkflow);
      })
    );
  }
  
  // ═══════════════════════════════════════════════════════════════
  // UI Actions (Like Data Entry Agent)
  // ═══════════════════════════════════════════════════════════════
  
  toggleChat(): void {
    this.isOpen = !this.isOpen;
    
    if (this.isOpen) {
      this.isMinimized = false;
      
      if (this.messages.length === 0) {
        this.chatService.sendWelcomeMessage();
      }
      
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }
  
  minimizeChat(): void {
    this.isMinimized = true;
  }
  
  closeChat(): void {
    this.isOpen = false;
    this.isMinimized = true;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Message Handling
  // ═══════════════════════════════════════════════════════════════
  
  async sendMessage(): Promise<void> {
    console.log('💬 [COMPONENT] sendMessage called');
    console.log('💬 [COMPONENT] newMessage:', this.newMessage);
    console.log('💬 [COMPONENT] currentWorkflow:', this.currentWorkflow);
    
    const message = this.newMessage.trim();
    if (!message) {
      console.log('⚠️ [COMPONENT] Empty message, aborting');
      return;
    }
    
    console.log('💬 [COMPONENT] Sending message:', message);
    
    // Add user message
    this.chatService.addMessage({
      id: `user_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
      type: 'text'
    });
    
    this.newMessage = '';
    
    // Handle based on current workflow
    if (this.currentWorkflow === 'manual') {
      console.log('🔍 [COMPONENT] Calling handleManualSearch');
      await this.handleManualSearch(message);
    } else {
      console.log('⚠️ [COMPONENT] Not in manual workflow, skipping search');
    }
    
    setTimeout(() => this.scrollToBottom(), 100);
  }
  
  async handleButtonClick(button: any): Promise<void> {
    console.log('🔘 [CHAT] Button clicked (OLD):', button);
    
    // Check if it's a new smart action
    if (button.action === 'suggestion_click' || 
        button.action === 'show_results' || 
        button.action === 'new_search' ||
        button.action === 'acknowledge') {
      // Use new handler
      this.handleButtonAction(button.action, button.value);
      return;
    }
    
    // Add user selection message for old actions
    this.chatService.addMessage({
      id: `user_${Date.now()}`,
      role: 'user',
      content: button.text,
      timestamp: new Date(),
      type: 'text'
    });
    
    switch (button.action) {
      case 'manual_review':
        console.log('🔍 [CHAT] Starting manual review');
        await this.chatService.handleManualReview();
        setTimeout(() => this.scrollToBottom(), 100);
        break;
        
      case 'review_requests':
        console.log('📋 [CHAT] Starting review requests');
        await this.chatService.handleReviewRequests();
        setTimeout(() => this.scrollToBottom(), 100);
        break;
        
      case 'review_golden':
        console.log('⭐ [CHAT] Starting review golden');
        await this.chatService.handleReviewGolden();
        setTimeout(() => this.scrollToBottom(), 100);
        break;
        
      case 'select_request':
        console.log('📄 [CHAT] Request selected:', button.value);
        await this.handleRequestSelected(button.value);
        setTimeout(() => this.scrollToBottom(), 100);
        break;
        
      case 'select_golden':
        console.log('⭐ [CHAT] Golden record selected:', button.value);
        await this.handleGoldenSelected(button.value);
        setTimeout(() => this.scrollToBottom(), 100);
        break;
        
      case 'approve_request':
        console.log('✅ [CHAT] Approving request:', button.value);
        await this.handleApprove(button.value);
        setTimeout(() => this.scrollToBottom(), 100);
        break;
        
      case 'block_request':
        console.log('🚫 [CHAT] Blocking request:', button.value);
        await this.handleBlock(button.value);
        setTimeout(() => this.scrollToBottom(), 100);
        break;
        
      case 'back_to_menu':
        console.log('↩️ [CHAT] Back to menu');
        this.handleButtonAction('back_to_menu');
        break;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Workflow Handlers
  // ═══════════════════════════════════════════════════════════════
  
  private async handleManualSearch(companyName: string): Promise<void> {
    console.log('🤖 [SMART] Intelligent search for:', companyName);
    
    // Detect intent
    const intent = this.chatService.detectIntent(companyName);
    console.log('🧠 [INTENT]:', intent);
    
    // Handle non-search intents
    if (intent === 'greeting' || intent === 'thanks' || intent === 'help' || intent === 'unknown') {
      const response = this.chatService.getContextualResponse(intent);
      this.chatService.addMessage({
        id: `response_${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        type: 'text',
        buttons: intent === 'help' ? [
          {text: this.t('جرب البحث', 'Try Search'), action: 'back_to_menu'}
        ] : []
      });
      
      // Show suggestions
      const suggestions = this.chatService.getSmartSuggestions(intent === 'help' ? 'help' : 'default');
      setTimeout(() => {
        this.showSuggestions(suggestions);
      }, 1000);
      
      return;
    }
    
    // Search intent - proceed with AI analysis
    this.chatService.addThinkingMessage();
    this.chatService.setLoading(true);
    
    try {
      console.log('🤖 [COMPONENT] Calling searchWithAI...');
      const aiAnalysis = await this.chatService.searchWithAI(companyName);
      console.log('🤖 [COMPONENT] AI Analysis:', aiAnalysis);
      
      // Use the new smart AI analysis message
      this.chatService.addAIAnalysisMessage(aiAnalysis);
      
      // Show context-appropriate suggestions
      const context = aiAnalysis.hasMatch ? 'after_search' : 'no_results';
      setTimeout(() => {
        const suggestions = this.chatService.getSmartSuggestions(context);
        this.showSuggestions(suggestions);
      }, 1500);
      
    } catch (error) {
      console.error('❌ [SMART] Search error:', error);
      this.chatService.removeThinkingMessages();
      this.chatService.addMessage({
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: this.t(
          '❌ عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.',
          '❌ Sorry, an error occurred. Please try again.'
        ),
        timestamp: new Date(),
        type: 'text'
      });
    } finally {
      this.chatService.setLoading(false);
    }
  }
  
  private showSuggestions(suggestions: string[]): void {
    this.chatService.addMessage({
      id: `suggestions_${Date.now()}`,
      role: 'assistant',
      content: this.t('💡 اقتراحات:', '💡 Suggestions:'),
      timestamp: new Date(),
      type: 'text',
      buttons: suggestions.map(s => ({
        text: s,
        action: 'suggestion_click',
        value: s,
        style: 'secondary'
      }))
    });
  }
  
  async handleButtonAction(action: string, value?: any): Promise<void> {
    console.log('🚀 [SMART BUTTON ACTION CALLED]:', action, value);
    
    switch (action) {
      case 'suggestion_click':
        // User clicked a suggestion
        this.newMessage = value;
        this.sendMessage();
        break;
        
      case 'show_results':
        // Show full results
        this.chatService.addMessage({
          id: `results_${Date.now()}`,
          role: 'assistant',
          content: this.t('📋 النتائج الكاملة:', '📋 Full Results:'),
          timestamp: new Date(),
          type: 'search_results',
          data: { results: value }
        });
        setTimeout(() => this.scrollToBottom(), 100);
        break;
        
      case 'new_search':
        // Reset for new search
        this.newMessage = '';
        this.chatService.addMessage({
          id: `prompt_${Date.now()}`,
          role: 'assistant',
          content: this.t(
            '🔍 اكتب اسم الشركة للبحث:',
            '🔍 Type company name to search:'
          ),
          timestamp: new Date(),
          type: 'text'
        });
        setTimeout(() => this.scrollToBottom(), 100);
        break;
        
      case 'acknowledge':
        // Just acknowledge
        this.chatService.addMessage({
          id: `ack_${Date.now()}`,
          role: 'assistant',
          content: this.t('✅ تم', '✅ Noted'),
          timestamp: new Date(),
          type: 'text'
        });
        setTimeout(() => this.scrollToBottom(), 100);
        break;
        
      case 'back_to_menu':
        await this.resetChat();
        setTimeout(() => this.scrollToBottom(), 100);
        break;
        
      // Support old actions from welcome menu
      case 'manual_review':
        console.log('🔍 [SMART] Starting manual review');
        await this.chatService.handleManualReview();
        setTimeout(() => this.scrollToBottom(), 100);
        break;
        
      case 'review_requests':
        console.log('📋 [SMART] Starting review requests');
        await this.chatService.handleReviewRequests();
        setTimeout(() => this.scrollToBottom(), 100);
        break;
        
      case 'review_golden':
        console.log('⭐ [SMART] Starting review golden');
        await this.chatService.handleReviewGolden();
        setTimeout(() => this.scrollToBottom(), 100);
        break;
    }
  }
  
  private resetChat(): void {
    // Reset to welcome state
    this.chatService.clearMessages();
    this.chatService.sendWelcomeMessage();
  }
  
  
  private async handleRequestSelected(requestId: string): Promise<void> {
    this.chatService.setLoading(true);
    
    try {
      // Fetch request details
      const request = await this.chatService.fetchRequestDetails(requestId);
      this.currentRequest = request;
      
      this.chatService.addMessage({
        id: `request_details_${Date.now()}`,
        role: 'assistant',
        content: this.t(
          `📋 معلومات الطلب:\n\n• الاسم: ${request.firstName}\n• الدولة: ${request.country}\n• النوع: ${request.CustomerType || 'غير محدد'}\n• الرقم الضريبي: ${request.tax || 'غير محدد'}\n\n🔍 جاري البحث في قوائم العقوبات...`,
          `📋 Request Info:\n\n• Name: ${request.firstName}\n• Country: ${request.country}\n• Type: ${request.CustomerType || 'N/A'}\n• Tax ID: ${request.tax || 'N/A'}\n\n🔍 Searching sanctions lists...`
        ),
        timestamp: new Date(),
        type: 'text'
      });
      
      // Search OFAC
      const ofacResults = await this.chatService.searchOFAC(request.firstName, request.country);
      this.currentOFACResults = ofacResults;
      
      if (ofacResults.length === 0) {
        this.showApproveOption(requestId);
      } else {
        await this.performSmartMatch(request, ofacResults, requestId);
      }
      
    } catch (error) {
      console.error('Error:', error);
      this.chatService.addMessage({
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: this.t('❌ حدث خطأ', '❌ Error occurred'),
        timestamp: new Date(),
        type: 'text'
      });
    }
    
    this.chatService.setLoading(false);
  }
  
  private async handleGoldenSelected(requestId: string): Promise<void> {
    // Same as handleRequestSelected but for golden records
    await this.handleRequestSelected(requestId);
  }
  
  private async performSmartMatch(request: any, ofacResults: any[], requestId: string): Promise<void> {
    this.chatService.setLoading(true);
    
    this.chatService.addMessage({
      id: `ai_analyzing_${Date.now()}`,
      role: 'assistant',
      content: this.t(
        `🤖 جاري التحليل الذكي للتطابقات...`,
        `🤖 AI analyzing matches...`
      ),
      timestamp: new Date(),
      type: 'text'
    });
    
    try {
      const smartMatch = await this.chatService.smartMatch({
        name: request.firstName,
        country: request.country,
        sector: request.CustomerType,
        taxNumber: request.tax
      }, ofacResults);
      
      this.currentSmartMatch = smartMatch;
      
      if (smartMatch.matches.length === 0) {
        this.showApproveOption(requestId);
      } else {
        this.showMatchResults(smartMatch, requestId);
      }
      
    } catch (error) {
      console.error('Smart match error:', error);
      this.showApproveOption(requestId);
    }
    
    this.chatService.setLoading(false);
  }
  
  private showApproveOption(requestId: string): void {
    this.chatService.addMessage({
      id: `safe_${Date.now()}`,
      role: 'assistant',
      content: this.t(
        `✅ لا توجد عقوبات!\n\nالشركة آمنة - يمكن اعتمادها.`,
        `✅ No sanctions!\n\nCompany is safe - can be approved.`
      ),
      timestamp: new Date(),
      type: 'confirmation',
      buttons: [
        {
          text: this.t('✅ اعتماد الطلب', '✅ Approve Request'),
          action: 'approve_request',
          value: requestId
        },
        {
          text: this.t('↩️ عودة', '↩️ Back'),
          action: 'back_to_menu'
        }
      ]
    });
  }
  
  private showMatchResults(smartMatch: any, requestId: string): void {
    const topMatch = smartMatch.matches[0];
    const entity = topMatch.entity;
    
    let content = this.t(
      `⚠️ تنبيه! تم العثور على تطابق محتمل:\n\n`,
      `⚠️ Warning! Potential match found:\n\n`
    );
    
    content += this.t(
      `📌 الكيان: ${entity.name}\n`,
      `📌 Entity: ${entity.name}\n`
    );
    content += this.t(
      `المصدر: OFAC\n`,
      `Source: OFAC\n`
    );
    content += this.t(
      `الدولة: ${entity.countries?.[0] || 'غير محدد'}\n`,
      `Country: ${entity.countries?.[0] || 'N/A'}\n`
    );
    content += this.t(
      `نسبة التطابق: ${topMatch.confidence}%\n\n`,
      `Match Confidence: ${topMatch.confidence}%\n\n`
    );
    content += this.t(
      `🤖 التحليل:\n${topMatch.explanation}\n\n`,
      `🤖 Analysis:\n${topMatch.explanation}\n\n`
    );
    content += this.t(
      `💡 التوصية: ${smartMatch.recommendation === 'block' ? 'حظر الشركة' : 'مراجعة إضافية'}\n`,
      `💡 Recommendation: ${smartMatch.recommendation === 'block' ? 'Block Company' : 'Further Review'}\n`
    );
    content += this.t(
      `السبب: ${smartMatch.reasoning}`,
      `Reason: ${smartMatch.reasoning}`
    );
    
    this.chatService.addMessage({
      id: `match_result_${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: new Date(),
      type: 'search_results',
      data: { smartMatch, entity },
      buttons: [
        {
          text: this.t('🚫 حظر الشركة', '🚫 Block Company'),
          action: 'block_request',
          value: { requestId, entity, smartMatch }
        },
        {
          text: this.t('✅ اعتماد رغم التطابق', '✅ Approve Anyway'),
          action: 'approve_request',
          value: requestId
        },
        {
          text: this.t('↩️ عودة', '↩️ Back'),
          action: 'back_to_menu'
        }
      ]
    });
  }
  
  private async handleApprove(requestId: string): Promise<void> {
    this.chatService.setLoading(true);
    
    this.chatService.addMessage({
      id: `approving_${Date.now()}`,
      role: 'assistant',
      content: this.t(
        '⏳ جاري اعتماد الطلب...',
        '⏳ Approving request...'
      ),
      timestamp: new Date(),
      type: 'text'
    });
    
    try {
      await this.chatService.approveRequest(requestId);
      
      this.chatService.addMessage({
        id: `approved_${Date.now()}`,
        role: 'assistant',
        content: this.t(
          '✅ تم اعتماد الطلب بنجاح!',
          '✅ Request approved successfully!'
        ),
        timestamp: new Date(),
        type: 'text',
        buttons: [{
          text: this.t('↩️ عودة للقائمة', '↩️ Back to Menu'),
          action: 'back_to_menu'
        }]
      });
      
    } catch (error) {
      this.chatService.addMessage({
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: this.t(
          '❌ فشل الاعتماد',
          '❌ Approval failed'
        ),
        timestamp: new Date(),
        type: 'text'
      });
    }
    
    this.chatService.setLoading(false);
  }
  
  private async handleBlock(data: any): Promise<void> {
    this.chatService.setLoading(true);
    
    const { requestId, entity, smartMatch } = data;
    const topMatch = smartMatch.matches[0];
    
    this.chatService.addMessage({
      id: `blocking_${Date.now()}`,
      role: 'assistant',
      content: this.t(
        '⏳ جاري حظر الشركة وحفظ معلومات العقوبات...',
        '⏳ Blocking company and saving sanctions info...'
      ),
      timestamp: new Date(),
      type: 'text'
    });
    
    try {
      const blockReason = this.t(
        `تطابق مع قائمة OFAC (${topMatch.confidence}%)\nالكيان: ${entity.name}`,
        `OFAC match (${topMatch.confidence}%)\nEntity: ${entity.name}`
      );
      
      await this.chatService.blockRequest(requestId, blockReason, {
        entityId: entity.uid,
        companyName: entity.name,
        matchConfidence: topMatch.confidence,
        source: 'OFAC',
        explanation: topMatch.explanation,
        listedDate: entity.listed_date,
        countries: entity.countries,
        sector: entity.sector
      });
      
      this.chatService.addMessage({
        id: `blocked_${Date.now()}`,
        role: 'assistant',
        content: this.t(
          `✅ تم حظر الشركة بنجاح!\n\nالسبب: ${blockReason}\n\nتم حفظ معلومات العقوبات في قاعدة البيانات.`,
          `✅ Company blocked successfully!\n\nReason: ${blockReason}\n\nSanctions info saved to database.`
        ),
        timestamp: new Date(),
        type: 'text',
        buttons: [{
          text: this.t('↩️ عودة للقائمة', '↩️ Back to Menu'),
          action: 'back_to_menu'
        }]
      });
      
    } catch (error) {
      this.chatService.addMessage({
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: this.t(
          '❌ فشل الحظر',
          '❌ Block failed'
        ),
        timestamp: new Date(),
        type: 'text'
      });
    }
    
    this.chatService.setLoading(false);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Language
  // ═══════════════════════════════════════════════════════════════
  
  switchLanguage(): void {
    this.currentLang = this.currentLang === 'ar' ? 'en' : 'ar';
    this.chatService.setLanguage(this.currentLang);
  }
  
  t(ar: string, en: string): string {
    return this.currentLang === 'ar' ? ar : en;
  }
  
  getSectorArabic(sector: string): string {
    const map: any = {
      'Food & Agriculture': 'الأغذية والزراعة',
      'Construction': 'البناء والإنشاءات'
    };
    return map[sector] || sector;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // View Details (Open Parent Modal)
  // ═══════════════════════════════════════════════════════════════
  
  async viewSanctionDetails(sanction: any): Promise<void> {
    console.log('👁️ [CHAT] View details requested for:', sanction);
    
    try {
      // Fetch full details from API
      this.loading = true;
      
      // Determine ID and source
      const entityId = sanction.source === 'UN' 
        ? sanction.dataid 
        : (sanction.id || sanction.uid);
      const source = sanction.source || 'OFAC';
      
      console.log('👁️ [CHAT] Fetching entity:', entityId, 'from', source);
      const fullDetails = await this.chatService.getEntityDetails(entityId, source);
      console.log('✅ [CHAT] Full details fetched:', fullDetails);
      
      // Emit event to parent component to open the details modal
      this.viewDetailsRequested.emit(fullDetails);
      this.loading = false;
    } catch (error) {
      console.error('❌ [CHAT] Error fetching details:', error);
      this.loading = false;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Utilities
  // ═══════════════════════════════════════════════════════════════
  
  formatTimestamp(date: Date): string {
    return new Date(date).toLocaleTimeString(this.currentLang === 'ar' ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  scrollToBottom(): void {
    setTimeout(() => {
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }
}

