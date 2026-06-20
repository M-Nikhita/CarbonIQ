const assert = require('assert');
const { explainSensitivity } = require('./explainer');

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

// 1. Single numeric input case
runTest('Identifies single numeric input as most sensitive', () => {
  const calcFn = (inputs) => ({ total: inputs.x * 5 });
  const inputs = { x: 10, mode: 'fixed' };
  const extractOutput = (result) => result.total;

  const explanation = explainSensitivity(calcFn, inputs, extractOutput);

  assert.strictEqual(explanation.mostSensitiveInput, 'x');
  assert.strictEqual(explanation.sensitivities.length, 1);
  assert.strictEqual(explanation.sensitivities[0].percentChangeInOutput, 10); // x * 1.1 -> output * 1.1 -> 10% change
});

// 2. Zero numeric input case
runTest('Zero numeric inputs yields empty sensitivities and fixed explanation text', () => {
  const calcFn = () => ({ total: 0 });
  const inputs = { mode: 'walk', label: 'Walk' };
  const extractOutput = (result) => result.total;

  const explanation = explainSensitivity(calcFn, inputs, extractOutput);

  assert.strictEqual(explanation.mostSensitiveInput, null);
  assert.strictEqual(explanation.sensitivities.length, 0);
  assert.ok(explanation.explanationText.includes("no variable inputs"));
});

// 3. Percent change sign matches perturbation direction (linear function)
runTest('Percent change sign matches perturbation direction for a positive linear function', () => {
  const calcFn = (inputs) => ({ total: inputs.x * 2.5 });
  const inputs = { x: 20 };
  const extractOutput = (result) => result.total;

  const explanation = explainSensitivity(calcFn, inputs, extractOutput);

  assert.strictEqual(explanation.sensitivities[0].percentChangeInOutput, 10); // (2.5 * 22 - 50) / 50 * 100 = 10%
  assert.ok(explanation.sensitivities[0].percentChangeInOutput > 0);
});

console.log(`\nExplainer Tests: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
