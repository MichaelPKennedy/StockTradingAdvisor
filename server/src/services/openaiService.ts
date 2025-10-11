import OpenAI from 'openai';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

class OpenAIService {
  private client: OpenAI;
  private model = 'gpt-4o-mini';

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️  OpenAI API key not found in environment variables');
    }
    this.client = new OpenAI({ apiKey });
  }

  private getSystemPrompt(): string {
    return `You are a helpful and knowledgeable stock trading advisor AI assistant. Your role is to:

1. Help users understand their investment goals and risk tolerance
2. Suggest appropriate stock portfolios based on their preferences
3. Explain investment concepts in simple terms
4. Provide educational information about stocks and trading
5. Analyze portfolio performance and suggest improvements

Important guidelines:
- This is paper trading only (no real money)
- Be cautious about giving specific financial advice
- Encourage diversification and long-term thinking
- Educate users about risks and market volatility
- Keep responses concise and actionable

You have access to real-time (15-min delayed) stock data. When discussing stocks, be specific about current prices when relevant.`;
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      return completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw new Error('Failed to get AI response');
    }
  }

  async streamChat(messages: ChatMessage[]) {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 500,
        stream: true
      });

      return stream;
    } catch (error) {
      console.error('Error streaming from OpenAI API:', error);
      throw new Error('Failed to stream AI response');
    }
  }

  async analyzeRiskProfile(userInput: {
    age?: number;
    goals: string;
    investmentHorizon: string;
    riskComfort: string;
  }): Promise<{
    riskTolerance: 'low' | 'medium' | 'high';
    reasoning: string;
    recommendations: string[];
  }> {
    const prompt = `Based on the following user information, analyze their risk profile and provide recommendations:

Age: ${userInput.age || 'Not provided'}
Goals: ${userInput.goals}
Investment Horizon: ${userInput.investmentHorizon}
Risk Comfort: ${userInput.riskComfort}

Respond in JSON format with:
{
  "riskTolerance": "low|medium|high",
  "reasoning": "Brief explanation",
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"]
}`;

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from AI');
      }

      return JSON.parse(response);
    } catch (error) {
      console.error('Error analyzing risk profile:', error);
      throw new Error('Failed to analyze risk profile');
    }
  }

  async suggestPortfolio(preferences: {
    riskTolerance: 'low' | 'medium' | 'high';
    investmentHorizon: 'short' | 'medium' | 'long';
    goals: string;
    budget: number;
  }): Promise<{
    stocks: Array<{
      symbol: string;
      name: string;
      allocation: number;
      reasoning: string;
    }>;
    overall_strategy: string;
  }> {
    const prompt = `Suggest a diversified stock portfolio based on:

Risk Tolerance: ${preferences.riskTolerance}
Investment Horizon: ${preferences.investmentHorizon}
Goals: ${preferences.goals}
Budget: $${preferences.budget}

Provide 5-8 stock recommendations with allocations that sum to 100%. Include major US stocks (AAPL, MSFT, GOOGL, etc.).

Respond in JSON format:
{
  "stocks": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "allocation": 20,
      "reasoning": "Brief reason"
    }
  ],
  "overall_strategy": "Brief strategy explanation"
}`;

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from AI');
      }

      return JSON.parse(response);
    } catch (error) {
      console.error('Error suggesting portfolio:', error);
      throw new Error('Failed to suggest portfolio');
    }
  }
}

export default new OpenAIService();
