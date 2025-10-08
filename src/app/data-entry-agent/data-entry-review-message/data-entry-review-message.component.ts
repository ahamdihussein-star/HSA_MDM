import { Component, Input, Pipe, PipeTransform, inject, signal, Injectable } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';

// --- Mock Translation System for Demonstration ---

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  'en': {
    'agent.extractionSuccess': 'Data extracted successfully! Found {{ count }} out of {{ total }} fields',
    'agent.completionRate': 'Completion Rate: {{ rate }}%',
    'agent.fieldsRemaining': '{{ count }} fields remaining',
    'agent.allFieldsComplete': 'All fields complete!',
    'agent.extractedFieldsTitle': 'Extracted Fields ({{ count }})',
    'agent.missingFieldsTitle': 'Missing Fields ({{ count }})',
    'agent.missingDataInfo': 'Not provided',
    'agent.complete': 'Complete',
    'agent.missing': 'Missing',
  },
  'ar': {
    'agent.extractionSuccess': 'تم استخراج البيانات بنجاح! تم العثور على {{ count }} من {{ total }} حقول',
    'agent.completionRate': 'نسبة الإنجاز: {{ rate }}%',
    'agent.fieldsRemaining': 'تبقى {{ count }} حقول',
    'agent.allFieldsComplete': 'اكتملت جميع الحقول!',
    'agent.extractedFieldsTitle': 'الحقول المستخلصة ({{ count }})',
    'agent.missingFieldsTitle': 'الحقول المفقودة ({{ count }})',
    'agent.missingDataInfo': 'غير متوفر',
    'agent.complete': 'مكتمل',
    'agent.missing': 'مفقود',
  }
};

type Language = 'en' | 'ar';

// Service to manage the current language state
@Injectable({ providedIn: 'root' })
class LanguageService {
  currentLanguage = signal<Language>('en');
}

// Custom pipe to mock the behavior of a translation library (like ngx-translate)
@Pipe({ name: 'translate', standalone: true })
export class TranslatePipe implements PipeTransform {
  private languageService = inject(LanguageService);

  transform(key: string, args: { [key: string]: any } = {}): string {
    const lang = this.languageService.currentLanguage();
    let translated = TRANSLATIONS[lang]?.[key] || key;

    for (const [k, v] of Object.entries(args)) {
      translated = translated.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
    }
    return translated;
  }
}

// --- Component Interfaces ---

interface FieldDefinition {
  key: string;
  label: string;
}

interface ExtractedField extends FieldDefinition {
  value: string;
}

// --- Data Entry Review Message Component ---

