import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface AnalyticalResponse {
  message: string;
  data?: any;
  chart?: {
    type: 'bar' | 'pie' | 'line' | 'table';
    data: any;
    title: string;
  };
  insights?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticalBotService {
  private conversationHistory: { role: string, content: string }[] = [];

  constructor(private http: HttpClient) {}

  // Main analytical conversation handler
  async processAnalyticalQuery(userMessage: string): Promise<AnalyticalResponse> {
    console.log('🧠 Analytical Bot: Processing query:', userMessage);

    // Add user message to history
    this.conversationHistory.push({ role: 'user', content: userMessage });

    try {
      // Let OpenAI analyze the query and determine the API call
      const aiAnalysis = await this.analyzeQueryWithAI(userMessage);
      console.log('🤖 AI Analysis:', aiAnalysis);
      
      // Get data using AI-determined parameters
      const data = await this.getAnalyticalData(aiAnalysis.queryType, aiAnalysis.params);
      
      // Generate AI response with insights
      const aiResponse = await this.generateAnalyticalResponse(userMessage, data, aiAnalysis.queryType);
      
      // Add AI response to history
      this.conversationHistory.push({ role: 'assistant', content: aiResponse.message });

      return aiResponse;
    } catch (error) {
      console.error('❌ Error in analytical processing:', error);
      return {
        message: 'عذراً، حدث خطأ في معالجة استفسارك. يرجى المحاولة مرة أخرى.',
        data: null
      };
    }
  }

  // Let OpenAI analyze the query and determine API parameters
  private async analyzeQueryWithAI(userMessage: string): Promise<{queryType: string, params: any}> {
    try {
      console.log('🤖 Calling OpenAI to analyze query...');
      
      const prompt = `
You are an expert data analyst. Analyze this user query and determine:
1. What type of analytical query this is (count, ranking, distribution, comparison, trend, general)
2. What API parameters to use

Available API endpoints:
- /api/analytics/count - for counting records
- /api/analytics/ranking - for ranking data
- /api/analytics/distribution - for distribution analysis
- /api/analytics/comparison - for comparisons
- /api/analytics/trend - for trend analysis
- /api/analytics/general - for general statistics

Available parameters:
- country: Egypt, Saudi Arabia, etc.
- city: Cairo, Alexandria, Dubai, etc.
- type: Limited Liability Company, Partnership, etc.
- timeFilter: this_month, this_year
- rankBy: CustomerType, SalesOrgOption, city, country
- groupBy: CustomerType, SalesOrgOption, city, country
- compare: array of items to compare (for comparison queries)
- period: daily, weekly, monthly, yearly

For comparison queries, you MUST provide a "compare" array with at least 2 items to compare.
For example: {"compare": ["Egypt", "Saudi Arabia"]} or {"compare": ["Cairo", "Alexandria"]}

User Query: "${userMessage}"

Respond with JSON only in this format:
{
  "queryType": "general|count|ranking|distribution|comparison|trend",
  "params": {
    "country": "Egypt",
    "city": "Cairo",
    "type": "Limited Liability Company",
    "timeFilter": "this_month",
    "rankBy": "CustomerType",
    "groupBy": "city",
    "compare": ["Egypt", "Saudi Arabia"],
    "period": "monthly",
    "limit": 10
  }
}
      `;

      const response = await this.http.post<any>(environment.openaiApiUrl, {
        model: environment.openaiModel,
        messages: [
          { role: 'system', content: 'You are an expert data analyst. Respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.3
      }, {
        headers: {
          'Authorization': `Bearer ${environment.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      }).toPromise();

      console.log('✅ OpenAI Analysis Response:', response.choices[0].message.content);
      
      const analysis = JSON.parse(response.choices[0].message.content);
      return analysis;
    } catch (error) {
      console.error('❌ OpenAI analysis failed:', error);
      // Fallback to simple detection
      return {
        queryType: this.detectQueryType(userMessage),
        params: this.extractCountParams(userMessage)
      };
    }
  }

  // Detect what type of analytical query this is
  private detectQueryType(message: string): string {
    const msg = message.toLowerCase();
    
    if (msg.includes('كم') || msg.includes('عدد') || msg.includes('count')) {
      return 'count';
    }
    if (msg.includes('أكثر') || msg.includes('أقل') || msg.includes('top') || msg.includes('most')) {
      return 'ranking';
    }
    if (msg.includes('متوسط') || msg.includes('average') || msg.includes('mean')) {
      return 'average';
    }
    if (msg.includes('توزيع') || msg.includes('distribution') || msg.includes('نسبة')) {
      return 'distribution';
    }
    if (msg.includes('مقارنة') || msg.includes('compare') || msg.includes('مقارن')) {
      return 'comparison';
    }
    if (msg.includes('اتجاه') || msg.includes('trend') || msg.includes('تطور')) {
      return 'trend';
    }
    
    return 'general';
  }

  // Get analytical data from database
  private async getAnalyticalData(queryType: string, params: any): Promise<any> {
    try {
      let endpoint = '';

      switch (queryType) {
        case 'count':
          endpoint = '/analytics/count';
          break;
        case 'ranking':
          endpoint = '/analytics/ranking';
          break;
        case 'distribution':
          endpoint = '/analytics/distribution';
          break;
        case 'comparison':
          endpoint = '/analytics/comparison';
          break;
        case 'trend':
          endpoint = '/analytics/trend';
          break;
        default:
          endpoint = '/analytics/general';
          params = { query: 'general' };
      }

      const fullUrl = `${environment.apiBaseUrl}${endpoint}`;
      console.log('📡 Calling API:', fullUrl);
      console.log('📡 With params:', params);

      const response = await this.http.get(fullUrl, { params }).toPromise();
      console.log('✅ API Response:', response);
      return response;
    } catch (error) {
      console.error('❌ Error fetching analytical data:', error);
      return null;
    }
  }

  // Extract parameters for count queries
  private extractCountParams(message: string): any {
    const msg = message.toLowerCase();
    const params: any = {};

    // Extract filters
    if (msg.includes('مصر') || msg.includes('egypt')) params.country = 'Egypt';
    if (msg.includes('الإسكندرية') || msg.includes('alexandria')) params.city = 'Alexandria';
    if (msg.includes('القاهرة') || msg.includes('cairo')) params.city = 'Cairo';
    if (msg.includes('شركة') || msg.includes('company')) params.type = 'company';
    if (msg.includes('فرد') || msg.includes('individual')) params.type = 'individual';

    // Extract time filters
    if (msg.includes('هذا الشهر') || msg.includes('this month')) {
      params.timeFilter = 'this_month';
    }
    if (msg.includes('هذا العام') || msg.includes('this year')) {
      params.timeFilter = 'this_year';
    }

    return params;
  }

  // Extract parameters for ranking queries
  private extractRankingParams(message: string): any {
    const msg = message.toLowerCase();
    const params: any = {};

    if (msg.includes('نوع') || msg.includes('type')) params.rankBy = 'customer_type';
    if (msg.includes('منطقة') || msg.includes('region')) params.rankBy = 'sales_org';
    if (msg.includes('مدينة') || msg.includes('city')) params.rankBy = 'city';
    if (msg.includes('بلد') || msg.includes('country')) params.rankBy = 'country';

    // Extract limit
    const limitMatch = msg.match(/(\d+)/);
    if (limitMatch) params.limit = parseInt(limitMatch[1]);

    return params;
  }

  // Extract parameters for distribution queries
  private extractDistributionParams(message: string): any {
    const msg = message.toLowerCase();
    const params: any = {};

    if (msg.includes('نوع') || msg.includes('type')) params.groupBy = 'customer_type';
    if (msg.includes('منطقة') || msg.includes('region')) params.groupBy = 'sales_org';
    if (msg.includes('مدينة') || msg.includes('city')) params.groupBy = 'city';
    if (msg.includes('بلد') || msg.includes('country')) params.groupBy = 'country';

    return params;
  }

  // Extract parameters for comparison queries
  private extractComparisonParams(message: string): any {
    const msg = message.toLowerCase();
    const params: any = {};

    // Extract comparison entities
    if (msg.includes('مصر') && msg.includes('السعودية')) {
      params.compare = ['Egypt', 'Saudi Arabia'];
    }
    if (msg.includes('القاهرة') && msg.includes('الإسكندرية')) {
      params.compare = ['Cairo', 'Alexandria'];
    }

    return params;
  }

  // Extract parameters for trend queries
  private extractTrendParams(message: string): any {
    const msg = message.toLowerCase();
    const params: any = {};

    if (msg.includes('شهر') || msg.includes('month')) params.period = 'monthly';
    if (msg.includes('سنة') || msg.includes('year')) params.period = 'yearly';
    if (msg.includes('أسبوع') || msg.includes('week')) params.period = 'weekly';

    return params;
  }

  // Generate AI response with insights
  private async generateAnalyticalResponse(message: string, data: any, queryType: string): Promise<AnalyticalResponse> {
    try {
      console.log('🤖 Calling OpenAI API for analytical response...');
      console.log('📊 Data received:', data);
      console.log('🔑 API Key:', environment.openaiApiKey ? 'Present' : 'Missing');
      console.log('🌐 API URL:', environment.openaiApiUrl);

      const prompt = `
You are an intelligent data analyst. Analyze the following data and provide insights in Arabic.

User Question: "${message}"
Query Type: ${queryType}
Data: ${JSON.stringify(data)}

Please provide:
1. A clear answer to the user's question
2. Key insights from the data
3. Recommendations if applicable
4. Any interesting patterns you notice

Respond in Arabic, be conversational and helpful.
      `;

      const response = await this.http.post<any>(environment.openaiApiUrl, {
        model: environment.openaiModel,
        messages: [
          { role: 'system', content: 'You are an expert data analyst who provides clear, insightful analysis in Arabic.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${environment.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      }).toPromise();

      console.log('✅ OpenAI API Response:', response);

      const aiMessage = response.choices[0].message.content;

      // Generate chart data if applicable
      const chart = this.generateChartData(queryType, data);

      return {
        message: aiMessage,
        data: data,
        chart: chart,
        insights: this.extractInsights(aiMessage)
      };
    } catch (error) {
      console.error('❌ AI response generation failed:', error);
      console.error('Error details:', error);
      
      // Fallback response with actual data
      let fallbackMessage = '';
      if (data) {
        fallbackMessage = `بناءً على البيانات المتاحة:\n\n${JSON.stringify(data, null, 2)}\n\nهذه هي البيانات المطلوبة.`;
      } else {
        fallbackMessage = 'عذراً، لم يتم العثور على بيانات للتحليل.';
      }
      
      return {
        message: fallbackMessage,
        data: data
      };
    }
  }

  // Generate chart data based on query type and data
  private generateChartData(queryType: string, data: any): any {
    if (!data) return null;

    switch (queryType) {
      case 'distribution':
        return {
          type: 'pie',
          data: data,
          title: 'توزيع البيانات'
        };
      case 'ranking':
        return {
          type: 'bar',
          data: data,
          title: 'ترتيب البيانات'
        };
      case 'trend':
        return {
          type: 'line',
          data: data,
          title: 'اتجاه البيانات'
        };
      case 'comparison':
        return {
          type: 'bar',
          data: data,
          title: 'مقارنة البيانات'
        };
      default:
        return {
          type: 'table',
          data: data,
          title: 'البيانات'
        };
    }
  }

  // Extract insights from AI response
  private extractInsights(aiMessage: string): string[] {
    const insights: string[] = [];
    const sentences = aiMessage.split('.').filter(s => s.trim().length > 0);
    
    sentences.forEach(sentence => {
      if (sentence.includes('مهم') || sentence.includes('ملاحظة') || sentence.includes('يجب')) {
        insights.push(sentence.trim());
      }
    });

    return insights;
  }

  // Get conversation history
  getConversationHistory(): { role: string, content: string }[] {
    return this.conversationHistory;
  }

  // Clear conversation history
  clearHistory(): void {
    this.conversationHistory = [];
  }
}
