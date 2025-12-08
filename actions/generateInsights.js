'use server';

import { db } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { revalidatePath } from 'next/cache';

export async function generateFinancialInsights(userId, data) {
  if (!data.month || !data.year || !userId) {
    throw new Error('Missing required fields');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
Analyze this financial data and provide 3 concise, actionable insights.
Focus on spending patterns and practical advice.
Keep it friendly and conversational.

Financial Data for ${data.month} ${data.year}:
- Total Income: $${data.totalIncome.toFixed(2)}
- Total Expenses: $${data.totalExpenses.toFixed(2)}
- Net Income: $${(data.totalIncome - data.totalExpenses).toFixed(2)}
- Savings Rate: ${data.totalIncome > 0 ? (((data.totalIncome - data.totalExpenses) / data.totalIncome) * 100).toFixed(1) : '0'}%
- Expense Categories: ${Object.entries(data.categories)
      .map(([cat, amount]) => `${cat}: $${amount.toFixed(2)}`)
      .join(', ')}

Format the response as a JSON array of strings, like this:
["insight 1", "insight 2", "insight 3"]
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanedText = responseText.replace(/```(?:json)?\n?/g, '').trim();
    const insights = JSON.parse(cleanedText);

    const netIncome = data.totalIncome - data.totalExpenses;
    const savingsRate = data.totalIncome > 0 ? ((netIncome / data.totalIncome) * 100) : 0;

    const financialInsight = await db.financialInsight.upsert({
      where: {
        userId_month_year: {
          userId,
          month: data.month,
          year: data.year,
        },
      },
      update: {
        totalIncome: data.totalIncome,
        totalExpenses: data.totalExpenses,
        categories: data.categories,
        insights,
        netIncome,
        savingsRate,
        updatedAt: new Date(),
      },
      create: {
        userId,
        month: data.month,
        year: data.year,
        totalIncome: data.totalIncome,
        totalExpenses: data.totalExpenses,
        categories: data.categories,
        insights,
        netIncome,
        savingsRate,
      },
    });

    revalidatePath('/dashboard/insights');

    return {
      success: true,
      data: financialInsight,
    };
  } catch (error) {
    console.error('Error generating insights:', error);

    const netIncome = data.totalIncome - data.totalExpenses;
    const fallbackInsights = [
      `Your spending was $${data.totalExpenses.toFixed(2)} this month. Consider reviewing high-expense categories.`,
      `Net income after expenses: $${netIncome.toFixed(2)}. Focus on maintaining positive cash flow.`,
      'Track recurring expenses and identify opportunities to reduce spending in non-essential categories.',
    ];

    return {
      success: true,
      data: {
        month: data.month,
        year: data.year,
        totalIncome: data.totalIncome,
        totalExpenses: data.totalExpenses,
        insights: fallbackInsights,
        netIncome,
        savingsRate: data.totalIncome > 0 ? ((netIncome / data.totalIncome) * 100) : 0,
      },
    };
  }
}

export async function getSavedInsights(userId, month, year) {
  return await db.financialInsight.findUnique({
    where: {
      userId_month_year: {
        userId,
        month,
        year,
      },
    },
  });
}

export async function getAllUserInsights(userId) {
  return await db.financialInsight.findMany({
    where: { userId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
}
