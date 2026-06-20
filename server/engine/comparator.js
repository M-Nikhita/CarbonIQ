const emissionFactors = require('../data/emissionFactors.json');

/**
 * Compares N options for a transport decision and returns each option's CO2e plus a ranked verdict.
 *
 * @param {Object} params
 * @param {number} params.distanceKm - distance for this specific trip
 * @param {Array<Object>} params.options - travel options
 */
function compareTransportOptions({ distanceKm, options }) {
  const dist = typeof distanceKm === 'number' ? distanceKm : Number(distanceKm || 0);
  
  const results = options.map(option => {
    let co2eKg = 0;
    const { mode, fuelType, transitType, flightType } = option;

    if (mode === 'car') {
      const carFactors = emissionFactors.transport.car;
      const fType = (fuelType && carFactors[fuelType]) ? fuelType : 'petrol';
      co2eKg = dist * carFactors[fType].perKm;
    } else if (mode === 'motorbike') {
      co2eKg = dist * emissionFactors.transport.motorbike.perKm;
    } else if (mode === 'publicTransit') {
      const transitFactors = emissionFactors.transport.publicTransit;
      const tType = (transitType && transitFactors[transitType]) ? transitType : 'bus';
      co2eKg = dist * transitFactors[tType].perKm;
    } else if (mode === 'flight') {
      const flightFactors = emissionFactors.transport.flight;
      const fType = (flightType && flightFactors[flightType]) ? flightType : 'shortHaul';
      co2eKg = dist * flightFactors[fType].perKm;
    } else {
      // bicycle, walk, etc.
      co2eKg = 0;
    }

    // Keep it clean: round co2eKg to 2 decimal places or keep exact, let's keep exact or 2 decimals for display
    co2eKg = Math.round(co2eKg * 100) / 100;

    return {
      ...option,
      co2eKg
    };
  });

  // Sort ascending (lowest emission first)
  results.sort((a, b) => a.co2eKg - b.co2eKg);

  const best = results[0];
  const worst = results[results.length - 1];
  const savings = Math.max(0, Math.round((worst.co2eKg - best.co2eKg) * 100) / 100);

  return {
    distanceKm: dist,
    results,
    best,
    worst,
    savingsKgIfBestChosenOverWorst: savings
  };
}

module.exports = {
  compareTransportOptions
};
