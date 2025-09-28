# 🤖 Claude AI Integration Setup

## Overview
This guide explains how to set up Claude AI integration for the Master Data Management chatbot.

## Prerequisites
1. **Anthropic API Key**: You need an API key from Anthropic to use Claude
2. **Internet Connection**: The chatbot will make API calls to Claude's servers
3. **Valid Subscription**: Ensure you have an active Anthropic subscription

## Setup Steps

### 1. Get Claude API Key
1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the API key (starts with `sk-ant-`)

### 2. Configure Environment
Update the `src/environments/environment.ts` file:

```typescript
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api',
  // Replace with your actual Claude API key
  claudeApiKey: 'sk-ant-your-actual-api-key-here',
  claudeApiUrl: 'https://api.anthropic.com/v1/messages'
};
```

### 3. Features Enabled with Claude

#### 🧠 Intelligent Responses
- **Context-Aware**: Understands user role and system state
- **Natural Language**: Responds in conversational manner
- **Multi-language**: Supports both English and Arabic

#### 📊 Real-time Data Integration
- **Live System Data**: Accesses current database information
- **Dynamic Responses**: Updates based on actual system state
- **Smart Filtering**: Shows relevant data based on user role

#### 🎯 Advanced Capabilities
- **Intent Recognition**: Understands user intentions
- **Action Execution**: Can perform system actions
- **Data Analysis**: Provides insights on system data
- **Workflow Guidance**: Helps users navigate complex processes

### 4. Usage Examples

#### Natural Language Queries
```
User: "Show me my pending tasks"
Claude: "I found 3 pending tasks for you as a data_entry user:
• ID: REQ123 - ABC Company - Status: Pending
• ID: REQ124 - XYZ Corp - Status: Rejected
• ID: REQ125 - DEF Ltd - Status: Pending"

User: "Create a new customer for ABC Company in Cairo"
Claude: "I'll help you create a new customer. Let me gather the information:
Company: ABC Company
City: Cairo
What's the street address for this company?"
```

#### Smart Data Analysis
```
User: "How many customers do we have?"
Claude: "Based on the current system data, you have:
• Total Requests: 45
• Active Customers: 38
• Pending Reviews: 7
• Golden Records: 12
Would you like me to break this down by status or region?"
```

### 5. Fallback Mode
If Claude API is unavailable, the system automatically falls back to static responses:
- Basic command recognition
- Predefined workflows
- Simple task management
- Standard customer creation flow

### 6. Security Considerations
- **API Key Protection**: Never commit API keys to version control
- **Rate Limiting**: Claude API has usage limits
- **Data Privacy**: Only necessary data is sent to Claude
- **Error Handling**: Graceful fallback on API failures

### 7. Cost Management
- **Token Usage**: Monitor API usage in Anthropic console
- **Efficient Prompts**: Optimized prompts to reduce token consumption
- **Caching**: Conversation history cached locally
- **Fallback**: Static responses when API limits reached

### 8. Troubleshooting

#### Common Issues
1. **API Key Invalid**: Check key format and validity
2. **Rate Limit Exceeded**: Wait or upgrade subscription
3. **Network Issues**: Check internet connection
4. **CORS Errors**: Ensure proper API configuration

#### Debug Mode
Enable debug logging by setting:
```typescript
// In ai.service.ts
private debugMode = true;
```

### 9. Advanced Configuration

#### Custom System Prompts
Modify the system prompt in `ai.service.ts` to customize Claude's behavior:

```typescript
private buildSystemPrompt(context?: any): string {
  return `You are a specialized AI assistant for Master Data Management...
  // Customize this prompt for your specific needs
  `;
}
```

#### Response Processing
Customize how Claude's responses are processed:

```typescript
private async processAIAction(aiResponse: string, userMessage: string): Promise<string | null> {
  // Add your custom logic here
}
```

## Benefits of Claude Integration

### 🚀 Enhanced User Experience
- **Natural Conversations**: No need to learn specific commands
- **Context Awareness**: Understands user situation and needs
- **Intelligent Suggestions**: Proactive help and recommendations

### 📈 Improved Efficiency
- **Faster Task Completion**: Streamlined workflows
- **Reduced Training**: Intuitive interface reduces learning curve
- **Error Prevention**: Smart validation and suggestions

### 🔧 Better System Integration
- **Real-time Data**: Always up-to-date information
- **Dynamic Responses**: Adapts to system changes
- **Seamless Workflows**: Integrates with existing processes

---

*With Claude AI integration, your Master Data Management system becomes truly intelligent and user-friendly!*


