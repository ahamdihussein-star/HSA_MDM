import { Component, ViewChild, ElementRef, AfterViewChecked, ViewEncapsulation, OnInit, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { AiService } from '../services/ai.service';
import { SimpleAiService } from '../services/simple-ai.service';
import { AnalyticalBotService, AnalyticalResponse } from '../services/analytical-bot.service';


interface ChatMessage { 
  from: 'bot' | 'user'; 
  text: string; 
  dropdownOptions?: DropdownOption[];
  isDropdown?: boolean;
  buttons?: ButtonOption[];
  isButtons?: boolean;
  showDocumentForm?: boolean;
}

interface ButtonOption {
  text: string;
  value: string;
  type: 'yes' | 'no' | 'skip';
}

interface DropdownOption {
  value: string;
  label: string;
  id: number;
}

interface CustomerRecord { [k: string]: string | File; }

@Component({
  selector: 'app-ai-assistant',
  templateUrl: './ai-assistant.component.html',
  styleUrls: ['./ai-assistant.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AiAssistantComponent implements AfterViewChecked, OnInit {

  /* ───────── API & User Management ───────── */
  private apiBase = environment.apiBaseUrl || 'http://localhost:3000/api';
  currentUser: any = null;
  userRole: string = '';
  isChatOpen = false;

  /* ───────── اللغة & القاموس ───────── */
  private lang: 'en' | 'ar' = 'ar';
  private dict: { [k: string]: string } = {};

  /* ───────── الشات & الرسائل ───────── */
  @ViewChild('chatContainer') chatContainer!: ElementRef;
  messages: ChatMessage[] = [];
  currentInput = '';
  isAiProcessing = false;
  isDropdownOpen = false;

  /* ───────── File Upload State ───────── */
  awaitingFile = false;
  currentFile: File | null = null;
  isDragOver: boolean = false;
  selectedDropdownValue: string = '';

  /* ───────── AI Service ───────── */
  constructor(
    private router: Router,
    private http: HttpClient,
    private aiService: AiService,
    private simpleAiService: SimpleAiService,
    private analyticalBotService: AnalyticalBotService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.initializeUser();
    this.loadLanguage();
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeChat();
    }
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  /* ───── User Management ───── */
  private initializeUser(): void {
    const username = sessionStorage.getItem('username');
    const userRole = sessionStorage.getItem('userRole');
    this.currentUser = { username, userRole };
  }

  /* ───── Language Management ───── */
  private loadLanguage(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Don't set language here - let header component handle it
      this.loadDictionary();
    }
  }

  private loadDictionary(): void {
    this.dict = {
      'Welcome': this.lang === 'ar' ? 'مرحباً! أنا مساعدك الذكي لتحليل البيانات والإحصائيات. يمكنني مساعدتك في:\n\n📊 إحصائيات عامة عن قاعدة البيانات\n📈 تحليل توزيع العملاء\n🔍 مقارنات بين المناطق\n📅 اتجاهات النمو\n\nما الذي تريد معرفته عن بياناتك؟' : 'Welcome! I\'m your AI assistant for data analysis and statistics. How can I help you today?',
      'WriteSomething': this.lang === 'ar' ? 'اكتب رسالة...' : 'Write a message...',
      'UploadPrompt': this.lang === 'ar' ? 'اسحب الملف هنا أو اضغط لاختياره' : 'Drag file here or click to select',
      'UploadHint': this.lang === 'ar' ? 'الملفات المسموحة: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG' : 'Allowed files: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG',
      'SelectFile': this.lang === 'ar' ? 'اختيار ملف' : 'Select File',
      'Cancel': this.lang === 'ar' ? 'إلغاء' : 'Cancel',
      'InvalidFileType': this.lang === 'ar' ? 'نوع الملف غير مدعوم. يرجى اختيار ملف من الأنواع المسموحة.' : 'File type not supported. Please select a file from allowed types.',
      'FileTooLarge': this.lang === 'ar' ? 'الملف كبير جداً. الحد الأقصى 10 ميجابايت.' : 'File too large. Maximum 10MB.',
      'CreateDone': this.lang === 'ar' ? 'تم إنشاء طلب العميل بنجاح!' : 'Customer request created successfully!'
    };
  }

  t(key: string): string {
    return this.dict[key] || key;
  }

  /* ───── Chat Management ───── */
  private initializeChat(): void {
    this.bot(this.t('Welcome'));
  }

  private scrollToBottom(): void {
    if (this.chatContainer) {
      const element = this.chatContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  private focusInput(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Try multiple selectors to find the input, prioritizing the chat input
      const selectors = [
        '.text-input-area input',  // Most specific - the chat input
        'input[type="text"]',
        'input[type="search"]', 
        'input:not([type])',
        '.chat-input input',
        '#chatInput',
        'input'
      ];
      
      let input: HTMLInputElement | null = null;
      for (const selector of selectors) {
        input = document.querySelector(selector) as HTMLInputElement;
        if (input) {
          break;
        }
      }
      
      if (input) {
        // Use setTimeout to ensure the DOM is ready
        setTimeout(() => {
          input!.focus();
          input!.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }

  /* ───── Message Handling ───── */
  private user(txt: string) {
    this.messages.push({ from: 'user', text: txt });
  }

  private bot(txt: string, dropdownOptions?: DropdownOption[], buttons?: ButtonOption[], showDocumentForm?: boolean) { 
    // Sanitize dropdown options and buttons to prevent empty renders
    const safeDropdown = Array.isArray(dropdownOptions) ? dropdownOptions.filter(opt => !!opt && !!opt.label && !!opt.value) : undefined;
    const safeButtons = Array.isArray(buttons) ? buttons.filter(btn => !!btn && typeof btn.text === 'string' && btn.text.trim() !== '' && typeof btn.value === 'string' && btn.value.trim() !== '') : undefined;

    this.messages.push({
      from: 'bot',
      text: txt,
      dropdownOptions: safeDropdown,
      isDropdown: !!(safeDropdown && safeDropdown.length > 0),
      buttons: safeButtons,
      isButtons: !!(safeButtons && safeButtons.length > 0),
      showDocumentForm: !!showDocumentForm
    });

    // Track dropdown state
    this.isDropdownOpen = !!(safeDropdown && safeDropdown.length > 0);
  }

  /* ───── Button Handling ───── */
  onButtonClick(value: string, type: 'yes' | 'no' | 'skip'): void {
    // Add user message to chat
    this.user(value);

    // Send the button value to AI
    this.handleWithAI(value);

    // Focus back on input after button click
    setTimeout(() => {
      this.focusInput();
    }, 100);
  }

  /* ───── Dropdown Handling ───── */
  onDropdownChange(event: Event, message: ChatMessage): void {
    const select = event.target as HTMLSelectElement;
    const selectedValue = select.value;

    if (selectedValue) {
      // Add user message to chat
      this.user(selectedValue);

      // Send the selected value to AI
      this.handleWithAI(selectedValue);

      // Focus back on input after dropdown selection
      setTimeout(() => {
        this.focusInput();
      }, 100);
    }
  }

  /* ───── AI Processing ───── */
  async handleWithAI(message: string): Promise<void> {
    if (this.isAiProcessing) {
      return;
    }

    this.isAiProcessing = true;

    try {
      // Check if this is an analytical query
      if (this.isAnalyticalQuery(message)) {
        console.log('🧠 Processing analytical query...');
        const response = await this.analyticalBotService.processAnalyticalQuery(message);
        
        // Display analytical response
        this.bot(response.message);
        
        // Display chart if available
        if (response.chart) {
          this.displayChart(response.chart);
        }
        
        // Display insights if available
        if (response.insights && response.insights.length > 0) {
          this.displayInsights(response.insights);
        }
      } else {
        // Use SimpleAiService for customer creation
        const aiResponse = await this.simpleAiService.processMessage(message);
        this.bot(aiResponse.message, aiResponse.dropdown, aiResponse.buttons, aiResponse.showUpload);
      }

    } catch (error) {
      console.error('🤖 ERROR in AI processing:', error);
      this.bot(this.lang === 'ar' ? 'عذراً، حدث خطأ في المعالجة. يرجى المحاولة مرة أخرى.' : 'Sorry, an error occurred during processing. Please try again.');
    } finally {
      this.isAiProcessing = false;
      
      setTimeout(() => {
        this.scrollToBottom();
        this.focusInput();
      }, 300);
    }
  }

  // Check if the message is an analytical query
  private isAnalyticalQuery(message: string): boolean {
    const analyticalKeywords = [
      'كم', 'عدد', 'أكثر', 'أقل', 'متوسط', 'توزيع', 'نسبة',
      'مقارنة', 'اتجاه', 'تطور', 'إحصائيات', 'تحليل', 'احصاءيات',
      'احصائيات', 'عامه', 'عامة', 'بيانات', 'قاعدة', 'database',
      'count', 'how many', 'most', 'least', 'average', 'distribution',
      'comparison', 'trend', 'statistics', 'analysis', 'general'
    ];
    
    const msg = message.toLowerCase();
    const isAnalytical = analyticalKeywords.some(keyword => msg.includes(keyword));
    
    console.log('🔍 Checking if analytical query:', message);
    console.log('🔍 Keywords found:', analyticalKeywords.filter(keyword => msg.includes(keyword)));
    console.log('🔍 Is analytical:', isAnalytical);
    
    return isAnalytical;
  }

  // Display chart data
  private displayChart(chart: any): void {
    const chartMessage = `📊 **${chart.title}**\n\nالبيانات:\n${JSON.stringify(chart.data, null, 2)}`;
    this.bot(chartMessage);
  }

  // Display insights
  private displayInsights(insights: string[]): void {
    let insightsMessage = '💡 **رؤى مهمة:**\n\n';
    insights.forEach((insight, index) => {
      insightsMessage += `${index + 1}. ${insight}\n`;
    });
    this.bot(insightsMessage);
  }

  /* ───── Send Message ───── */
  async send(): Promise<void> {
    if (!this.currentInput.trim() || this.isAiProcessing) {
      return;
    }

    const message = this.currentInput.trim();
    this.currentInput = '';

    // Add user message to chat
    this.user(message);

    // Process with AI
    await this.handleWithAI(message);
  }

  /* ───── File Upload Functions ───── */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileUpload(files[0]);
    }
  }

  openFilePicker(): void {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileUpload(input.files[0]);
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private handleFileUpload(file: File): void {
    // Validate file type
    if (!this.isValidFileType(file)) {
      this.bot(this.t('InvalidFileType'));
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.bot(this.t('FileTooLarge'));
      return;
    }

    // Store the file
    this.currentFile = file;

    // Show success message
    const successMessage = this.lang === 'ar' 
      ? `ممتاز! تم رفع الملف: ${file.name} (${this.formatFileSize(file.size)})`
      : `Great! File uploaded: ${file.name} (${this.formatFileSize(file.size)})`;
    
    this.bot(successMessage);

    // Continue with the next step
    this.awaitingFile = false;
  }

  private isValidFileType(file: File): boolean {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ];
    return allowedTypes.includes(file.type);
  }

  /* ───── Utility Functions ───── */
  getFileAcceptTypes(): string {
    return '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png';
  }

  cancelUpload(): void {
    this.awaitingFile = false;
    this.currentFile = null;
  }

  /* ───── Navigation ───── */
  goToNewRequest(): void {
    this.router.navigate(['/new-request']);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  toggleChat(): void {
    this.isChatOpen = !this.isChatOpen;
  }

  closeChat(): void {
    this.isChatOpen = false;
  }

  // Helper method to get current collected data for logging
  private getCurrentCollectedData(): any {
    // This method will be used for logging - we'll get data from AI service
    return this.aiService ? this.aiService['extractCustomerDataFromConversation']() : {};
  }

  // Get question statistics for debugging
  public getQuestionStatistics(): { [key: string]: number } {
    return this.aiService ? this.aiService.getQuestionStats() : {};
  }
}