import React, { useState } from 'react';

function BaselineQuestionnaire({ onSubmit }) {
  // Navigation State
  // 0: transport mode
  // 1: car fuel (if car) / transit type (if publicTransit) -> if bike/walk, skip to flights
  // 2: weekly km (if car/motorbike/publicTransit)
  // 3: flights per year
  // 4: household size
  // 5: renewable energy
  // 6: monthly kwh (optional)
  // 7: diet type
  // 8: food waste
  // 9: shopping frequency
  const [subStep, setSubStep] = useState(0);

  const [answers, setAnswers] = useState({
    transport: { mode: 'car', fuelType: 'petrol', weeklyKm: '', transitType: 'bus', flightsPerYear: '0' },
    energy: { householdSize: '1', usesRenewable: false, monthlyKwh: '' },
    food: { dietType: 'moderateMeat', wasteLevel: 'moderate' },
    consumption: { shoppingFrequency: 'moderate' }
  });

  const [error, setError] = useState('');

  const updateAnswers = (section, key, value) => {
    setAnswers(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setError('');
  };

  const getProgress = () => {
    // total of 10 logical sub-steps (0 to 9)
    return Math.round((subStep / 10) * 100);
  };

  const handleNext = (e) => {
    if (e) e.preventDefault();

    // Validations before moving to next step
    if (subStep === 2) {
      const km = answers.transport.weeklyKm;
      if (km === '' || isNaN(Number(km)) || Number(km) < 0) {
        setError('Please enter a valid weekly distance (0 or more).');
        return;
      }
    }

    if (subStep === 4) {
      const size = answers.energy.householdSize;
      if (size === '' || isNaN(Number(size)) || Number(size) < 1) {
        setError('Household size must be at least 1.');
        return;
      }
    }

    if (subStep === 6) {
      const kwh = answers.energy.monthlyKwh;
      if (kwh !== '' && (isNaN(Number(kwh)) || Number(kwh) < 0)) {
        setError('Please enter a valid monthly kWh or leave it blank to skip.');
        return;
      }
    }

    // Branching logic
    if (subStep === 0) {
      const mode = answers.transport.mode;
      if (mode === 'car' || mode === 'publicTransit') {
        setSubStep(1); // go to fuelType / transitType
      } else if (mode === 'motorbike') {
        setSubStep(2); // go directly to weeklyKm
      } else {
        setSubStep(3); // bike/walk -> skip distance, go directly to flights
      }
    } else if (subStep === 1) {
      setSubStep(2); // go to weeklyKm
    } else if (subStep === 2) {
      setSubStep(3); // go to flights
    } else if (subStep === 9) {
      // Final submission
      onSubmit(answers);
    } else {
      setSubStep(subStep + 1);
    }
  };

  const handleBack = () => {
    setError('');
    
    if (subStep === 1) {
      setSubStep(0);
    } else if (subStep === 2) {
      const mode = answers.transport.mode;
      if (mode === 'motorbike') {
        setSubStep(0);
      } else {
        setSubStep(1);
      }
    } else if (subStep === 3) {
      const mode = answers.transport.mode;
      if (mode === 'bicycle' || mode === 'walk') {
        setSubStep(0);
      } else {
        setSubStep(2);
      }
    } else {
      setSubStep(subStep - 1);
    }
  };

  return (
    <div className="embed-card" aria-label="Carbon footprint profile questionnaire">
      <div className="question-header">
        <span>Carbon Profile Audit</span>
        <span>{getProgress()}% Complete</span>
      </div>

      <div className="question-progress-bar">
        <div className="question-progress-fill" style={{ width: `${getProgress()}%` }} />
      </div>

      {subStep === 0 && (
        <div>
          <label style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
            1. How do you mainly commute/travel weekly?
          </label>
          <div className="choice-list">
            {[
              { val: 'car', label: '🚗 Car' },
              { val: 'motorbike', label: '🏍️ Motorbike' },
              { val: 'publicTransit', label: '🚌 Public Transit (Bus/Train/Metro)' },
              { val: 'bicycle', label: '🚲 Bicycle' },
              { val: 'walk', label: '🚶 Walk' }
            ].map(item => (
              <button
                key={item.val}
                type="button"
                className={`choice-item ${answers.transport.mode === item.val ? 'selected' : ''}`}
                onClick={() => updateAnswers('transport', 'mode', item.val)}
                style={{ width: '100%', textAlign: 'left' }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {subStep === 1 && answers.transport.mode === 'car' && (
        <div>
          <label style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
            What fuel type does your car use?
          </label>
          <div className="choice-list">
            {[
              { val: 'petrol', label: 'Petrol' },
              { val: 'diesel', label: 'Diesel' },
              { val: 'electric', label: 'Electric (EV)' },
              { val: 'hybrid', label: 'Hybrid' }
            ].map(item => (
              <button
                key={item.val}
                type="button"
                className={`choice-item ${answers.transport.fuelType === item.val ? 'selected' : ''}`}
                onClick={() => updateAnswers('transport', 'fuelType', item.val)}
                style={{ width: '100%', textAlign: 'left' }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {subStep === 1 && answers.transport.mode === 'publicTransit' && (
        <div>
          <label style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
            What public transit do you use most?
          </label>
          <div className="choice-list">
            {[
              { val: 'bus', label: '🚌 Bus' },
              { val: 'train', label: '🚆 Train' },
              { val: 'metro', label: '🚇 Metro / Subway' }
            ].map(item => (
              <button
                key={item.val}
                type="button"
                className={`choice-item ${answers.transport.transitType === item.val ? 'selected' : ''}`}
                onClick={() => updateAnswers('transport', 'transitType', item.val)}
                style={{ width: '100%', textAlign: 'left' }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {subStep === 2 && (
        <div>
          <label htmlFor="km-input" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
            How many kilometers (km) do you travel per week using this mode?
          </label>
          <div className="form-group">
            <input
              id="km-input"
              type="number"
              min="0"
              value={answers.transport.weeklyKm}
              onChange={(e) => updateAnswers('transport', 'weeklyKm', e.target.value)}
              placeholder="e.g. 100"
              required
            />
          </div>
        </div>
      )}

      {subStep === 3 && (
        <div>
          <label style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
            2. How many flights do you take per year?
          </label>
          <div className="choice-list">
            {[
              { val: '0', label: '✈️ 0 flights (No flying)' },
              { val: '1-2', label: '✈️ 1-2 flights (Occasional vacations)' },
              { val: '3-5', label: '✈️ 3-5 flights (Regular leisure/business)' },
              { val: '6+', label: '✈️ 6+ flights (Frequent flyer)' }
            ].map(item => (
              <button
                key={item.val}
                type="button"
                className={`choice-item ${answers.transport.flightsPerYear === item.val ? 'selected' : ''}`}
                onClick={() => updateAnswers('transport', 'flightsPerYear', item.val)}
                style={{ width: '100%', textAlign: 'left' }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {subStep === 4 && (
        <div>
          <label htmlFor="household-input" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
            3. How many people live in your household?
          </label>
          <div className="form-group">
            <input
              id="household-input"
              type="number"
              min="1"
              value={answers.energy.householdSize}
              onChange={(e) => updateAnswers('energy', 'householdSize', e.target.value)}
              placeholder="e.g. 3"
              required
            />
          </div>
        </div>
      )}

      {subStep === 5 && (
        <div>
          <label style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
            4. Do you use renewable energy? (e.g. solar panels or green tariff)
          </label>
          <div className="choice-list">
            <button
              type="button"
              className={`choice-item ${answers.energy.usesRenewable === true ? 'selected' : ''}`}
              onClick={() => updateAnswers('energy', 'usesRenewable', true)}
              style={{ width: '100%', textAlign: 'left' }}
            >
              ☀️ Yes, primarily renewable energy
            </button>
            <button
              type="button"
              className={`choice-item ${answers.energy.usesRenewable === false ? 'selected' : ''}`}
              onClick={() => updateAnswers('energy', 'usesRenewable', false)}
              style={{ width: '100%', textAlign: 'left' }}
            >
              🔌 No, standard utility grid
            </button>
          </div>
        </div>
      )}

      {subStep === 6 && (
        <div>
          <label htmlFor="kwh-input" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
            5. Do you know your monthly electricity usage in kWh? (Optional)
          </label>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Leave blank to estimate based on household size.
          </p>
          <div className="form-group">
            <input
              id="kwh-input"
              type="number"
              min="0"
              value={answers.energy.monthlyKwh}
              onChange={(e) => updateAnswers('energy', 'monthlyKwh', e.target.value)}
              placeholder="e.g. 250"
            />
          </div>
        </div>
      )}

      {subStep === 7 && (
        <div>
          <label style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
            6. How would you describe your diet?
          </label>
          <div className="choice-list">
            {[
              { val: 'meatHeavy', label: '🥩 Meat-Heavy (Frequently eat beef, pork, poultry)' },
              { val: 'moderateMeat', label: '🍗 Moderate Meat (Eat chicken/fish, rare red meat)' },
              { val: 'vegetarian', label: '🍳 Vegetarian (No meat/fish, eat eggs/dairy)' },
              { val: 'vegan', label: '🥗 Vegan (100% plant-based)' }
            ].map(item => (
              <button
                key={item.val}
                type="button"
                className={`choice-item ${answers.food.dietType === item.val ? 'selected' : ''}`}
                onClick={() => updateAnswers('food', 'dietType', item.val)}
                style={{ width: '100%', textAlign: 'left' }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {subStep === 8 && (
        <div>
          <label style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
            7. How much food does your household typically waste?
          </label>
          <div className="choice-list">
            {[
              { val: 'high', label: '🗑️ High (Frequently throw out leftovers/expired items)' },
              { val: 'moderate', label: '🗑️ Moderate (Occasionally discard food)' },
              { val: 'low', label: '🗑️ Low (Careful meal planning, minimal waste)' }
            ].map(item => (
              <button
                key={item.val}
                type="button"
                className={`choice-item ${answers.food.wasteLevel === item.val ? 'selected' : ''}`}
                onClick={() => updateAnswers('food', 'wasteLevel', item.val)}
                style={{ width: '100%', textAlign: 'left' }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {subStep === 9 && (
        <div>
          <label style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
            8. How often do you buy non-essential shopping items? (clothes, gadgets, decor)
          </label>
          <div className="choice-list">
            {[
              { val: 'frequent', label: '🛍️ Frequent (Weekly new purchases)' },
              { val: 'moderate', label: '🛍️ Moderate (Monthly upgrades/shopping)' },
              { val: 'minimal', label: '🛍️ Minimal (Only buy when absolutely needed)' }
            ].map(item => (
              <button
                key={item.val}
                type="button"
                className={`choice-item ${answers.consumption.shoppingFrequency === item.val ? 'selected' : ''}`}
                onClick={() => updateAnswers('consumption', 'shoppingFrequency', item.val)}
                style={{ width: '100%', textAlign: 'left' }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p style={{ color: 'var(--color-high)', fontSize: '0.85rem', marginBottom: '1rem' }} role="alert">{error}</p>}

      <div className="form-row" style={{ marginTop: '1.5rem' }}>
        {subStep > 0 ? (
          <button type="button" className="btn btn-secondary" onClick={handleBack}>
            Back
          </button>
        ) : (
          <div />
        )}
        <button type="button" className="btn btn-primary" onClick={handleNext}>
          {subStep === 9 ? 'Calculate Footprint' : 'Next'}
        </button>
      </div>
    </div>
  );
}

export default BaselineQuestionnaire;
