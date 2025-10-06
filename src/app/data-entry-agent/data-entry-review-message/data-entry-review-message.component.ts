import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-data-entry-review-message',
  template: `
    <div class="review-container">
      <div class="summary-box">
        <div class="summary-text">✅ تم استخراج {{extractedCount}} من {{totalFields}} حقل بنجاح</div>
        <div class="completion-bar">
          <div class="completion-fill" [style.width.%]="completionRate"></div>
        </div>
      </div>
      
      <div class="stats-row">
        <span>📊 معدل الاكتمال: {{completionRate}}%</span>
        <span>⏱️ {{missingCount > 0 ? 'يتبقى ' + missingCount + ' حقول' : 'اكتمل!'}}</span>
      </div>
      
      <div class="section-title" *ngIf="extractedFields.length > 0">
        ✅ البيانات المستخرجة ({{extractedFields.length}})
      </div>
      
      <div class="fields-grid" *ngIf="extractedFields.length > 0">
        <div class="field-item extracted" *ngFor="let field of extractedFields">
          <div class="field-label">{{field.label}}</div>
          <div class="field-value">{{field.value | slice:0:30}}{{(field.value || '').length > 30 ? '...' : ''}}</div>
        </div>
      </div>
      
      <div class="section-title" *ngIf="missingFields.length > 0">
        ⚠️ البيانات الناقصة ({{missingFields.length}})
      </div>
      <div class="fields-grid" *ngIf="missingFields.length > 0">
        <div class="field-item missing" *ngFor="let field of missingFields">
          <div class="field-label">{{field.label}}</div>
          <div class="field-value">مطلوب / Required</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .review-container { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 100%; }
    .summary-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px; border-radius: 8px; margin-bottom: 12px; }
    .completion-bar { background: #f0f0f0; height: 8px; border-radius: 8px; overflow: hidden; margin-top: 8px; }
    .completion-fill { background: linear-gradient(90deg, #4CAF50, #45a049); height: 100%; transition: width 0.3s; }
    .stats-row { display: flex; justify-content: space-between; font-size: 13px; color: #666; margin: 12px 0 16px; }
    .section-title { font-weight: 600; margin: 16px 0 8px; color: #333; }
    .fields-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .field-item { padding: 8px; border-radius: 6px; border: 1px solid #e9ecef; }
    .field-item.extracted { background: #e8f5e9; border-color: #c8e6c9; }
    .field-item.missing { background: #fff3e0; border-color: #ffe0b2; }
    .field-label { font-size: 11px; color: #666; margin-bottom: 2px; font-weight: 500; }
    .field-value { font-size: 13px; font-weight: 600; color: #212529; }
    @media (max-width: 480px) { .fields-grid { grid-template-columns: 1fr; } }
  `]
})
export class DataEntryReviewMessageComponent {
  @Input() extractedData: any = {};
  @Input() fields: Array<{ key: string; label: string } > = [];

  get extractedFields(): Array<{ key: string; label: string; value: string } > {
    return this.fields
      .map(f => ({ key: f.key, label: f.label, value: (this.extractedData?.[f.key] ?? '') as string }))
      .filter(f => f.value !== '');
  }

  get missingFields(): Array<{ key: string; label: string } > {
    return this.fields.filter(f => {
      const v = this.extractedData?.[f.key];
      return !v || (typeof v === 'string' && v.trim() === '');
    });
  }

  get extractedCount(): number { return this.extractedFields.length; }
  get missingCount(): number { return this.missingFields.length; }
  get totalFields(): number { return this.fields.length; }
  get completionRate(): number { return this.totalFields === 0 ? 0 : Math.round((this.extractedCount / this.totalFields) * 100); }
}


