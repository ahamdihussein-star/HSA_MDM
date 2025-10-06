import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

import { 
  CUSTOMER_TYPE_OPTIONS,
  SALES_ORG_OPTIONS, 
  DISTRIBUTION_CHANNEL_OPTIONS, 
  DIVISION_OPTIONS,
  COUNTRY_OPTIONS,
  CITY_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  PREFERRED_LANGUAGE_OPTIONS
} from '../shared/lookup-data';

@Injectable({ providedIn: 'root' })
export class SmartDropdownMatcherService {
  constructor(private http: HttpClient) {}

  private getCompleteSystemValues(): any {
    return {
      customerTypes: CUSTOMER_TYPE_OPTIONS.map(opt => ({ value: opt.value, label: opt.label })),
      countries: COUNTRY_OPTIONS.map(opt => ({ value: opt.value, label: opt.label })),
      citiesByCountry: CITY_OPTIONS,
      salesOrganizations: SALES_ORG_OPTIONS.map(opt => ({ value: opt.value, label: opt.label, country: this.extractCountryFromSalesOrg(opt.value), type: this.extractTypeFromSalesOrg(opt.value) })),
      distributionChannels: DISTRIBUTION_CHANNEL_OPTIONS.map(opt => ({ value: opt.value, label: opt.label })),
      divisions: DIVISION_OPTIONS.map(opt => ({ value: opt.value, label: opt.label })),
      documentTypes: DOCUMENT_TYPE_OPTIONS.map(opt => ({ value: opt.value, label: opt.label })),
      preferredLanguages: PREFERRED_LANGUAGE_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))
    };
  }

  async matchExtractedToSystemValues(extractedData: any): Promise<any> {
    const systemValues = this.getCompleteSystemValues();

    const messages = [
      {
        role: 'system',
        content: `You are an expert sales operations analyst for MDM_Accelerator.
Your task is to select the EXACT system values that best match the extracted company data.
You MUST choose from the provided options only - no custom values allowed.`
      },
      {
        role: 'user',
        content: `Based on this extracted company data, select the BEST matching system values:

EXTRACTED COMPANY DATA:
${JSON.stringify(extractedData, null, 2)}

AVAILABLE SYSTEM VALUES:

CUSTOMER TYPES:
${systemValues.customerTypes.map((o: any) => `• ${o.value}: ${o.label}`).join('\n')}

SALES ORGANIZATIONS:
${systemValues.salesOrganizations.map((o: any) => `• ${o.value}: ${o.label} [Country: ${o.country}, Type: ${o.type}]`).join('\n')}

DISTRIBUTION CHANNELS:
${systemValues.distributionChannels.map((o: any) => `• ${o.value}: ${o.label}`).join('\n')}

DIVISIONS:
${systemValues.divisions.map((o: any) => `• ${o.value}: ${o.label}`).join('\n')}

Return ONLY this JSON structure with EXACT system values:
{
  "matchedValues": {
    "firstName": "extracted company name in English",
    "firstNameAR": "اسم الشركة بالعربية",
    "tax": "extracted tax/vat number",
    "CustomerType": "exact_system_value",
    "ownerName": "extracted owner name",
    "buildingNumber": "extracted building number",
    "street": "extracted street",
    "country": "exact_system_country",
    "city": "exact_system_city",
    "salesOrganization": "exact_system_value",
    "distributionChannel": "exact_system_value",
    "division": "exact_system_value"
  },
  "confidence": {
    "CustomerType": 0.95,
    "salesOrganization": 0.95,
    "distributionChannel": 0.85,
    "division": 0.90
  },
  "reasoning": {
    "CustomerType": "Why this customer type was selected",
    "salesOrganization": "Why this sales org was selected",
    "distributionChannel": "Why this channel was selected",
    "division": "Why this division was selected"
  },
  "alternativeOptions": {
    "salesOrganization": ["second_best_option"],
    "distributionChannel": ["second_best_option"],
    "division": ["second_best_option"]
  }
}`
      }
    ];

    const response = await firstValueFrom(
      this.http.post<any>('https://api.openai.com/v1/chat/completions', {
        model: environment.openaiModel || 'gpt-4o',
        messages,
        max_tokens: 2000,
        temperature: 0.2
      }, {
        headers: {
          Authorization: `Bearer ${environment.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      })
    );

    const content = response.choices?.[0]?.message?.content || '{}';
    const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanedContent || '{}');
  }

  async generateMatchingSuggestions(result: any): Promise<string> {
    let message = '## 📊 تحليل المستندات والمطابقة الذكية\n\n';
    if (result?.matchedValues?.firstName) {
      message += `### 🏢 معلومات الشركة:\n`;
      message += `- **الاسم (English):** ${result.matchedValues.firstName}\n`;
      if (result.matchedValues.firstNameAR) message += `- **الاسم (عربي):** ${result.matchedValues.firstNameAR}\n`;
      if (result.matchedValues.tax) message += `- **الرقم الضريبي:** ${result.matchedValues.tax}\n`;
      message += '\n';
    }
    if (result?.matchedValues?.country) {
      message += `### 📍 الموقع:\n`;
      message += `- **الدولة:** ${result.matchedValues.country}\n`;
      if (result.matchedValues.city) message += `- **المدينة:** ${result.matchedValues.city}\n`;
      message += '\n';
    }
    message += `### 🎯 المطابقة الذكية للنظام:\n\n`;
    const addSection = (title: string, key: string, fallbackReason: string) => {
      if (result?.matchedValues?.[key]) {
        const conf = Math.round(((result.confidence?.[key] || 0.8) as number) * 100);
        message += `#### ${title}:\n`;
        message += `- **الاختيار:** ${result.matchedValues[key]}\n`;
        message += `- **السبب:** ${result.reasoning?.[key] || fallbackReason}\n`;
        message += `- **الثقة:** ${conf}%\n`;
        if (result.alternativeOptions?.[key]?.length > 0) {
          message += `- **بدائل:** ${result.alternativeOptions[key].join(', ')}\n`;
        }
        message += '\n';
      }
    };
    addSection('👤 نوع العميل', 'CustomerType', 'Based on company structure');
    addSection('🏭 منظمة المبيعات', 'salesOrganization', 'Based on location');
    addSection('🚚 قناة التوزيع', 'distributionChannel', 'Based on business model');
    addSection('📦 القسم', 'division', 'Based on business activities');
    message += '---\n\n### ✅ هل توافق على هذه الاقتراحات؟\nيمكنك الموافقة على الاقتراحات أو تعديلها حسب الحاجة.';
    return message;
  }

  private extractCountryFromSalesOrg(value: string): string {
    if (value.startsWith('yemen_')) return 'Yemen';
    if (value.startsWith('egypt_')) return 'Egypt';
    if (value.startsWith('ksa_')) return 'Saudi Arabia';
    if (value.startsWith('uae_')) return 'United Arab Emirates';
    if (value.startsWith('kuwait_')) return 'Kuwait';
    if (value.startsWith('qatar_')) return 'Qatar';
    if (value.startsWith('bahrain_')) return 'Bahrain';
    if (value.startsWith('oman_')) return 'Oman';
    return 'Unknown';
  }

  private extractTypeFromSalesOrg(value: string): string {
    if (value.includes('main_office') || value.includes('head_office')) return 'Head Office';
    if (value.includes('branch')) return 'Branch';
    if (value.includes('office')) return 'Office';
    return 'Location';
  }
}



