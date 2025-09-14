
import { Component, ViewChild, ElementRef, AfterViewChecked, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';


interface ChatMessage { from: 'bot' | 'user'; text: string; }
interface CustomerRecord { [k: string]: string | File; }

@Component({
  selector: 'app-ai-assistant',
  templateUrl: './ai-assistant.component.html',
  styleUrls: ['./ai-assistant.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AiAssistantComponent implements AfterViewChecked {

  /* ───────── اللغة & القاموس ───────── */
  private lang: 'en' | 'ar' =
    (localStorage.getItem('lang') as 'ar' | 'en') || 'en';

  private dict: Record<'en' | 'ar', Record<string, string>> = {
    en: {
      BotGreeting: `Hello Essam! I’m Rashed, the HSA Group Master-Data Bot. I can create a new customer or update an existing one. Type “create customer” or “update customer” to get started.`,
      SayCreateOrUpdate: `Type "create customer" or "update customer" to begin.`,
      AskCompanyName: `What's the customer's company name?`,
      AskAddress: `What's the street address?`,
      AskCity: `Which city?`,
      AskCountry: `Which country?`,
      AskTaxNumber: `What's the tax/VAT number?`,
      AskContactName: `Contact person name?`,
      AskJobTitle: `Job title (optional):`,
      AskEmail: `Email address:`,
      AskMobile: `Mobile number:`,
      AskLandline: `Land-line (optional):`,
      AskPreferredLang: `Preferred language (EN/AR):`,
      AskSalesOrg: `Sales-ORG code?`,
      AskDistributionChannel: `Distribution channel?`,
      AskDivision: `Division?`,
      AskCommercialDoc: `📑 Upload Commercial Registration document.`,
      AskTaxDoc: `📑 Upload Tax Certificate document.`,
      CreateDone: `Customer record has been sent for review`,
      UpdateDone: `Update has been sent for review`,
      AskCustomerId: `Enter customer ID to update.`,
      DocOrField: `Do you want to update a **document** or a normal **field**?`,
      WhichDocument: `Which document?\n1) Commercial Registration\n2) Tax Certificate`,
      WhichField: `Field key to change?`,
      PleaseTypeDocOrField: `Please type "document" or "field".`,
      ChooseOneOrTwo: `Please choose 1 or 2.`,
      KeyNotRecognized: `Field key not recognised.`,
      EnterNewValue: `Enter new value for {{key}}:`,
      UpdatedAnother: `Updated. Another field? (yes/no)`,
      IdNotFound: `ID not found.`,
      AttachedTo: `attached to`,
    },
    ar: {
      BotGreeting: `مرحبًا بك يا عصام، أنا راشد روبوت مجموعة هايل سعيد لإدارة البيانات. أستطيع إنشاء عميل جديد أو تحديث عميل موجود. اكتب "إنشاء عميل" أو "تحديث عميل" للبدء.`,
      SayCreateOrUpdate: `اكتب "إنشاء عميل" أو "تحديث عميل" للبدء.`,
      AskCompanyName: `ما اسم الشركة؟`,
      AskAddress: `ما عنوان الشارع؟`,
      AskCity: `أي مدينة؟`,
      AskCountry: `أي دولة؟`,
      AskTaxNumber: `ما رقم التسجيل الضريبي/القيمة المضافة؟`,
      AskContactName: `اسم جهة الاتصال؟`,
      AskJobTitle: `المسمى الوظيفي (اختياري):`,
      AskEmail: `البريد الإلكتروني:`,
      AskMobile: `رقم الجوال:`,
      AskLandline: `الهاتف الأرضي (اختياري):`,
      AskPreferredLang: `اللغة المفضلة (AR/EN):`,
      AskSalesOrg: `كود Sales-ORG؟`,
      AskDistributionChannel: `قناة التوزيع؟`,
      AskDivision: `القسم؟`,
      AskCommercialDoc: `📑 ارفع السجل التجاري.`,
      AskTaxDoc: `📑 ارفع شهادة الضريبة/القيمة المضافة.`,
      CreateDone: `تم إرسال طلب إنشاء العميل للمراجعة.`,
      UpdateDone: `تم إرسال التحديث للمراجعة.`,
      AskCustomerId: `أدخل رقم العميل للتحديث.`,
      DocOrField: `هل تريد تحديث **مستند** أم **حقل**؟`,
      WhichDocument: `أي مستند؟\n1) سجل تجاري\n2) شهادة ضريبية`,
      WhichField: `ما اسم الحقل المراد تعديله؟`,
      PleaseTypeDocOrField: `اكتب "مستند" أو "حقل".`,
      ChooseOneOrTwo: `اختر 1 أو 2.`,
      KeyNotRecognized: `اسم الحقل غير معروف.`,
      EnterNewValue: `أدخل القيمة الجديدة لـ {{key}}:`,
      UpdatedAnother: `تم التحديث. حقل آخر؟ (نعم/لا)`,
      IdNotFound: `لم يتم العثور على هذا الرقم.`,
      AttachedTo: `أُرفق مع`,
    }
  };

  private t(key: string, p: Record<string, string> = {}): string {
    let txt = this.dict[this.lang][key] || key;
    Object.entries(p).forEach(([k, v]) => txt = txt.replace(`{{${k}}}`, v));
    return txt;
  }

  /* ───────── التحكم فى إظهار الشات ───────── */
  isChatOpen = false;
  toggleChat() { this.isChatOpen = !this.isChatOpen; }

  /* ───── DOM refs ───── */
  @ViewChild('chatContainer') chat!: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput', { static: true }) file!: ElementRef<HTMLInputElement>;

  /* ───── Chat state ───── */
  messages: ChatMessage[] = [];
  currentInput = '';

  mode: 'idle' | 'create' | 'update' = 'idle';
  step = -1;

  /* Update-flow flags */
  awaitingId = false;
  askDocOrField = false;
  awaitingDocChoice = false;
  awaitingField = false;
  awaitingFile = false;
  awaitingYesNo = false;

  updateKey = '';
  customerId = '';
  customer: CustomerRecord = {};

  /* ───── Fields ───── */
  readonly fields = [
    { key: 'companyName', labelKey: 'AskCompanyName' },
    { key: 'address', labelKey: 'AskAddress' },
    { key: 'city', labelKey: 'AskCity' },
    { key: 'country', labelKey: 'AskCountry' },
    { key: 'taxNumber', labelKey: 'AskTaxNumber' },
    { key: 'contactName', labelKey: 'AskContactName' },
    { key: 'jobTitle', labelKey: 'AskJobTitle' },
    { key: 'emailAddress', labelKey: 'AskEmail' },
    { key: 'mobileNumber', labelKey: 'AskMobile' },
    { key: 'landline', labelKey: 'AskLandline' },
    { key: 'preferredLanguage', labelKey: 'AskPreferredLang' },
    { key: 'salesOrg', labelKey: 'AskSalesOrg' },
    { key: 'distributionChannel', labelKey: 'AskDistributionChannel' },
    { key: 'division', labelKey: 'AskDivision' },
    { key: 'commercialDoc', labelKey: 'AskCommercialDoc' },
    { key: 'taxCertificateDoc', labelKey: 'AskTaxDoc' },
  ];

  /* ───── مرادفات ───── */
  readonly alias: Record<string, string> = {
    /* EN */
    'company name': 'companyName', 'address': 'address', 'city': 'city', 'country': 'country',
    'tax number': 'taxNumber', 'tax': 'taxNumber', 'contact name': 'contactName', 'job title': 'jobTitle',
    'email': 'emailAddress', 'email address': 'emailAddress', 'mobile': 'mobileNumber',
    'mobile number': 'mobileNumber', 'landline': 'landline', 'preferred language': 'preferredLanguage',
    'sales org': 'salesOrg', 'distribution channel': 'distributionChannel', 'division': 'division',
    'commercial document': 'commercialDoc', 'commercial registration': 'commercialDoc',
    'tax certificate': 'taxCertificateDoc',
    /* AR */
    'اسم الشركة': 'companyName', 'العنوان': 'address', 'المدينة': 'city', 'الدولة': 'country',
    'رقم الضريبة': 'taxNumber', 'الضريبة': 'taxNumber', 'اسم جهة الاتصال': 'contactName',
    'المسمى الوظيفي': 'jobTitle', 'البريد الإلكتروني': 'emailAddress', 'جوال': 'mobileNumber',
    'هاتف أرضي': 'landline', 'اللغة المفضلة': 'preferredLanguage', 'سيلز أورج': 'salesOrg',
    'قناة التوزيع': 'distributionChannel', 'القسم': 'division', 'سجل تجاري': 'commercialDoc',
    'شهادة ضريبية': 'taxCertificateDoc'
  };

  /* Mock DB */
  db: Record<string, CustomerRecord> = {
    '1001': {
      companyName: 'Acme Inc.', address: '123 Demo St', city: 'Cairo',
      country: 'Egypt', taxNumber: 'EG123456', emailAddress: 'info@acme.com',
      commercialDoc: 'CR_Acme.pdf', taxCertificateDoc: 'VAT_Acme.pdf'
    }
  };

  constructor(public router: Router) { this.bot(this.t('BotGreeting')); }

  ngAfterViewChecked() {
    try {
      this.chat.nativeElement.scrollTop = this.chat.nativeElement.scrollHeight;
    } catch { }
  }

  private bot(txt: string) { this.messages.push({ from: 'bot', text: txt }); }
  private user(txt: string) { this.messages.push({ from: 'user', text: txt }); }

  /* ───── SEND ───── */
  send() {
    if (this.awaitingFile) return;                    // لا تستقبل أمر أثناء انتظار ملف
    const txt = this.currentInput.trim();
    if (!txt) return;
    this.user(txt);

    if (this.mode === 'idle') this.handleIdle(txt);
    else if (this.mode === 'create') this.handleCreate(txt);
    else this.handleUpdate(txt);

    this.currentInput = '';
  }

  /* ───── Idle ───── */
  private handleIdle(t: string) {
    if (/create customer/i.test(t) || /إنشاء عميل/.test(t)) {
      this.mode = 'create'; this.step = 0;
      this.bot(this.t(this.fields[0].labelKey));
    } else if (/update customer/i.test(t) || /تحديث عميل/.test(t)) {
      this.mode = 'update'; this.awaitingId = true;
      this.bot(this.t('AskCustomerId'));
    } else {
      this.bot(this.t('SayCreateOrUpdate'));
    }
  }

  /* ───── Create ───── */
  private handleCreate(val: string) {
    const field = this.fields[this.step];
    if (field.key.endsWith('Doc')) {
      this.awaitingFile = true;
      this.openFile(field.key);
      return;
    }
    this.customer[field.key] = val;
    this.step++;
    this.step < this.fields.length
      ? this.bot(this.t(this.fields[this.step].labelKey))
      : this.finish(this.t('CreateDone'));
  }

  /* ───── Update ───── */
  private handleUpdate(input: string) {
    const lower = input.toLowerCase().trim();

    /* 1) ID */
    if (this.awaitingId) {
      const rec = this.db[input];
      if (!rec) { this.bot(this.t('IdNotFound')); return this.reset(); }
      this.customerId = input; this.customer = { ...rec };
      this.awaitingId = false; this.askDocOrField = true;
      return this.bot(this.t('DocOrField'));
    }

    /* 2) choose document OR field */
    if (this.askDocOrField) {
      if (/(document|مستند)/i.test(lower)) {
        this.askDocOrField = false; this.awaitingDocChoice = true;
        return this.bot(this.t('WhichDocument'));
      }
      if (/(field|حقل)/i.test(lower)) {
        this.askDocOrField = false; this.awaitingField = true;
        return this.bot(this.t('WhichField'));
      }
      return this.bot(this.t('PleaseTypeDocOrField'));
    }

    /* 3) document choice */
    if (this.awaitingDocChoice) {
      const key = input.trim() === '1' ? 'commercialDoc'
        : input.trim() === '2' ? 'taxCertificateDoc' : null;
      if (!key) return this.bot(this.t('ChooseOneOrTwo'));
      this.awaitingDocChoice = false; this.awaitingFile = true; this.openFile(key); return;
    }

    /* 4) field key */
    if (this.awaitingField) {
      const key = (this.alias[lower] ?? input).trim();
      const ok = this.fields.some(f => f.key.toLowerCase() === key.toLowerCase());
      if (!ok) return this.bot(this.t('KeyNotRecognized'));
      this.updateKey = key; this.awaitingField = false;
      if (key.endsWith('Doc')) {
        this.awaitingFile = true; this.openFile(key);
      } else {
        this.bot(this.t('EnterNewValue', { key }));
      }
      return;
    }

    /* 5) new value */
    if (this.updateKey) {
      this.customer[this.updateKey] = input;
      this.updateKey = ''; this.awaitingYesNo = true;
      return this.bot(this.t('UpdatedAnother'));
    }

    /* 6) yes/no */
    if (this.awaitingYesNo) {
      if (/^(y|yes|نعم)/i.test(input)) {
        this.awaitingYesNo = false; this.askDocOrField = true;
        this.bot(this.t('DocOrField'));
      } else {
        this.finish(this.t('UpdateDone'));
      }
    }
  }

  /* ───── File helpers ───── */
  private openFile(key: string) {
    this.awaitingField = false;
    const input = this.file.nativeElement;
    input.dataset['fieldKey'] = key;
    setTimeout(() => input.click(), 0);    // يمنح المتصفح فرصة لتعيين data-attr
  }

  onFileSelected(ev: Event) {
    const inp = ev.target as HTMLInputElement;
    const f = inp.files?.[0];
    const key = inp.dataset['fieldKey']!;
    if (f) {
      this.customer[key] = f.name;
      this.bot(`📎 ${f.name} ${this.t('AttachedTo')} ${key}`);
    }
    this.awaitingFile = false;
    inp.value = ''; delete inp.dataset['fieldKey'];

    if (this.mode === 'create') {
      this.step++;
      this.step < this.fields.length
        ? this.bot(this.t(this.fields[this.step].labelKey))
        : this.finish(this.t('CreateDone'));
    } else {
      this.awaitingYesNo = true;
      this.bot(this.t('UpdatedAnother'));
    }
  }

  /* ───── finish + reset ───── */
  private finish(msg: string) {
    this.bot(`✅ ${msg}.`);
    console.table(this.customer);
    this.reset();
  }
  private reset() {
    this.mode = 'idle'; this.step = -1;
    this.awaitingId = this.askDocOrField = this.awaitingDocChoice =
      this.awaitingField = this.awaitingFile = this.awaitingYesNo = false;
    this.customerId = ''; this.updateKey = ''; this.customer = {};
  }


  /** ====== AUTO-ADDED NAV HELPERS ====== */
  private getRowId(row: any): string {
    return ((row?.requestId ?? row?.id ?? row?.key ?? row?.RequestId ?? '') + '');
  }

  /** Open details page; editable=true opens edit mode, false opens view */
  viewOrEditRequest(row: any, editable: boolean): void {
    const id = this.getRowId(row);
    if (!id) return;
    this.router?.navigate(['/new-request', id], {
      queryParams: { mode: editable ? 'edit' : 'view' },
    });
  }



  /** ====== AUTO-ADDED SAFE STUBS (no-op / defaults) ====== */
  taskList: any[] = [];
  checked: boolean = false;
  indeterminate: boolean = false;
  setOfCheckedId: Set<string> = new Set<string>();
  isApprovedVisible: boolean = false;
  isRejectedConfirmVisible: boolean = false;
  isRejectedVisible: boolean = false;
  isAssignVisible: boolean = false;
  inputValue: string = '';
  selectedDepartment: string | null = null;

  onlyPending(): boolean { return false; }
  onlyQuarantined(): boolean { return false; }
  mixedStatuses(): boolean { return false; }

  deleteRows(): void {}
  deleteSingle(_row?: any): void {}
  showApproveModal(): void { this.isApprovedVisible = true; }
  showRejectedModal(): void { this.isRejectedVisible = true; }
  showAssignModal(): void { this.isAssignVisible = true; }
  submitApprove(): void { this.isApprovedVisible = false; }
  rejectApprove(): void { this.isRejectedConfirmVisible = false; }
  confirmReject(): void { this.isRejectedVisible = false; }

  onAllChecked(_ev?: any): void {}
  onItemChecked(id: string, checkedOrEvent: any, status?: string): void {

          const checked = typeof checkedOrEvent === 'boolean' ? checkedOrEvent : !!(checkedOrEvent?.target?.checked ?? checkedOrEvent);
          try {
            if (typeof (this as any).updateCheckedSet === 'function') {
              (this as any).updateCheckedSet(id, checked, status);
            } else if (typeof (this as any).onItemCheckedCore === 'function') {
              (this as any).onItemCheckedCore(id, checked, status);
            }
          } catch {}
        
  }

}