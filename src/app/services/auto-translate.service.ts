import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AutoTranslateService {

  // Dictionary of common company names and their Arabic translations
  private translations: { [key: string]: string } = {
    // Saudi Companies
    'Saudi Aramco': 'أرامكو السعودية',
    'SABIC': 'الشركة السعودية للصناعات الأساسية',
    'STC': 'الاتصالات السعودية',
    'Almarai': 'المراعي',
    'Ma\'aden': 'معادن',
    'ACWA Power': 'أكوا باور',
    'NEOM': 'نيوم',
    'Red Sea Global': 'البحر الأحمر العالمي',
    
    // Common Business Terms
    'Company': 'شركة',
    'Corporation': 'شركة',
    'Limited': 'محدودة',
    'Ltd': 'محدودة',
    'Group': 'مجموعة',
    'Holdings': 'القابضة',
    'International': 'الدولية',
    'Global': 'العالمية',
    'Saudi': 'السعودية',
    'Arabia': 'العربية',
    'Middle East': 'الشرق الأوسط',
    'Gulf': 'الخليج',
    'Investment': 'الاستثمار',
    'Development': 'التطوير',
    'Construction': 'الإنشاءات',
    'Trading': 'التجارة',
    'Services': 'الخدمات',
    'Technology': 'التكنولوجيا',
    'Telecommunications': 'الاتصالات',
    'Petroleum': 'البترول',
    'Oil': 'النفط',
    'Gas': 'الغاز',
    'Mining': 'التعدين',
    'Steel': 'الحديد',
    'Chemicals': 'الكيماويات',
    'Food': 'الغذاء',
    'Industries': 'الصناعات',
    'Manufacturing': 'التصنيع',
    'Energy': 'الطاقة',
    'Power': 'الطاقة',
    'Electricity': 'الكهرباء',
    'Water': 'المياه',
    'Real Estate': 'العقارات',
    'Banking': 'المصرفية',
    'Finance': 'المالية',
    'Insurance': 'التأمين',
    'Healthcare': 'الرعاية الصحية',
    'Education': 'التعليم',
    'Transportation': 'النقل',
    'Logistics': 'اللوجستيات',
    'Aviation': 'الطيران',
    'Maritime': 'البحرية',
    'Tourism': 'السياحة',
    'Entertainment': 'الترفيه',
    'Media': 'الإعلام',
    'Publishing': 'النشر',
    'Retail': 'التجزئة',
    'Wholesale': 'البيع بالجملة',
    'Distribution': 'التوزيع',
    'Marketing': 'التسويق',
    'Advertising': 'الإعلان',
    'Consulting': 'الاستشارات',
    'Management': 'الإدارة',
    'Solutions': 'الحلول',
    'Systems': 'الأنظمة',
    'Software': 'البرمجيات',
    'Hardware': 'الأجهزة',
    'Electronics': 'الإلكترونيات',
    'Automotive': 'السيارات',
    'Aerospace': 'الطيران',
    'Defense': 'الدفاع',
    'Security': 'الأمن',
    'Safety': 'السلامة',
    'Environment': 'البيئة',
    'Sustainability': 'الاستدامة',
    'Innovation': 'الابتكار',
    'Research': 'البحث',
    'Engineering': 'الهندسة',
    'Architecture': 'الهندسة المعمارية',
    'Design': 'التصميم',
    'Creative': 'الإبداعية',
    'Digital': 'الرقمية',
    'Smart': 'الذكية',
    'Advanced': 'المتطورة',
    'Modern': 'الحديثة',
    'Traditional': 'التقليدية',
    'Heritage': 'التراث',
    'Culture': 'الثقافة',
    'Art': 'الفن',
    'Sports': 'الرياضة',
    'Fitness': 'اللياقة',
    'Wellness': 'العافية',
    'Beauty': 'الجمال',
    'Fashion': 'الأزياء',
    'Luxury': 'الفاخرة',
    'Premium': 'المتميزة',
    'Quality': 'الجودة',
    'Excellence': 'التميز',
    'Leadership': 'الريادة',
    'Pioneer': 'الرائدة',
    'Vision': 'الرؤية',
    'Mission': 'الرسالة',
    'Values': 'القيم',
    'Principles': 'المبادئ',
    'Ethics': 'الأخلاق',
    'Integrity': 'النزاهة',
    'Trust': 'الثقة',
    'Reliability': 'الموثوقية',
    'Efficiency': 'الكفاءة',
    'Performance': 'الأداء',
    'Results': 'النتائج',
    'Success': 'النجاح',
    'Growth': 'النمو',
    'Expansion': 'التوسع',
    'Progress': 'التقدم',
    'Future': 'المستقبل',
    'Tomorrow': 'الغد',
    'Today': 'اليوم',
    'Now': 'الآن',
    'Here': 'هنا',
    'There': 'هناك',
    'Everywhere': 'في كل مكان',
    'Worldwide': 'عالمياً',
    'Local': 'محلياً',
    'Regional': 'إقليمياً',
    'National': 'وطنياً'
  };

  constructor() { }

  /**
   * Translates English company name to Arabic
   * Uses intelligent word-by-word translation with proper Arabic grammar
   */
  translateCompanyName(englishName: string): string {
    if (!englishName || englishName.trim() === '') {
      return '';
    }

    const cleanName = englishName.trim();
    
    // Check for exact match first
    if (this.translations[cleanName]) {
      return this.translations[cleanName];
    }

    // Split into words and translate each
    const words = cleanName.split(/\s+/);
    const translatedWords: string[] = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[.,!?;:]/g, ''); // Remove punctuation
      const translatedWord = this.translateWord(word);
      
      if (translatedWord) {
        translatedWords.push(translatedWord);
      } else {
        // If no translation found, try to transliterate
        translatedWords.push(this.transliterate(word));
      }
    }

    // Apply Arabic grammar rules
    return this.applyArabicGrammar(translatedWords);
  }

  /**
   * Translates individual words
   */
  private translateWord(word: string): string {
    const cleanWord = word.toLowerCase();
    
    // Direct translation
    if (this.translations[word]) {
      return this.translations[word];
    }
    
    // Case-insensitive lookup
    for (const [key, value] of Object.entries(this.translations)) {
      if (key.toLowerCase() === cleanWord) {
        return value;
      }
    }
    
    return '';
  }

  /**
   * Transliterates English words to Arabic when no translation is available
   */
  private transliterate(word: string): string {
    const transliterationMap: { [key: string]: string } = {
      'a': 'ا', 'b': 'ب', 'c': 'ك', 'd': 'د', 'e': 'ي', 'f': 'ف', 'g': 'ج',
      'h': 'ه', 'i': 'ي', 'j': 'ج', 'k': 'ك', 'l': 'ل', 'm': 'م', 'n': 'ن',
      'o': 'و', 'p': 'ب', 'q': 'ق', 'r': 'ر', 's': 'س', 't': 'ت', 'u': 'و',
      'v': 'ف', 'w': 'و', 'x': 'كس', 'y': 'ي', 'z': 'ز'
    };

    let result = '';
    for (const char of word.toLowerCase()) {
      if (transliterationMap[char]) {
        result += transliterationMap[char];
      } else if (char === ' ') {
        result += ' ';
      }
    }
    
    return result || word; // Return original if transliteration fails
  }

  /**
   * Applies Arabic grammar rules to the translated words
   */
  private applyArabicGrammar(words: string[]): string {
    if (words.length === 0) return '';
    if (words.length === 1) return words[0];

    // Common Arabic grammar patterns for company names
    const result = words.join(' ');
    
    // Add "ال" (al-) prefix for certain words
    const wordsNeedingAl = ['شركة', 'مجموعة', 'مؤسسة', 'هيئة', 'منظمة'];
    let finalResult = result;
    
    for (const word of wordsNeedingAl) {
      if (finalResult.includes(word) && !finalResult.includes('ال' + word)) {
        finalResult = finalResult.replace(word, 'ال' + word);
        break; // Only add one "ال" prefix
      }
    }
    
    return finalResult;
  }

  /**
   * Checks if a name needs translation (contains English characters)
   */
  needsTranslation(name: string): boolean {
    if (!name) return false;
    
    // Check if contains English letters
    const englishRegex = /[a-zA-Z]/;
    return englishRegex.test(name);
  }

  /**
   * Gets translation confidence level (0-1)
   */
  getTranslationConfidence(englishName: string, arabicName: string): number {
    if (!englishName || !arabicName) return 0;
    
    // Check for exact match
    if (this.translations[englishName] === arabicName) {
      return 1.0;
    }
    
    // Check for partial matches
    const englishWords = englishName.toLowerCase().split(/\s+/);
    const arabicWords = arabicName.split(/\s+/);
    
    let matches = 0;
    for (const word of englishWords) {
      const translation = this.translateWord(word);
      if (translation && arabicWords.some(aw => aw.includes(translation))) {
        matches++;
      }
    }
    
    return matches / englishWords.length;
  }

  /**
   * Suggests alternative translations
   */
  getAlternativeTranslations(englishName: string): string[] {
    const alternatives: string[] = [];
    
    // Try different word orders
    const words = englishName.split(/\s+/);
    if (words.length > 1) {
      // Reverse order
      const reversed = words.reverse().join(' ');
      const reversedTranslation = this.translateCompanyName(reversed);
      if (reversedTranslation && reversedTranslation !== this.translateCompanyName(englishName)) {
        alternatives.push(reversedTranslation);
      }
    }
    
    return alternatives;
  }
}