@Component({
  selector: 'app-data-entry-review-message',
  standalone: true,
  imports: [CommonModule, NgClass, TranslatePipe],
  template: `
    <div class="review-card">
      <!-- Header with gradient and progress -->
      <div class="header-card">
        <div class="header-icon">✨</div>
        <div class="header-content">
          <div class="header-title">
            {{ 'agent.extractionSuccess' | translate:{ count: extractedCount, total: totalFields } }}
          </div>
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="completionRate"></div>
          </div>
          <div class="completion-badge" [ngClass]="{'complete': completionRate === 100}">
            {{ 'agent.completionRate' | translate:{ rate: completionRate } }}
          </div>
        </div>
      </div>

      <!-- Status indicator -->
      <div class="status-row">
        <div class="status-badge success">
          <span class="badge-icon">✓</span>
          <span class="badge-text">{{ extractedCount }} {{ 'agent.complete' | translate }}</span>
        </div>
        <div class="status-badge warning" *ngIf="missingCount > 0">
          <span class="badge-icon">⚠</span>
          <span class="badge-text">{{ missingCount }} {{ 'agent.missing' | translate }}</span>
        </div>
        <div class="status-badge success" *ngIf="missingCount === 0">
          <span class="badge-icon">🎉</span>
          <span class="badge-text">{{ 'agent.allFieldsComplete' | translate }}</span>
        </div>
      </div>

      <!-- Extracted Fields Section -->
      <div class="fields-section" *ngIf="extractedFields.length > 0">
        <div class="section-header success">
          <span class="section-icon">✓</span>
          <span class="section-title">{{ 'agent.extractedFieldsTitle' | translate:{ count: extractedFields.length } }}</span>
        </div>
        
        <div class="fields-grid">
          <div class="field-card extracted"
               *ngFor="let field of extractedFields; trackBy: trackByKey">
            <div class="field-label">{{ field.label }}</div>
            <div class="field-value" [attr.title]="field.value">{{ field.value }}</div>
            <div class="field-checkmark">✓</div>
          </div>
        </div>
      </div>

      <!-- Missing Fields Section -->
      <div class="fields-section" *ngIf="missingFields.length > 0">
        <div class="section-header warning">
          <span class="section-icon">⚠</span>
          <span class="section-title">{{ 'agent.missingFieldsTitle' | translate:{ count: missingFields.length } }}</span>
        </div>
        
        <div class="fields-grid">
          <div class="field-card missing"
               *ngFor="let field of missingFields; trackBy: trackByKey">
            <div class="field-label">{{ field.label }}</div>
            <div class="field-value missing-text">{{ 'agent.missingDataInfo' | translate }}</div>
            <div class="field-alert">⚠</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .review-card {
      padding: 0;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* Header Card with Gradient */
    .header-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-icon {
      font-size: 32px;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.1); opacity: 0.8; }
    }

    .header-content {
      flex: 1;
    }

    .header-title {
      color: white;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
    }

    .progress-bar {
      background: rgba(255, 255, 255, 0.25);
      height: 8px;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .progress-fill {
      background: linear-gradient(90deg, #4CAF50 0%, #45a049 100%);
      height: 100%;
      transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 10px;
      box-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
    }

    .completion-badge {
      display: inline-block;
      padding: 4px 12px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 20px;
      color: white;
      font-size: 12px;
      font-weight: 600;
      backdrop-filter: blur(10px);
    }

    .completion-badge.complete {
      background: rgba(76, 175, 80, 0.3);
    }

    /* Status Row */
    .status-row {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .status-badge {
      flex: 1;
      min-width: 140px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .status-badge.success {
      background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
      color: #2e7d32;
      border: 2px solid #a5d6a7;
    }

    .status-badge.warning {
      background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
      color: #f57c00;
      border: 2px solid #ffcc80;
    }

    .badge-icon {
      font-size: 18px;
    }

    .badge-text {
      flex: 1;
    }

    /* Section Header */
    .fields-section {
      margin-bottom: 24px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-weight: 700;
      font-size: 15px;
    }

    .section-header.success {
      background: linear-gradient(90deg, #e8f5e9 0%, #c8e6c9 100%);
      color: #2e7d32;
      border-left: 4px solid #4caf50;
    }

    .section-header.warning {
      background: linear-gradient(90deg, #fff3e0 0%, #ffe0b2 100%);
      color: #f57c00;
      border-left: 4px solid #ff9800;
    }

    .section-icon {
      font-size: 20px;
    }

    .section-title {
      flex: 1;
    }

    /* Fields Grid */
    .fields-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }

    .field-card {
      position: relative;
      padding: 14px 16px;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
    }

    .field-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    }

    .field-card.extracted {
      background: linear-gradient(135deg, #f1f8f4 0%, #e8f5e9 100%);
      border: 2px solid #a5d6a7;
    }

    .field-card.missing {
      background: linear-gradient(135deg, #fff8e1 0%, #fff3e0 100%);
      border: 2px solid #ffcc80;
    }

    .field-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #666;
      margin-bottom: 6px;
      opacity: 0.85;
    }

    .field-value {
      font-size: 14px;
      font-weight: 600;
      color: #212529;
      line-height: 1.4;
      word-break: break-word;
      overflow-wrap: break-word;
      padding-right: 24px;
    }

    .field-value.missing-text {
      color: #f57c00;
      font-style: italic;
      opacity: 0.8;
    }

    .field-checkmark {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 2px 6px rgba(76, 175, 80, 0.4);
    }

    .field-alert {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 2px 6px rgba(255, 152, 0, 0.4);
    }

    /* Always keep icons on the right regardless of text direction */
    .field-card {
      text-align: left;
    }

    /* Responsive */
    @media (max-width: 480px) {
      .fields-grid {
        grid-template-columns: 1fr;
      }
      
      .status-row {
        flex-direction: column;
      }
      
      .status-badge {
        min-width: 100%;
      }
    }
  `]
})
export class DataEntryReviewMessageComponent {
  @Input() extractedData: any = {};
  @Input() fields: FieldDefinition[] = [];

  protected languageService = inject(LanguageService);

  get extractedFields(): ExtractedField[] {
    return this.fields
      .map(f => ({
        key: f.key,
        label: f.label,
        value: (this.extractedData?.[f.key] ?? '').toString()
      }))
      .filter(f => f.value.trim() !== '');
  }

