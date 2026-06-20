const emissionFactors = require('../data/emissionFactors.json');

/**
 * Calculates transport footprint in kgCO2e/year.
 */
function calculateTransport({ mode, fuelType, weeklyKm, transitType, flightsPerYear } = {}) {
  let commute = 0;
  const kmVal = typeof weeklyKm === 'number' ? weeklyKm : Number(weeklyKm || 0);

  if (mode === 'car') {
    const carFactors = emissionFactors.transport.car;
    const fType = (fuelType && carFactors[fuelType]) ? fuelType : 'petrol';
    const factor = carFactors[fType].perKm;
    commute = kmVal * factor * 52;
  } else if (mode === 'motorbike') {
    const factor = emissionFactors.transport.motorbike.perKm;
    commute = kmVal * factor * 52;
  } else if (mode === 'publicTransit') {
    const transitFactors = emissionFactors.transport.publicTransit;
    const tType = (transitType && transitFactors[transitType]) ? transitType : 'bus';
    const factor = transitFactors[tType].perKm;
    commute = kmVal * factor * 52;
  } else {
    // bicycle, walk, or anything else
    commute = 0;
  }

  const flightsFactors = emissionFactors.consumption.flightsPerYearAvgCO2e;
  const flightsVal = flightsFactors[flightsPerYear] !== undefined ? flightsFactors[flightsPerYear] : 0;

  const total = Math.round(commute + flightsVal);

  return {
    commute: Math.round(commute),
    flights: Math.round(flightsVal),
    total
  };
}

/**
 * Calculates household energy footprint per-person in kgCO2e/year.
 */
function calculateEnergy({ householdSize, usesRenewable, monthlyKwh } = {}) {
  const size = Math.max(1, typeof householdSize === 'number' ? householdSize : Number(householdSize || 1));
  
  let kwh = monthlyKwh;
  if (kwh === undefined || kwh === null || kwh === '') {
    kwh = emissionFactors.energy.avgHouseholdKwhPerPersonPerMonth * size;
  } else {
    kwh = typeof kwh === 'number' ? kwh : Number(kwh);
  }

  let annualCO2e = kwh * 12 * emissionFactors.energy.electricityPerKwh;

  if (usesRenewable === true || usesRenewable === 'true') {
    annualCO2e *= (1 - emissionFactors.energy.renewableOffsetFactor);
  }

  const perPersonTotal = Math.round(annualCO2e / size);

  return {
    total: perPersonTotal
  };
}

/**
 * Calculates food footprint in kgCO2e/year.
 */
function calculateFood({ dietType, wasteLevel } = {}) {
  const dietFactors = emissionFactors.food.dietAnnualCO2e;
  const dType = (dietType && dietFactors[dietType]) ? dietType : 'moderateMeat';
  const base = dietFactors[dType];

  const wasteFactors = emissionFactors.food.foodWastePenaltyFactor;
  const wLevel = (wasteLevel && wasteFactors[wasteLevel]) ? wasteLevel : 'moderate';
  const factor = wasteFactors[wLevel];

  const total = Math.round(base * factor);

  return {
    total
  };
}

/**
 * Calculates shopping consumption footprint in kgCO2e/year.
 */
function calculateConsumption({ shoppingFrequency } = {}) {
  const freqFactors = emissionFactors.consumption.shoppingFrequencyAnnualCO2e;
  const freq = (shoppingFrequency && freqFactors[shoppingFrequency]) ? shoppingFrequency : 'moderate';
  const total = freqFactors[freq];

  return {
    total
  };
}

/**
 * Aggregates all sections into a baseline carbon footprint report.
 */
function calculateFootprint(answers = {}) {
  const transportAns = answers.transport || {};
  const energyAns = answers.energy || {};
  const foodAns = answers.food || {};
  const consumptionAns = answers.consumption || {};

  const transportRes = calculateTransport(transportAns);
  const energyRes = calculateEnergy(energyAns);
  const foodRes = calculateFood(foodAns);
  const consumptionRes = calculateConsumption(consumptionAns);

  const categories = [
    { key: 'transport', label: 'Transport', total: transportRes.total, detail: transportRes },
    { key: 'energy', label: 'Home Energy', total: energyRes.total, detail: energyRes },
    { key: 'food', label: 'Food & Diet', total: foodRes.total, detail: foodRes },
    { key: 'consumption', label: 'Shopping & Consumption', total: consumptionRes.total, detail: consumptionRes }
  ];

  const ranked = [...categories].sort((a, b) => b.total - a.total);
  const grandTotal = categories.reduce((sum, cat) => sum + cat.total, 0);

  const benchmarks = emissionFactors.benchmarks;
  const vsGlobalAveragePercent = Math.round(((grandTotal - benchmarks.globalAveragePerYear) / benchmarks.globalAveragePerYear) * 100);
  const vsParisTargetPercent = Math.round(((grandTotal - benchmarks.parisAgreementTargetPerYear) / benchmarks.parisAgreementTargetPerYear) * 100);

  return {
    categories,
    ranked,
    grandTotal,
    benchmarks,
    comparison: {
      vsGlobalAveragePercent,
      vsParisTargetPercent
    }
  };
}

module.exports = {
  calculateTransport,
  calculateEnergy,
  calculateFood,
  calculateConsumption,
  calculateFootprint
};
