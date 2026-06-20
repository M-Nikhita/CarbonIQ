const express = require('express');
const router = express.Router();
const { explainSensitivity } = require('../engine/explainer');
const {
  calculateTransport,
  calculateEnergy,
  calculateFood,
  calculateConsumption
} = require('../engine/calculator');
const { compareTransportOptions } = require('../engine/comparator');

router.post('/', (req, res, next) => {
  try {
    const { type, inputs, category } = req.body;

    if (!type || !inputs || typeof inputs !== 'object') {
      return res.status(400).json({ error: 'Missing type or inputs object' });
    }

    let calcFn;
    let extractOutput;

    if (type === 'baseline') {
      if (!category) {
        return res.status(400).json({ error: 'Category is required for baseline explanation' });
      }

      if (category === 'transport') {
        calcFn = calculateTransport;
        extractOutput = (r) => r.total;
      } else if (category === 'energy') {
        calcFn = calculateEnergy;
        extractOutput = (r) => r.total;
      } else if (category === 'food') {
        calcFn = calculateFood;
        extractOutput = (r) => r.total;
      } else if (category === 'consumption') {
        calcFn = calculateConsumption;
        extractOutput = (r) => r.total;
      } else {
        return res.status(400).json({ error: `Invalid baseline category: ${category}` });
      }
    } else if (type === 'decision') {
      // Wrapper for comparing a single transport option
      calcFn = (inp) => {
        const compResult = compareTransportOptions({
          distanceKm: inp.distanceKm,
          options: [{ id: 'opt', label: 'Option', ...inp }]
        });
        return compResult.results[0]; // returns the single option with co2eKg
      };
      extractOutput = (r) => r.co2eKg;
    } else {
      return res.status(400).json({ error: `Invalid type: ${type}` });
    }

    const explanation = explainSensitivity(calcFn, inputs, extractOutput);
    res.json(explanation);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
