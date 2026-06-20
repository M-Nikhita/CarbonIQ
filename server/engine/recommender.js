const emissionFactors = require('../data/emissionFactors.json');

const RULES = [
  {
    id: 'switch-commute-transit',
    category: 'Transport',
    appliesTo: (answers) => {
      const transport = answers.transport || {};
      return transport.mode === 'car' && (transport.weeklyKm > 0);
    },
    estimateSavingsKg: (answers) => {
      const transport = answers.transport || {};
      const carFactors = emissionFactors.transport.car;
      const fuel = transport.fuelType && carFactors[transport.fuelType] ? transport.fuelType : 'petrol';
      const carRate = carFactors[fuel].perKm;
      const trainRate = emissionFactors.transport.publicTransit.train.perKm;
      const weeklyKm = Number(transport.weeklyKm || 0);
      return Math.round(weeklyKm * 52 * (carRate - trainRate));
    },
    text: (savings) => `Commute by public transit (like train or metro) instead of driving. Estimated annual savings: ${savings} kg CO2e.`
  },
  {
    id: 'switch-car-ev',
    category: 'Transport',
    appliesTo: (answers) => {
      const transport = answers.transport || {};
      return transport.mode === 'car' && transport.fuelType === 'petrol' && (transport.weeklyKm > 0);
    },
    estimateSavingsKg: (answers) => {
      const transport = answers.transport || {};
      const carFactors = emissionFactors.transport.car;
      const petrolRate = carFactors.petrol.perKm;
      const electricRate = carFactors.electric.perKm;
      const weeklyKm = Number(transport.weeklyKm || 0);
      return Math.round(weeklyKm * 52 * (petrolRate - electricRate));
    },
    text: (savings) => `Upgrade from petrol to an electric or hybrid vehicle for your commute. Estimated annual savings: ${savings} kg CO2e.`
  },
  {
    id: 'reduce-flights',
    category: 'Transport',
    appliesTo: (answers) => {
      const transport = answers.transport || {};
      return transport.flightsPerYear === '3-5' || transport.flightsPerYear === '6+';
    },
    estimateSavingsKg: (answers) => {
      const transport = answers.transport || {};
      const flightFactors = emissionFactors.consumption.flightsPerYearAvgCO2e;
      const current = flightFactors[transport.flightsPerYear] || 0;
      // Reduce to 1-2 flights target
      const target = flightFactors['1-2'] || 600;
      return Math.round(Math.max(0, current - target));
    },
    text: (savings) => `Consider reducing non-essential flights by combining trips or opting for local travel. Estimated annual savings: ${savings} kg CO2e.`
  },
  {
    id: 'go-renewable',
    category: 'Home Energy',
    appliesTo: (answers) => {
      const energy = answers.energy || {};
      return !energy.usesRenewable;
    },
    estimateSavingsKg: (answers, result) => {
      // Find the energy category total in result
      const energyCat = result.categories.find(c => c.key === 'energy');
      const energyTotal = energyCat ? energyCat.total : 0;
      return Math.round(energyTotal * emissionFactors.energy.renewableOffsetFactor);
    },
    text: (savings) => `Switch to a 100% renewable energy provider or install residential solar panels. Estimated annual savings: ${savings} kg CO2e.`
  },
  {
    id: 'reduce-meat',
    category: 'Food & Diet',
    appliesTo: (answers) => {
      const food = answers.food || {};
      return food.dietType === 'meatHeavy';
    },
    estimateSavingsKg: (answers) => {
      const dietFactors = emissionFactors.food.dietAnnualCO2e;
      const food = answers.food || {};
      const wasteLevel = food.wasteLevel || 'moderate';
      const wasteFactor = emissionFactors.food.foodWastePenaltyFactor[wasteLevel] || 1.1;
      
      const currentDietTotal = dietFactors.meatHeavy * wasteFactor;
      const targetDietTotal = dietFactors.vegetarian * wasteFactor;
      return Math.round(Math.max(0, currentDietTotal - targetDietTotal));
    },
    text: (savings) => `Transition to a vegetarian or plant-based diet, or participate in "Meatless Mondays". Estimated annual savings: ${savings} kg CO2e.`
  },
  {
    id: 'reduce-food-waste',
    category: 'Food & Diet',
    appliesTo: (answers) => {
      const food = answers.food || {};
      return food.wasteLevel === 'high';
    },
    estimateSavingsKg: (answers) => {
      const food = answers.food || {};
      const dietType = food.dietType || 'moderateMeat';
      const dietBase = emissionFactors.food.dietAnnualCO2e[dietType] || 2500;
      const wasteFactors = emissionFactors.food.foodWastePenaltyFactor;
      return Math.round(dietBase * (wasteFactors.high - wasteFactors.low));
    },
    text: (savings) => `Implement meal planning and better food storage to reduce kitchen food waste. Estimated annual savings: ${savings} kg CO2e.`
  },
  {
    id: 'mindful-shopping',
    category: 'Shopping & Consumption',
    appliesTo: (answers) => {
      const consumption = answers.consumption || {};
      return consumption.shoppingFrequency === 'frequent';
    },
    estimateSavingsKg: (answers) => {
      const shoppingFactors = emissionFactors.consumption.shoppingFrequencyAnnualCO2e;
      const current = shoppingFactors.frequent;
      const target = shoppingFactors.minimal;
      return Math.round(current - target);
    },
    text: (savings) => `Adopt a mindful shopping habit: buy second-hand, repair, and focus on high-durability goods. Estimated annual savings: ${savings} kg CO2e.`
  },
  {
    id: 'energy-efficient-appliances',
    category: 'Home Energy',
    appliesTo: () => true, // always applicable
    estimateSavingsKg: (answers, result) => {
      const energyCat = result.categories.find(c => c.key === 'energy');
      const energyTotal = energyCat ? energyCat.total : 0;
      return Math.round(energyTotal * 0.1) + 40; // 10% saving plus a small base saving
    },
    text: (savings) => `Replace older incandescent lightbulbs with LEDs and upgrade to Energy Star certified appliances. Estimated annual savings: ${savings} kg CO2e.`
  }
];

/**
 * Filter applicable rules, compute savings, sort descending, and return top N.
 */
function generateRecommendations(answers, result, limit = 3) {
  const recommendations = [];

  for (const rule of RULES) {
    if (rule.appliesTo(answers)) {
      const savings = rule.estimateSavingsKg(answers, result);
      if (savings > 0) {
        recommendations.push({
          id: rule.id,
          category: rule.category,
          savingsKg: savings,
          text: rule.text(savings)
        });
      }
    }
  }

  // Sort descending by savings
  recommendations.sort((a, b) => b.savingsKg - a.savingsKg);

  return recommendations.slice(0, limit);
}

module.exports = {
  generateRecommendations
};
