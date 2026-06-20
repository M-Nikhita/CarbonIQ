import React, { useState } from 'react';
import ExplainPanel from './ExplainPanel';
import { api } from '../api';

function DecisionCard({ data }) {
  const { comparison, equivalence } = data;
  const { distanceKm, results, best, worst, savingsKgIfBestChosenOverWorst } = comparison;

  const [explainData, setExplainData] = useState(null);
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [showExplain, setShowExplain] = useState(false);
  const [explainError, setExplainError] = useState('');

  const handleToggleExplain = async () => {
    if (showExplain) {
      setShowExplain(false);
      return;
    }

    if (explainData) {
      setShowExplain(true);
      return;
    }

    setLoadingExplain(true);
    setExplainError('');

    try {
      // Explain best option sensitivity
      const res = await api.explain({
        type: 'decision',
        inputs: {
          distanceKm,
          mode: best.mode,
          fuelType: best.fuelType,
          transitType: best.transitType,
          flightType: best.flightType
        }
      });
      setExplainData(res);
      setShowExplain(true);
    } catch (err) {
      console.error(err);
      setExplainError('Could not load sensitivity explanation.');
    } finally {
      setLoadingExplain(false);
    }
  };

  return (
    <div className="results-card" aria-label="Decision results summary">
      <div className="verdict-header">
        <span className="verdict-badge">Decision Analysis</span>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {distanceKm} km trip
        </span>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Best Option: <strong style={{ color: 'var(--color-low)' }}>{best.label}</strong> (Lowest impact)
        </p>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Worst Option: <strong style={{ color: 'var(--color-high)' }}>{worst.label}</strong>
        </p>
      </div>

      {savingsKgIfBestChosenOverWorst > 0 ? (
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Potential savings if best option chosen:</p>
          <div className="savings-highlight">{savingsKgIfBestChosenOverWorst} kg CO2e</div>
          <div className="equivalence-text" aria-live="polite">
            <span role="img" aria-label="Equivalence icon">⚡</span> {equivalence.charAt(0).toUpperCase() + equivalence.slice(1)}
          </div>
        </div>
      ) : (
        <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          All selected options have equal emissions.
        </p>
      )}

      <table className="options-table" aria-label="Emissions by transport option">
        <thead>
          <tr>
            <th>Option</th>
            <th style={{ textAlign: 'right' }}>Emissions (kg CO2e)</th>
          </tr>
        </thead>
        <tbody>
          {results.map((opt) => {
            const isBest = opt.id === best.id;
            const isWorst = opt.id === worst.id;
            let className = '';
            if (isBest) className = 'best-row';
            else if (isWorst) className = 'worst-row';

            return (
              <tr key={opt.id} className={className}>
                <td>
                  {opt.label} {isBest && ' (Best)'} {isWorst && ' (Worst)'}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                  {opt.co2eKg}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: '1rem' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleToggleExplain}
          disabled={loadingExplain}
          aria-expanded={showExplain}
          style={{ width: '100%' }}
        >
          {loadingExplain ? 'Analyzing...' : showExplain ? 'Hide Explanation' : 'Why this number? (Sensitivity Analysis)'}
        </button>
      </div>

      {explainError && (
        <p style={{ color: 'var(--color-high)', fontSize: '0.8rem', marginTop: '0.5rem' }} role="alert">
          {explainError}
        </p>
      )}

      {showExplain && explainData && (
        <ExplainPanel data={explainData} />
      )}
    </div>
  );
}

export default DecisionCard;
