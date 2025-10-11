import { Request, Response } from 'express';
import openaiService from '../services/openaiService';
import { AuthRequest } from '../middleware/auth';

export const chat = async (req: AuthRequest, res: Response): Promise<void> => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'Messages array is required' });
    return;
  }

  try {
    const response = await openaiService.chat(messages);
    res.json({ response });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
};

export const streamChat = async (req: AuthRequest, res: Response): Promise<void> => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'Messages array is required' });
    return;
  }

  try {
    const stream = await openaiService.streamChat(messages);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('AI stream chat error:', error);
    res.status(500).json({ error: 'Failed to stream AI response' });
  }
};

export const analyzeRiskProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const { age, goals, investmentHorizon, riskComfort } = req.body;

  if (!goals || !investmentHorizon || !riskComfort) {
    res.status(400).json({
      error: 'goals, investmentHorizon, and riskComfort are required'
    });
    return;
  }

  try {
    const analysis = await openaiService.analyzeRiskProfile({
      age,
      goals,
      investmentHorizon,
      riskComfort
    });

    res.json(analysis);
  } catch (error) {
    console.error('Risk analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze risk profile' });
  }
};

export const suggestPortfolio = async (req: AuthRequest, res: Response): Promise<void> => {
  const { riskTolerance, investmentHorizon, goals, budget } = req.body;

  if (!riskTolerance || !investmentHorizon || !goals || !budget) {
    res.status(400).json({
      error: 'riskTolerance, investmentHorizon, goals, and budget are required'
    });
    return;
  }

  try {
    const portfolio = await openaiService.suggestPortfolio({
      riskTolerance,
      investmentHorizon,
      goals,
      budget: parseFloat(budget)
    });

    res.json(portfolio);
  } catch (error) {
    console.error('Portfolio suggestion error:', error);
    res.status(500).json({ error: 'Failed to suggest portfolio' });
  }
};
