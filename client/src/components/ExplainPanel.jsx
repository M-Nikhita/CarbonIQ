import React from 'react';

function ExplainPanel({ data }) {
  const { sensitivities, explanationText } = data;

  // Find max percent change to scale bars correctly
  const maxChange = sensitivities.length > 0
    ? Math.max(...sensitivities.map(s => Math.abs(s.percentChangeInOutput)))
    : 1;

  return (
    <div className="explain-panel" aria-label="Sensitivity analysis explanation">
      <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
        Sensitivity Analysis
      </p>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
        {explanationText}
      </p>

      {sensitivities.length > 0 && (
        <div className="sensitivity-bar-container">
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Impact of +10% input change on overall category CO2e:
          </p>
          {sensitivities.map((item) => {
            // Calculate percentage width of bar relative to max change
            const absChange = Math.abs(item.percentChangeInOutput);
            const barWidth = maxChange > 0 ? (absChange / maxChange) * 100 : 0;
            
            return (
              <div key={item.input} className="sensitivity-bar-item">
                <span className="sensitivity-label" title={item.input}>
                  {item.input}
                </span>
                <div className="sensitivity-track">
                  <div
                    className="sensitivity-fill"
                    style={{ width: `${Math.max(5, barWidth)}%` }}
                  />
                </div>
                <span className="sensitivity-value">
                  {item.percentChangeInOutput > 0 ? '+' : ''}
                  {item.percentChangeInOutput}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ExplainPanel;
