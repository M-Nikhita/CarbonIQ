import React, { useState } from 'react';
import ExplainPanel from './ExplainPanel';
import { api } from '../api';

function BaselineCard({ data, answers }) {
  const { result } = data;
  const { grandTotal, ranked, benchmarks, comparison } = result;

  const [activeCategoryExplain, setActiveCategoryExplain] = useState(null);
  const [explainData, setExplainData] = useState({});
  const [loadingCategory, setLoadingCategory] = useState('');
  const [explainError, setExplainError] = useState('');

  const handleToggleExplain = async (categoryKey) => {
    if (activeCategoryExplain === categoryKey) {
      setActiveCategoryExplain(null);
      return;
    }

    if (explainData[categoryKey]) {
      setActiveCategoryExplain(categoryKey);
      return;
    }

    setLoadingCategory(categoryKey);
    setExplainError('');

    try {
      // Gather inputs for this category
      const categoryInputs = answers[categoryKey] || {};
      
      const res = await api.explain({
        type: 'baseline',
        category: categoryKey,
        inputs: categoryInputs
      });

      setExplainData(prev => ({
        ...prev,
        [categoryKey]: res
      }));
      setActiveCategoryExplain(categoryKey);
    } catch (err) {
      console.error(err);
      setExplainError(`Could not load sensitivity explanation for ${categoryKey}.`);
    } finally {
      setLoadingCategory('');
    }
  };

  const getCategoryColor = (key) => {
    switch (key) {
      case 'transport': return 'var(--color-transport)';
      case 'energy': return 'var(--color-energy)';
      case 'food': return 'var(--color-food)';
      case 'consumption': return 'var(--color-consumption)';
      default: return 'var(--primary)';
    }
  };

  // Find max category value for bar scaling
  const maxCategoryValue = ranked.length > 0 ? Math.max(...ranked.map(r => r.total)) : 1;

  // Let's create an ordered array of benchmarks including the user's score to rank them!
  const benchmarkList = [
    { label: 'United States Average', value: benchmarks.usAveragePerYear, isUser: false },
    { label: 'Global Average', value: benchmarks.globalAveragePerYear, isUser: false },
    { label: 'Your Footprint', value: grandTotal, isUser: true },
    { label: 'Paris Agreement Target', value: benchmarks.parisAgreementTargetPerYear, isUser: false },
    { label: 'India Average', value: benchmarks.indiaAveragePerYear, isUser: false }
  ].sort((a, b) => b.value - a.value);

  return (
    <div className="results-card" aria-label="Carbon footprint profile summary">
      <div className="verdict-header">
        <span className="verdict-badge">Carbon Profile Baseline</span>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Annual Footprint</span>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Your Grand Total annual emissions:</p>
        <div className="savings-highlight" style={{ fontSize: '3rem', color: '#fff' }}>
          {grandTotal.toLocaleString()} <span style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-muted)' }}>kg CO2e / yr</span>
        </div>
        
        <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', lineHeight: '1.5' }}>
          Your footprint is{' '}
          <strong style={{ color: comparison.vsGlobalAveragePercent > 0 ? 'var(--color-high)' : 'var(--color-low)' }}>
            {Math.abs(comparison.vsGlobalAveragePercent)}%{' '}
            {comparison.vsGlobalAveragePercent >= 0 ? 'above' : 'below'}
          </strong>{' '}
          the global average, and{' '}
          <strong style={{ color: comparison.vsParisTargetPercent > 0 ? 'var(--color-high)' : 'var(--color-low)' }}>
            {Math.abs(comparison.vsParisTargetPercent)}%{' '}
            {comparison.vsParisTargetPercent >= 0 ? 'above' : 'below'}
          </strong>{' '}
          the Paris Agreement target.
        </p>
      </div>

      <div>
        <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem' }}>Category Breakdown</p>
        <div className="category-bars">
          {ranked.map((cat) => {
            const barWidth = maxCategoryValue > 0 ? (cat.total / maxCategoryValue) * 100 : 0;
            const isExplaining = activeCategoryExplain === cat.key;
            
            return (
              <div key={cat.key} className="category-bar-row">
                <div className="category-bar-label">
                  <span>{cat.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {cat.total.toLocaleString()} kg
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleToggleExplain(cat.key)}
                      style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem', borderRadius: '4px' }}
                      disabled={loadingCategory === cat.key}
                      aria-label={`Explain emissions for ${cat.label}`}
                    >
                      {loadingCategory === cat.key ? '...' : isExplaining ? 'Hide' : 'Explain'}
                    </button>
                  </div>
                </div>

                <div className="category-bar-track">
                  <div
                    className="category-bar-fill"
                    style={{
                      width: `${Math.max(3, barWidth)}%`,
                      backgroundColor: getCategoryColor(cat.key)
                    }}
                  />
                </div>

                {isExplaining && explainData[cat.key] && (
                  <ExplainPanel data={explainData[cat.key]} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {explainError && (
        <p style={{ color: 'var(--color-high)', fontSize: '0.8rem', marginTop: '0.5rem' }} role="alert">
          {explainError}
        </p>
      )}

      <div style={{ marginTop: '1.75rem' }}>
        <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem' }}>Global Comparisons</p>
        <div className="benchmark-list">
          {benchmarkList.map((item, index) => (
            <div
              key={index}
              className={`benchmark-item ${item.isUser ? 'user-item' : ''}`}
            >
              <span>{item.label}</span>
              <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                {item.value.toLocaleString()} kg
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BaselineCard;
