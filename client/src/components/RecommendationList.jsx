import React from 'react';

function RecommendationList({ recommendations }) {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <div style={{ marginTop: '1.25rem' }}>
      <p className="recommendations-header">Top Actions to Reduce Your Footprint</p>
      <div className="rec-card-list">
        {recommendations.map((rec, index) => (
          <div key={rec.id} className="rec-card" aria-label={`Recommendation ${index + 1}: ${rec.category}`}>
            <div className="rec-icon">
              {index + 1}
            </div>
            <div className="rec-content">
              <div className="rec-title">
                <span>{rec.category}</span>
                <span className="rec-savings">-{rec.savingsKg} kg/yr</span>
              </div>
              <p className="rec-text">{rec.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecommendationList;