  get missingFields(): FieldDefinition[] {
    return this.fields.filter(f => {
      const v = (this.extractedData?.[f.key] ?? '').toString();
      return v.trim() === '';
    });
  }

  get extractedCount(): number { return this.extractedFields.length; }
  get missingCount(): number { return this.missingFields.length; }
  get totalFields(): number { return this.fields.length; }

  get completionRate(): number {
    return this.totalFields === 0 ? 0 : Math.round((this.extractedCount / this.totalFields) * 100);
  }

  /**
   * Detects Arabic/RTL script characters to set direction for individual content blocks.
   */
  isRTL(text: string | null | undefined): boolean {
    if (!text) return false;
    // Check for Arabic script range
    return /[\u0600-\u06FF]/.test(text);
  }

  trackByKey = (_: number, item: { key: string }) => item.key;
}


// --- Root Application Component for Demonstration ---

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, DataEntryReviewMessageComponent],
  template: `
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      /* Ensure RTL is applied globally when selected */
      :host {
        display: block;
        font-family: 'Inter', sans-serif;
        box-sizing: border-box;
      }
      .app-container {
        max-width: 900px;
        margin: 0 auto;
        padding: 20px;
        background: #f4f7fa;
        min-height: 100vh;
      }
      .rtl {
        direction: rtl;
        text-align: right;
      }
      .rtl div, .rtl span {
        /* This rule helps ensure text is right-aligned in RTL mode by default */
        text-align: inherit;
      }
    </style>

    <div class="app-container" [ngClass]="{'rtl': currentLanguage() === 'ar'}">
      <h1 class="text-3xl font-extrabold mb-6 text-center text-gray-800">
        Data Entry AI Assistant Demo
      </h1>

      <div class="flex justify-center mb-8 gap-4">
        <button
          (click)="currentLanguage.set('en')"
          [ngClass]="{
            'bg-indigo-600 text-white shadow-md': currentLanguage() === 'en',
            'bg-white text-gray-700 border border-gray-300': currentLanguage() === 'ar'
          }"
          class="px-4 py-2 rounded-full transition duration-150 ease-in-out font-medium hover:bg-indigo-500 hover:text-white"
        >
          English (LTR)
        </button>
        <button
          (click)="currentLanguage.set('ar')"
          [ngClass]="{
            'bg-indigo-600 text-white shadow-md': currentLanguage() === 'ar',
            'bg-white text-gray-700 border border-gray-300': currentLanguage() === 'en'
          }"
          class="px-4 py-2 rounded-full transition duration-150 ease-in-out font-medium hover:bg-indigo-500 hover:text-white"
        >
          العربية (RTL)
        </button>
      </div>

      <app-data-entry-review-message
        [extractedData]="extractedData()"
        [fields]="fields()"
      ></app-data-entry-review-message>

      <div class="mt-12 p-6 bg-white rounded-xl shadow-lg border border-gray-100">
        <h2 class="text-xl font-semibold mb-3 text-gray-700 border-b pb-2">
          Demo Configuration Data
        </h2>
        <pre class="whitespace-pre-wrap text-sm text-gray-600">{{ fields() | json }}</pre>
      </div>
    </div>
  `,
  providers: [LanguageService] // Provide the mock service
})
export class App {
  protected languageService = inject(LanguageService);
  currentLanguage = this.languageService.currentLanguage;

  // Mock extracted data (some fields filled, some missing)
  extractedData = signal({
    companyName: 'ACME Corp',
    address: '123 Main St, New York, NY 10001',
    contactEmail: 'info@acmecorp.com',
    foundedYear: '1990',
    // RTL content example
    arabicTextExample: 'مؤسسة إيسام للبيانات',
    missingField1: '', // Will be missing
    missingField2: '', // Will be missing
  });

  // Define all fields to be tracked
  fields = signal([
    { key: 'companyName', label: 'Company Name' },
    { key: 'address', label: 'Primary Address' },
    { key: 'contactEmail', label: 'Contact Email' },
    { key: 'foundedYear', label: 'Year Founded' },
    { key: 'arabicTextExample', label: 'اسم المؤسسة باللغة العربية' },
    { key: 'missingField1', label: 'Required Field Alpha' },
    { key: 'missingField2', label: 'Required Field Beta' },
    { key: 'optionalField', label: 'Optional Data Point' }, // Will be missing
  ]);
}