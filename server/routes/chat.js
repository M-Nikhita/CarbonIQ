const express = require('express');
const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { message, userId, baselineResult } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required and must be a non-empty string.' });
    }

    const trimmedMsg = message.trim();
    const username = userId || 'User';

    // 1. Build the fallback/offline message
    const fallbackText = "I'm not able to reach my AI assistant right now, but you can get a precise answer using Decision Mode or Baseline Mode above.";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        reply: fallbackText,
        source: 'fallback'
      });
    }

    // 2. Build the grounding prompt
    let footprintContext = '';
    if (baselineResult && baselineResult.grandTotal !== undefined) {
      const grandTotal = baselineResult.grandTotal;
      const ranked = baselineResult.ranked || [];
      const comparison = baselineResult.comparison || {};
      
      footprintContext = `- User's baseline annual carbon footprint: ${grandTotal} kg CO2e.
- Breakdown of categories (sorted descending): ${ranked.map(c => `${c.label}: ${c.total} kg CO2e`).join(', ')}.
- Comparison to global average: ${comparison.vsGlobalAveragePercent}% ${comparison.vsGlobalAveragePercent >= 0 ? 'above' : 'below'} average.`;
    } else {
      footprintContext = '- User has not completed their carbon baseline audit yet. Encourage them to do so in the Dashboard tab.';
    }

    const systemPrompt = `
You are CarbonIQ, an expert CleanTech carbon-reduction AI assistant.
Your goal is to answer the user's questions about carbon footprints, climate impact, sustainability practices, energy efficiency, and environmental emissions.

User Context:
- User Name: ${username}
${footprintContext}

Rules:
1. Answer the specific question asked by the user in a warm, friendly, conversational, and direct manner.
2. If the user asks for comparisons (e.g. flying vs train, beef vs tofu, driving vs biking), provide approximate estimates using standard emission factors from general knowledge, but note that they can use the Trip Comparator or Baseline Audit in the app for precise calculations.
3. Keep the response short and concise (between 2 to 5 sentences).
4. Do NOT use markdown formatting (no bolding, no asterisks, no headers). Plain conversational text only.
5. If the user asks something completely unrelated to carbon footprints, climate change, greenhouse gas emissions, CleanTech, or sustainability, you must gently redirect them to focus on carbon footprint and environmental topics. For example, explain that you are specialized in carbon intelligence.

User's message: "${trimmedMsg}"
`;

    // 3. Request Gemini API
    try {
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
                    text: systemPrompt
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
        reply: text.trim(),
        source: 'gemini'
      });
    } catch (apiError) {
      console.error('Gemini API error in chat route, falling back:', apiError.message);
      res.json({
        reply: fallbackText,
        source: 'fallback'
      });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
