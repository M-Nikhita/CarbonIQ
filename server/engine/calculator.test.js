const assert = require('assert');
const {
  calculateTransport,
  calculateEnergy,
  calculateFood,
  calculateConsumption,
  calculateFootprint
} = require('./calculator');

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(err);
    failed++;
  }
}

// 1. Test transport zero-emission modes
runTest('Bicycle / walk transport mode yields zero commute emissions', () => {
  const walkResult = calculateTransport({ mode: 'walk', weeklyKm: 150 });
  const bicycleResult = calculateTransport({ mode: 'bicycle', weeklyKm: 80 });
  assert.strictEqual(walkResult.commute, 0);
  assert.strictEqual(bicycleResult.commute, 0);
});

// 2. Test transport fuel-type ordering (petrol > electric)
runTest('Petrol car yields higher commute emissions than electric car for same distance', () => {
  const petrolRes = calculateTransport({ mode: 'car', fuelType: 'petrol', weeklyKm: 100 });
  const electricRes = calculateTransport({ mode: 'car', fuelType: 'electric', weeklyKm: 100 });
  assert.ok(petrolRes.commute > electricRes.commute, 'Petrol commute should be greater than electric');
});

// 3. Flights add independently of commute mode
runTest('Flights emissions are added correctly to the commute total', () => {
  const result = calculateTransport({ mode: 'walk', flightsPerYear: '1-2' });
  assert.strictEqual(result.commute, 0);
  assert.strictEqual(result.flights, 600);
  assert.strictEqual(result.total, 600);
});

// 4. Energy renewable reduction
runTest('Renewable offset factor reduces energy footprint', () => {
  const nonRenewable = calculateEnergy({ householdSize: 1, usesRenewable: false, monthlyKwh: 100 });
  const renewable = calculateEnergy({ householdSize: 1, usesRenewable: true, monthlyKwh: 100 });
  assert.ok(renewable.total < nonRenewable.total, 'Renewable energy should have lower footprint');
});

// 5. Energy household size splits footprint per person
runTest('Household energy footprint is split per-person', () => {
  const singleRes = calculateEnergy({ householdSize: 1, usesRenewable: false, monthlyKwh: 100 });
  const doubleRes = calculateEnergy({ householdSize: 2, usesRenewable: false, monthlyKwh: 200 });
  // Total electricity for double is 200, divided by 2 household size, so per-person it should be the same as single with 100.
  assert.strictEqual(doubleRes.total, singleRes.total);
});

// 6. Food diet ordering (meatHeavy > vegetarian > vegan)
runTest('Diet footprint scales correctly (meatHeavy > moderateMeat > vegetarian > vegan)', () => {
  const meatHeavy = calculateFood({ dietType: 'meatHeavy' });
  const moderateMeat = calculateFood({ dietType: 'moderateMeat' });
  const vegetarian = calculateFood({ dietType: 'vegetarian' });
  const vegan = calculateFood({ dietType: 'vegan' });

  assert.ok(meatHeavy.total > moderateMeat.total);
  assert.ok(moderateMeat.total > vegetarian.total);
  assert.ok(vegetarian.total > vegan.total);
});

// 7. Food waste level increases footprint
runTest('High food waste increases diet footprint vs low waste', () => {
  const highWaste = calculateFood({ dietType: 'moderateMeat', wasteLevel: 'high' });
  const lowWaste = calculateFood({ dietType: 'moderateMeat', wasteLevel: 'low' });
  assert.ok(highWaste.total > lowWaste.total);
});

// 8. Consumption shopping frequency ordering
runTest('Shopping footprint scales with frequency', () => {
  const frequent = calculateConsumption({ shoppingFrequency: 'frequent' });
  const moderate = calculateConsumption({ shoppingFrequency: 'moderate' });
  const minimal = calculateConsumption({ shoppingFrequency: 'minimal' });

  assert.ok(frequent.total > moderate.total);
  assert.ok(moderate.total > minimal.total);
});

// 9. Full calculateFootprint output shape and category sum consistency
runTest('calculateFootprint returns correct object shape and sum matches grandTotal', () => {
  const answers = {
    transport: { mode: 'car', fuelType: 'petrol', weeklyKm: 100, flightsPerYear: '1-2' },
    energy: { householdSize: 2, usesRenewable: false, monthlyKwh: 150 },
    food: { dietType: 'vegetarian', wasteLevel: 'low' },
    consumption: { shoppingFrequency: 'moderate' }
  };

  const fp = calculateFootprint(answers);
  assert.ok(Array.isArray(fp.categories));
  assert.ok(Array.isArray(fp.ranked));
  assert.ok(fp.grandTotal > 0);
  assert.ok(fp.comparison.vsGlobalAveragePercent !== undefined);

  const calculatedSum = fp.categories.reduce((acc, cat) => acc + cat.total, 0);
  assert.strictEqual(fp.grandTotal, calculatedSum);
});

console.log(`\nCalculator Tests: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
