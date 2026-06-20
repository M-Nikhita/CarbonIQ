import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';

function WhatIfSlider({ initialAnswers, initialGrandTotal }) {
  const [answers, setAnswers] = useState(initialAnswers);
  const [weeklyKm, setWeeklyKm] = useState(initialAnswers.transport?.weeklyKm || 0);
  const [grandTotal, setGrandTotal] = useState(initialGrandTotal);
  const [loading, setLoading] = useState(false);
  
  // Ref to hold debounce timeout
  const timeoutRef = useRef(null);

  // If the user didn't commute by vehicle, this slider is less relevant
  const mode = initialAnswers.transport?.mode;
  const isVehicleCommute = ['car', 'motorbike', 'publicTransit'].includes(mode);

  useEffect(() => {
    // Only run if the user has a vehicle commute
    if (!isVehicleCommute) return;

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setLoading(true);

    // Debounce the API call by 250ms
    timeoutRef.current = setTimeout(async () => {
      try {
        const updatedAnswers = {
          ...answers,
          transport: {
            ...answers.transport,
            weeklyKm: Number(weeklyKm)
          }
        };

        const res = await api.calculate(updatedAnswers);
        setGrandTotal(res.result.grandTotal);
      } catch (err) {
        console.error('Error recalculating what-if scenario:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [weeklyKm]);

  if (!isVehicleCommute) {
    return (
      <div className="embed-card" style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
        What-If Slider is only available for vehicle-based commutes. Since you walk/bicycle, your commute emissions are already at an optimal zero.
      </div>
    );
  }

  // Display label based on vehicle mode
  let modeLabel = 'Commute Distance';
  if (mode === 'car') {
    modeLabel = `Driving (${answers.transport.fuelType} car)`;
  } else if (mode === 'motorbike') {
    modeLabel = 'Riding Motorbike';
  } else if (mode === 'publicTransit') {
    modeLabel = `Public Transit (${answers.transport.transitType})`;
  }

  const diff = grandTotal - initialGrandTotal;

  return (
    <div className="slider-group" aria-label="Interactive carbon what-if calculator">
      <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
        What-If Simulator 🔮
      </p>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Adjust your weekly commute distance to see how it affects your total carbon profile live.
      </p>

      <div className="slider-header">
        <span>{modeLabel}</span>
        <span className="slider-val">{weeklyKm} km / week</span>
      </div>

      <input
        type="range"
        min="0"
        max="600"
        step="10"
        value={weeklyKm}
        onChange={(e) => setWeeklyKm(e.target.value)}
        aria-label="Weekly commute distance in kilometers"
      />

      <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', marginTop: '0.5rem', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Simulated Carbon Footprint:</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
            {loading ? 'Recalculating...' : `${grandTotal.toLocaleString()} kg CO2e / yr`}
          </p>
        </div>
        {!loading && diff !== 0 && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Change vs. Baseline:</p>
            <span
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: diff > 0 ? 'var(--color-high)' : 'var(--color-low)'
              }}
            >
              {diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()} kg / yr
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default WhatIfSlider;
