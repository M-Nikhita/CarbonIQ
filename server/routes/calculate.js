const express = require('express');
const router = express.Router();
const { calculateFootprint } = require('../engine/calculator');
const { generateRecommendations } = require('../engine/recommender');

router.post('/', (req, res, next) => {
  try {
    const answers = req.body;
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      return res.status(400).json({ error: 'Invalid answers format' });
    }

    const result = calculateFootprint(answers);
    const recommendations = generateRecommendations(answers, result);

    res.json({
      result,
      recommendations
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
