import React from 'react';

function ModeSelector({ onSelect }) {
  return (
    <div className="mode-selector-container">
      <p style={{ marginBottom: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>
        Choose a starting point:
      </p>
      <div className="mode-selector-grid">
        <button
          className="mode-btn"
          onClick={() => onSelect('decision')}
          aria-label="Log a quick decision, compare transit options"
        >
          <span className="icon" aria-hidden="true">🚗</span>
          <h3>Log a quick decision</h3>
          <p>Compare commute or trip options in real time and see potential carbon savings.</p>
        </button>

        <button
          className="mode-btn"
          onClick={() => onSelect('baseline')}
          aria-label="Build my carbon profile, lifestyle audit"
        >
          <span className="icon" aria-hidden="true">📊</span>
          <h3>Build my carbon profile</h3>
          <p>Audit your lifestyle habits (commute, diet, home energy) and set a baseline.</p>
        </button>
      </div>
    </div>
  );
}

export default ModeSelector;
