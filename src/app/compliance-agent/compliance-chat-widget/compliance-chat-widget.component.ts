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
  @Output() taskListRefreshRequested = new EventEmitter<void>();
  
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
    
    // Don't add user selection message - reduces chat clutter
    
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
      
      // 📊 DETAILED LOGGING FOR DEBUGGING
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 [WIDGET DEBUG] FINAL AI SEARCH RESULT');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎯 Search Query:', companyName);
      console.log('✅ Has Match:', aiAnalysis.hasMatch);
      console.log('📊 Total Results:', aiAnalysis.totalResults);
      console.log('⚠️ Risk Level:', aiAnalysis.riskLevel);
      console.log('🎯 Confidence:', aiAnalysis.confidence);
      console.log('💡 Recommendation:', aiAnalysis.recommendation);
      console.log('📝 Explanation Length:', aiAnalysis.explanation?.length || 0);
      console.log('🔧 Source:', aiAnalysis.source);
      console.log('');
      
      if (aiAnalysis.results && aiAnalysis.results.length > 0) {
        console.log('📋 RESULTS BREAKDOWN:');
        aiAnalysis.results.forEach((res: any, i: number) => {
          console.log(`${i + 1}. ${res.name}`);
          console.log(`   Confidence: ${res.confidence}%`);
          console.log(`   Risk: ${res.riskLevel}`);
          console.log(`   Country: ${res.country}`);
          console.log('');
        });
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      console.log('🤖 [COMPONENT] AI Analysis:', aiAnalysis);
      
      // Use the new smart AI analysis message with isManualSearch = true
      this.chatService.addAIAnalysisMessage(aiAnalysis, true);
      
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
        
      case 'select_request':
        console.log('📄 [SMART] Request selected:', value);
        await this.handleRequestSelected(value);
        setTimeout(() => this.scrollToBottom(), 100);
        break;
        
      case 'select_golden':
        console.log('⭐ [SMART] Golden record selected:', value);
        await this.handleGoldenSelected(value);
        setTimeout(() => this.scrollToBottom(), 100);
        break;
        
      case 'approve_request':
        console.log('✅ [SMART] Approving request:', value);
        await this.handleApprove(value);
        setTimeout(() => this.scrollToBottom(), 100);
        break;
        
      case 'block_request':
        console.log('🚫 [SMART] Blocking request:', value);
        await this.handleBlock(value);
        setTimeout(() => this.scrollToBottom(), 100);
        break;
        
      case 'bulk_approve':
        console.log('✅ [SMART] Bulk approving requests:', value);
        await this.handleBulkApprove(value);
        setTimeout(() => this.scrollToBottom(), 100);
        break;
        
      case 'toggle_expand':
        console.log('🔽 [SMART] Toggling expand for message:', value);
        this.toggleMessageExpand(value);
        break;
        
      case 'confirm_block':
        console.log('🚫 [SMART] Confirming block:', value);
        await this.handleConfirmBlock(value);
        setTimeout(() => this.scrollToBottom(), 100);
        break;
        
      case 'view_sanction_details':
        console.log('📋 [SMART] Viewing sanction details:', value);
        await this.viewSanctionDetailsById(value);
        break;
    }
  }
  
  private resetChat(): void {
    // Reset to welcome state
    this.chatService.clearMessages();
    this.chatService.sendWelcomeMessage();
  }
  
  private toggleMessageExpand(messageId: string): void {
    this.chatService.toggleExpand(messageId);
  }
  
  
  private async handleRequestSelected(requestId: string): Promise<void> {
    this.chatService.setLoading(true);
    
    try {
      // Fetch request details
      const request = await this.chatService.fetchRequestDetails(requestId);
      this.currentRequest = request;
      
      console.log('📄 [REQUEST] Selected:', request.firstName, request.country);
      
      // Use the same quick risk check that was already done
      const riskCheck = await this.chatService.quickRiskCheck(request.firstName, request.country);
      
      console.log('🔍 [RISK CHECK] Result:', riskCheck);
      
      // If match found, use the sanction data from risk check
      if (riskCheck.hasMatch && riskCheck.sanctionData) {
        console.log('📋 [REQUEST] Match found, opening modal...');
        
        // Fetch full details using the sanction ID
        const fullDetails = await this.chatService.getEntityDetails(riskCheck.sanctionData.id);
        
        // Add match info and requestId for blocking
        fullDetails.confidence = 95;
        fullDetails.matchReason = `Exact match found in sanctions database`;
        fullDetails.requestId = requestId;
        
        // Open modal with sanction details
        this.viewDetailsRequested.emit(fullDetails);
        
        // Show actions in chat
        this.chatService.addMessage({
          id: `match_action_${Date.now()}`,
          role: 'assistant',
          content: this.t(
            `🚨 **تطابق مكتشف!**\n\n**${riskCheck.sanctionData.name}**\n${riskCheck.sanctionData.country} • ${riskCheck.sanctionData.riskLevel}`,
            `🚨 **Match Found!**\n\n**${riskCheck.sanctionData.name}**\n${riskCheck.sanctionData.country} • ${riskCheck.sanctionData.riskLevel}`
          ),
          timestamp: new Date(),
          type: 'text',
          buttons: [
            {
              text: this.t('🚫 حظر الشركة', '🚫 Block Company'),
              action: 'confirm_block',
              value: { requestId, sanction: riskCheck.sanctionData },
              style: 'danger'
            },
            {
              text: this.t('✅ الموافقة رغم التطابق', '✅ Approve Anyway'),
              action: 'approve_request',
              value: requestId,
              style: 'warning'
            }
          ]
        });
        
      } else {
        // No match - safe to approve
        this.chatService.addMessage({
          id: `safe_${Date.now()}`,
          role: 'assistant',
          content: this.t(
            `✅ **آمن للموافقة**\n\nلا توجد عقوبات على "${request.firstName}"`,
            `✅ **Safe to Approve**\n\nNo sanctions found for "${request.firstName}"`
          ),
          timestamp: new Date(),
          type: 'text',
          buttons: [
            {
              text: this.t('✅ الموافقة', '✅ Approve'),
              action: 'approve_request',
              value: requestId,
              style: 'success'
            }
          ]
        });
      }
      
    } catch (error) {
      console.error('❌ [REQUEST] Error:', error);
      this.chatService.addMessage({
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: this.t('❌ **حدث خطأ**', '❌ **Error occurred**'),
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
    
    // Skip "AI analyzing" message - go directly to results
    // This makes the flow faster and cleaner
    
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
    
    try {
      await this.chatService.approveRequest(requestId);
      
      // Remove from messages list
      this.chatService.removeRequestFromMessages(requestId);
      
      // Trigger task list refresh
      this.taskListRefreshRequested.emit();
      
      this.chatService.addMessage({
        id: `approved_${Date.now()}`,
        role: 'assistant',
        content: this.t(
          '✅ **تمت الموافقة!**',
          '✅ **Approved!**'
        ),
        timestamp: new Date(),
        type: 'text'
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
  
  private async handleConfirmBlock(data: { requestId: string, sanction: any }): Promise<void> {
    this.chatService.setLoading(true);
    
    try {
      const { requestId, sanction } = data;
      
      const blockReason = this.t(
        `تطابق في قاعدة البيانات (${sanction.confidence || 95}%)\nالشركة: ${sanction.name}`,
        `Database match (${sanction.confidence || 95}%)\nCompany: ${sanction.name}`
      );
      
      await this.chatService.blockRequest(requestId, blockReason, {
        entityId: sanction.id,
        companyName: sanction.name,
        matchConfidence: sanction.confidence || 95,
        source: 'Local Database',
        country: sanction.country,
        sector: sanction.sector,
        riskLevel: sanction.riskLevel
      });
      
      // Remove from messages list
      this.chatService.removeRequestFromMessages(requestId);
      
      // Trigger task list refresh
      this.taskListRefreshRequested.emit();
      
      this.chatService.addMessage({
        id: `blocked_${Date.now()}`,
        role: 'assistant',
        content: this.t(
          `🚫 **تم الحظر!**`,
          `🚫 **Blocked!**`
        ),
        timestamp: new Date(),
        type: 'text'
      });
      
    } catch (error) {
      console.error('❌ Block error:', error);
      this.chatService.addMessage({
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: this.t(
          '❌ **فشل الحظر**',
          '❌ **Block failed**'
        ),
        timestamp: new Date(),
        type: 'text'
      });
    }
    
    this.chatService.setLoading(false);
  }

  private async handleBulkApprove(requestIds: string[]): Promise<void> {
    this.chatService.setLoading(true);
    
    this.chatService.addMessage({
      id: `bulk_approving_${Date.now()}`,
      role: 'assistant',
      content: this.t(
        `⏳ جاري الموافقة على ${requestIds.length} طلب...`,
        `⏳ Approving ${requestIds.length} requests...`
      ),
      timestamp: new Date(),
      type: 'text'
    });
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      // Approve all requests
      for (const requestId of requestIds) {
        try {
          await this.chatService.approveRequest(requestId);
          // Remove from messages list
          this.chatService.removeRequestFromMessages(requestId);
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to approve ${requestId}:`, error);
          failCount++;
        }
      }
      
      // Trigger task list refresh after bulk approve
      this.taskListRefreshRequested.emit();
      
      this.chatService.addMessage({
        id: `bulk_approved_${Date.now()}`,
        role: 'assistant',
        content: this.t(
          `✅ **تمت الموافقة بنجاح!**\n\n• تمت الموافقة: ${successCount}\n${failCount > 0 ? `• فشل: ${failCount}` : ''}`,
          `✅ **Bulk Approval Complete!**\n\n• Approved: ${successCount}\n${failCount > 0 ? `• Failed: ${failCount}` : ''}`
        ),
        timestamp: new Date(),
        type: 'text',
        buttons: [
          {
            text: this.t('↩️ العودة للقائمة', '↩️ Back to Menu'),
            action: 'back_to_menu',
            style: 'secondary'
          }
        ]
      });
      
    } catch (error) {
      console.error('❌ Bulk approve error:', error);
      this.chatService.addMessage({
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: this.t(
          '❌ **حدث خطأ في الموافقة الجماعية**',
          '❌ **Bulk approval failed**'
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
      
      // Remove from messages list
      this.chatService.removeRequestFromMessages(requestId);
      
      this.chatService.addMessage({
        id: `blocked_${Date.now()}`,
        role: 'assistant',
        content: this.t(
          `🚫 **تم الحظر!**`,
          `🚫 **Blocked!**`
        ),
        timestamp: new Date(),
        type: 'text'
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
  
  // Helper functions for choice cards
  getButtonIcon(action: string): string {
    const icons: { [key: string]: string } = {
      'review_requests': 'file-search',
      'review_golden': 'database',
      'manual_review': 'search',
      'select_request': 'file',
      'select_golden': 'star',
      'approve_request': 'check-circle',
      'block_request': 'stop',
      'confirm_block': 'stop',
      'bulk_approve': 'check-square',
      'toggle_expand': 'down',
      'view_sanction_details': 'eye',
      'back_to_menu': 'rollback'
    };
    return icons[action] || 'right';
  }

  getButtonTitle(text: string): string {
    // Extract title from button text (first line)
    const lines = text.split('\n');
    return lines[0].replace(/[📋✉️⭐🔍🔎]/g, '').trim();
  }

  getButtonSubtitle(text: string): string {
    // Extract subtitle from button text (second line if exists)
    const lines = text.split('\n');
    return lines.length > 1 ? lines[1].trim() : '';
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
  
  async viewSanctionDetailsById(sanctionId: string | number): Promise<void> {
    console.log('📋 [DETAILS] Fetching sanction details for ID:', sanctionId);
    
    try {
      this.loading = true;
      const fullDetails = await this.chatService.getEntityDetails(sanctionId);
      console.log('✅ [DETAILS] Full details fetched:', fullDetails);
      
      // Emit to parent to open modal
      this.viewDetailsRequested.emit(fullDetails);
      this.loading = false;
    } catch (error) {
      console.error('❌ [DETAILS] Error:', error);
      this.loading = false;
    }
  }

  async viewSanctionDetails(sanction: any): Promise<void> {
    console.log('👁️ [CHAT] View details requested for:', sanction);
    
    try {
      // Fetch full details from API
      this.loading = true;
      
      // Determine ID and source
      const entityId = sanction.source === 'UN' 
        ? sanction.dataid 
        : (sanction.id || sanction.uid);
      const source = sanction.source || 'Local Database';
      
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

