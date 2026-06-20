const express = require('express');
const router = express.Router();
const { compareTransportOptions } = require('../engine/comparator');
const equivalences = require('../data/equivalences.json');

router.post('/', (req, res, next) => {
  try {
    const { distanceKm, options } = req.body;
    
    const dist = typeof distanceKm === 'number' ? distanceKm : Number(distanceKm);
    if (isNaN(dist) || dist <= 0) {
      return res.status(400).json({ error: 'distanceKm must be a positive number' });
    }

    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'options must be an array with at least 2 entries' });
    }

    const comparison = compareTransportOptions({ distanceKm: dist, options });
    const savings = comparison.savingsKgIfBestChosenOverWorst;

    // Calculate smartphone charges equivalence
    const phoneRatio = equivalences.smartphoneCharges.perKg;
    const charges = Math.round(savings * phoneRatio);
    const equivalence = `roughly ${charges.toLocaleString()} smartphone charges`;

    res.json({
      comparison,
      equivalence
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
