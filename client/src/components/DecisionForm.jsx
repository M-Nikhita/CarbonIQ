import React, { useState } from 'react';

const PRESETS = [
  { id: 'car-petrol', label: 'Drive (petrol car)', mode: 'car', fuelType: 'petrol' },
  { id: 'car-electric', label: 'Drive (electric car)', mode: 'car', fuelType: 'electric' },
  { id: 'car-hybrid', label: 'Drive (hybrid car)', mode: 'car', fuelType: 'hybrid' },
  { id: 'transit-train', label: 'Take the train', mode: 'publicTransit', transitType: 'train' },
  { id: 'transit-bus', label: 'Take the bus', mode: 'publicTransit', transitType: 'bus' },
  { id: 'transit-metro', label: 'Take the metro', mode: 'publicTransit', transitType: 'metro' },
  { id: 'flight-short', label: 'Fly (short haul)', mode: 'flight', flightType: 'shortHaul' },
  { id: 'walk-bike', label: 'Walk or Bicycle', mode: 'walk' }
];

function DecisionForm({ onSubmit }) {
  const [distance, setDistance] = useState('');
  const [selectedIds, setSelectedIds] = useState(['car-petrol', 'transit-train']);
  const [error, setError] = useState('');

  const handleToggle = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const distNum = Number(distance);
    if (!distance || isNaN(distNum) || distNum <= 0) {
      setError('Please enter a valid positive distance.');
      return;
    }
    if (selectedIds.length < 2) {
      setError('Please select at least 2 transport options to compare.');
      return;
    }

    setError('');
    const chosenOptions = PRESETS.filter(p => selectedIds.includes(p.id));
    onSubmit({ distanceKm: distNum, options: chosenOptions });
  };

  return (
    <form onSubmit={handleSubmit} className="embed-card" aria-label="Compare travel options form">
      <div className="form-group">
        <label htmlFor="distance-input">Trip Distance (km)</label>
        <input
          id="distance-input"
          type="number"
          min="0.1"
          step="any"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          placeholder="e.g. 15"
          required
        />
      </div>

      <div className="form-group">
        <label>Select options to compare (choose at least 2)</label>
        <div className="choice-list" role="group" aria-label="Transport option choices">
          {PRESETS.map((preset) => {
            const isChecked = selectedIds.includes(preset.id);
            return (
              <label
                key={preset.id}
                className={`choice-item ${isChecked ? 'selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggle(preset.id)}
                />
                <span>{preset.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {error && <p style={{ color: 'var(--color-high)', fontSize: '0.85rem', marginBottom: '1rem' }} role="alert">{error}</p>}

      <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
        Compare Options
      </button>
    </form>
  );
}

export default DecisionForm;
