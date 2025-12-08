 
'use client';

import { useState } from 'react';
import { generateFinancialInsights } from '@/actions/generateInsights';

export function InsightsGenerator({ userId, transactionData }) {
  const [formData, setFormData] = useState({
    month: transactionData?.month || new Date().toLocaleString('default', { month: 'long' }),
    year: transactionData?.year || new Date().getFullYear(),
    totalIncome: transactionData?.totalIncome || 0,
    totalExpenses: transactionData?.totalExpenses || 0,
    categories: transactionData?.categories || {},
  });

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'categories') {
      try {
        setFormData(prev => ({ ...prev, categories: JSON.parse(value) }));
      } catch {}
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'year' ? parseInt(value) : name.includes('total') ? parseFloat(value) : value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await generateFinancialInsights(userId, {
        month: formData.month,
        year: formData.year,
        totalIncome: formData.totalIncome,
        totalExpenses: formData.totalExpenses,
        categories: formData.categories,
      });

      if (response.success) {
        setResults(response.data);
      } else {
        setError('Failed to generate insights');
      }
    } catch (err) {
      setError(err?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      {!results ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <h2 className="text-2xl font-bold">Generate Financial Insights</h2>

          {error && <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="insights-month" className="block text-sm font-medium mb-2">Month</label>
              <select 
                id="insights-month"
                name="month" 
                value={formData.month} 
                onChange={handleInputChange} 
                className="w-full p-2 border rounded" 
                required
              >
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="insights-year" className="block text-sm font-medium mb-2">Year</label>
              <input 
                id="insights-year"
                type="number" 
                name="year" 
                value={formData.year} 
                onChange={handleInputChange} 
                min="2000" 
                max="2100" 
                className="w-full p-2 border rounded" 
                required 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="insights-income" className="block text-sm font-medium mb-2">Total Income ($)</label>
              <input 
                id="insights-income"
                type="number" 
                name="totalIncome" 
                value={formData.totalIncome} 
                onChange={handleInputChange} 
                step="0.01" 
                min="0" 
                className="w-full p-2 border rounded" 
                required 
              />
            </div>
            <div>
              <label htmlFor="insights-expenses" className="block text-sm font-medium mb-2">Total Expenses ($)</label>
              <input 
                id="insights-expenses"
                type="number" 
                name="totalExpenses" 
                value={formData.totalExpenses} 
                onChange={handleInputChange} 
                step="0.01" 
                min="0" 
                className="w-full p-2 border rounded" 
                required 
              />
            </div>
          </div>

          <div>
            <label htmlFor="insights-categories" className="block text-sm font-medium mb-2">Expense Categories (JSON)</label>
            <textarea 
              id="insights-categories"
              name="categories" 
              value={JSON.stringify(formData.categories, null, 2)} 
              onChange={handleInputChange} 
              rows={4} 
              placeholder='{"Groceries": 250, "Transport": 150}' 
              className="w-full p-2 border rounded font-mono text-sm" 
            />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Generating...' : 'Generate Insights'}
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Financial Summary</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-blue-600">${results.totalIncome.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-red-50 rounded border border-red-200">
              <p className="text-sm text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">${results.totalExpenses.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-green-50 rounded border border-green-200">
              <p className="text-sm text-gray-600">Net Income</p>
              <p className="text-2xl font-bold text-green-600">${results.netIncome.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded border border-purple-200">
              <p className="text-sm text-gray-600">Savings Rate</p>
              <p className="text-2xl font-bold text-purple-600">{results.savingsRate.toFixed(1)}%</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mt-8">AI-Powered Insights</h2>
          <div className="space-y-4">
            {results.insights && results.insights.map((insight, idx) => (
              <div key={idx} className="p-4 bg-blue-50 border-l-4 border-blue-600 rounded">
                <p className="font-semibold text-blue-900">💡 Insight {idx + 1}</p>
                <p className="text-blue-800 mt-2">{insight}</p>
              </div>
            ))}
          </div>

          <button onClick={() => setResults(null)} className="w-full bg-gray-600 text-white py-2 rounded font-medium hover:bg-gray-700">
            Generate Another Report
          </button>
        </div>
      )}
    </div>
  );
}
