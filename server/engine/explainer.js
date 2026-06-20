/**
 * Performs a basic sensitivity analysis on a calculation by perturbing
 * each numeric input by +10% and measuring the resulting % change in output.
 * Identifies which input the result is most sensitive to.
 *
 * @param {Function} calcFn - a pure function from calculator.js or comparator.js
 * @param {Object} inputs - the exact inputs that were passed to calcFn
 * @param {Function} extractOutput - given calcFn's return value, returns the single number to track
 */
function explainSensitivity(calcFn, inputs, extractOutput) {
  const baselineResult = calcFn(inputs);
  const baselineOutput = extractOutput(baselineResult);

  const sensitivities = [];

  // Identify all numeric keys in the inputs
  const numericKeys = Object.keys(inputs).filter(key => typeof inputs[key] === 'number');

  if (numericKeys.length === 0) {
    return {
      baselineOutput,
      sensitivities: [],
      mostSensitiveInput: null,
      explanationText: "This estimate has no variable inputs — it's a fixed zero-emission option."
    };
  }

  numericKeys.forEach(key => {
    // Clone inputs and perturb
    const perturbedInputs = { ...inputs };
    perturbedInputs[key] = inputs[key] * 1.1;

    const perturbedResult = calcFn(perturbedInputs);
    const perturbedOutput = extractOutput(perturbedResult);

    let percentChange = 0;
    if (baselineOutput !== 0) {
      percentChange = ((perturbedOutput - baselineOutput) / baselineOutput) * 100;
    } else if (perturbedOutput !== 0) {
      percentChange = 100; // From 0 to non-zero is technically a big change
    }

    // Round to 1 decimal place
    percentChange = Math.round(percentChange * 10) / 10;

    sensitivities.push({
      input: key,
      originalValue: inputs[key],
      percentChangeInOutput: percentChange
    });
  });

  // Sort descending by absolute percent change
  sensitivities.sort((a, b) => Math.abs(b.percentChangeInOutput) - Math.abs(a.percentChangeInOutput));

  const mostSensitive = sensitivities[0];
  const mostSensitiveInput = mostSensitive.input;
  const percentChangeInOutput = mostSensitive.percentChangeInOutput;

  let explanationText = '';
  if (sensitivities.length === 1) {
    explanationText = `This estimate is most sensitive to ${mostSensitiveInput}. A 10% increase there shifts the result by ${percentChangeInOutput}%.`;
  } else if (sensitivities.length > 1) {
    const nextMost = sensitivities[1];
    explanationText = `This estimate is most sensitive to ${mostSensitiveInput}. A 10% increase there shifts the result by ${percentChangeInOutput}%, compared to ${nextMost.input} at ${nextMost.percentChangeInOutput}%.`;
  } else {
    explanationText = "This estimate has no variable inputs — it's a fixed zero-emission option.";
  }

  return {
    baselineOutput,
    sensitivities,
    mostSensitiveInput,
    explanationText
  };
}

module.exports = {
  explainSensitivity
};
