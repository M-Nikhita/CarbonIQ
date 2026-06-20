const express = require('express');
const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { result, recommendations } = req.body;
    if (!result || !recommendations) {
      return res.status(400).json({ error: 'Missing result or recommendations' });
    }

    const grandTotal = result.grandTotal;
    const ranked = result.ranked || [];
    const comparison = result.comparison || {};
    const topCategory = ranked[0] ? ranked[0].label : 'N/A';

    // Build the fallback rule-based advice
    let fallbackText = `Your estimated annual carbon footprint is ${grandTotal} kg CO2e. `;
    if (comparison.vsGlobalAveragePercent > 0) {
      fallbackText += `This is ${comparison.vsGlobalAveragePercent}% above the global average of 4700 kg CO2e. `;
    } else {
      fallbackText += `This is ${Math.abs(comparison.vsGlobalAveragePercent)}% below the global average of 4700 kg CO2e. `;
    }

    fallbackText += `Your highest impact category is ${topCategory}. `;

    if (recommendations && recommendations.length > 0) {
      const recStrings = recommendations.map(r => r.text);
      fallbackText += `To reduce your carbon footprint, we suggest: ${recStrings.join(' ')} `;
    }
    fallbackText += `Every small choice counts, and tracking your actions is the first step toward a more sustainable future.`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        advice: fallbackText,
        source: 'rule-based'
      });
    }

    // Call Gemini API using native fetch
    try {
      const prompt = `
You are CarbonIQ, an encouraging carbon-awareness assistant.
Here is the user's carbon footprint report:
- Grand Total annual emissions: ${grandTotal} kg CO2e.
- Breakdown of categories (sorted descending): ${ranked.map(c => `${c.label}: ${c.total} kg CO2e`).join(', ')}.
- Comparison to global average: ${comparison.vsGlobalAveragePercent}% ${comparison.vsGlobalAveragePercent >= 0 ? 'above' : 'below'}.
- Top recommendations:
${recommendations.map((r, i) => `${i + 1}. ${r.text} (Savings: ${r.savingsKg} kg)`).join('\n')}

Please write a warm, encouraging, conversational summary of these results (4 to 6 sentences).
Do NOT invent any new numbers, statistics, or metrics. Only reference the figures given above.
Do NOT use markdown formatting (no bolding, no asterisks, no headers). Plain conversational text only.
`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ]
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API responded with status ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('Gemini API response did not contain text content');
      }

      res.json({
        advice: text.trim(),
        source: 'gemini'
      });
    } catch (apiError) {
      console.error('Gemini API error, falling back to rule-based advice:', apiError.message);
      res.json({
        advice: fallbackText,
        source: 'rule-based'
      });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
