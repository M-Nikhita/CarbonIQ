const assert = require('assert');
const { compareTransportOptions } = require('./comparator');

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

// 1. Verify zero-emission option (bicycle/walk) is best when included
runTest('Bicycle or walk is identified as the best option', () => {
  const result = compareTransportOptions({
    distanceKm: 50,
    options: [
      { id: 'car-petrol', label: 'Drive Petrol', mode: 'car', fuelType: 'petrol' },
      { id: 'walk', label: 'Walk', mode: 'walk' }
    ]
  });

  assert.strictEqual(result.best.id, 'walk');
  assert.strictEqual(result.best.co2eKg, 0);
});

// 2. Verify flight is worst compared to train for same distance
runTest('Flight is worse than train for same distance', () => {
  const result = compareTransportOptions({
    distanceKm: 800,
    options: [
      { id: 'flight-short', label: 'Short Flight', mode: 'flight', flightType: 'shortHaul' },
      { id: 'train', label: 'Train', mode: 'publicTransit', transitType: 'train' }
    ]
  });

  assert.strictEqual(result.best.id, 'train');
  assert.strictEqual(result.worst.id, 'flight-short');
  assert.ok(result.worst.co2eKg > result.best.co2eKg);
});

// 3. Verify savings calculation equals worst.co2eKg - best.co2eKg
runTest('savingsKgIfBestChosenOverWorst equals worst.co2eKg - best.co2eKg', () => {
  const result = compareTransportOptions({
    distanceKm: 150,
    options: [
      { id: 'car-petrol', label: 'Drive Petrol', mode: 'car', fuelType: 'petrol' },
      { id: 'train', label: 'Train', mode: 'publicTransit', transitType: 'train' },
      { id: 'bus', label: 'Bus', mode: 'publicTransit', transitType: 'bus' }
    ]
  });

  const expectedSavings = Math.round((result.worst.co2eKg - result.best.co2eKg) * 100) / 100;
  assert.strictEqual(result.savingsKgIfBestChosenOverWorst, expectedSavings);
});

console.log(`\nComparator Tests: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
