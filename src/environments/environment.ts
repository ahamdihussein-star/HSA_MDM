export const environment = {
  production: false,
  // عدّل الـURL ده لو عندك API شغّال على بورت أو دومين مختلف
  apiBaseUrl: 'http://localhost:3001/api',
  // OpenAI API Configuration
  openaiApiKey: 'YOUR_OPENAI_API_KEY_HERE',
  openaiApiUrl: 'https://api.openai.com/v1/chat/completions',
  openaiModel: 'gpt-4o' // Using GPT-4o for better intelligence and reasoning
};