const express = require('express');
const router = express.Router();

function getHeuristicFallback(message, baselineResult) {
  const query = message.toLowerCase();
  
  // 1. Parse distance numbers
  let distance = 0;
  const numMatch = query.match(/\b\d+(\.\d+)?/);
  if (numMatch) {
    distance = parseFloat(numMatch[0]);
  }

  // 2. Greetings
  if (query.includes('hello') || query.includes('hi') || query.includes('hey')) {
    return "Hi there! I am CarbonIQ, your carbon intelligence assistant. Ask me about your baseline footprint, trip offsets, diet choices, or home energy reduction.";
  }

  // 3. Trip Comparator and travel comparisons (e.g. flight, train, car)
  if (query.includes('train') || query.includes('car') || query.includes('fly') || query.includes('flight') || query.includes('travel') || query.includes('commute') || query.includes('driving')) {
    if (distance > 0) {
      const carEmissions = Math.round(distance * 0.171);
      const trainEmissions = Math.round(distance * 0.020);
      const flightEmissions = Math.round(distance * 0.150);
      const savings = carEmissions - trainEmissions;

      if (query.includes('train') && (query.includes('fly') || query.includes('flight'))) {
        const flightSavings = flightEmissions - trainEmissions;
        return `Traveling ${distance} km by flight emits roughly ${flightEmissions} kg CO2e, whereas taking a train emits only ${trainEmissions} kg CO2e. Switching from flying to rail saves about ${flightSavings} kg CO2e (an 86% reduction).`;
      }
      return `For a ${distance} km trip, driving a petrol car emits around ${carEmissions} kg CO2e, whereas taking the train emits only ${trainEmissions} kg CO2e. By choosing the train, you save ${savings} kg CO2e, cutting emissions by over 85%.`;
    }
    return "Commuting by petrol car emits about 171g CO2e/km, whereas a train emits only 20g/km. You can compare specific trip distances using the Trip Comparator tab to see exact savings.";
  }

  // 4. Personalized footprint contributors
  if (query.includes('my') && (query.includes('contributor') || query.includes('biggest') || query.includes('highest') || query.includes('footprint') || query.includes('most'))) {
    if (baselineResult && baselineResult.grandTotal !== undefined) {
      const grandTotal = baselineResult.grandTotal;
      const ranked = baselineResult.ranked || [];
      if (ranked.length > 0) {
        const top = ranked[0];
        const percent = Math.round((top.total / grandTotal) * 100);
        return `Based on your baseline audit, your biggest carbon contributor is ${top.label.toUpperCase()} emitting ${top.total.toLocaleString()} kg CO2e annually (${percent}% of your grand total: ${grandTotal.toLocaleString()} kg). You can find suggestions to reduce this under the advisor panel on your Dashboard.`;
      }
    }
    return "To see your biggest carbon contributors, please complete your baseline audit in the Dashboard tab! Generally, driving gasoline vehicles and eating high-meat diets are the largest contributors for most individuals.";
  }

  // 5. Diet and food
  if (query.includes('diet') || query.includes('food') || query.includes('meat') || query.includes('beef') || query.includes('tofu') || query.includes('eat')) {
    return "Dietary choices have a major footprint impact. Producing beef generates ~60 kg CO2e/kg, whereas plant-based proteins like tofu generate only ~3 kg CO2e/kg. Transitioning to a vegetarian or vegan lifestyle can cut your diet emissions by 50% to 90%.";
  }

  // 6. Energy and Utilities
  if (query.includes('energy') || query.includes('electricity') || query.includes('solar') || query.includes('utility') || query.includes('home') || query.includes('appliances')) {
    return "Standard grid power emits roughly 0.4 kg CO2e per kWh. Switching to a certified 100% renewable power provider or installing solar panels offsets up to 92% of your home's electricity footprint.";
  }

  // 7. General redirect / default tip
  return "CarbonIQ is specialized in carbon footprint analysis. Try asking about your baseline footprint, comparing travel options (e.g. car vs train), or reducing diet and energy emissions.";
}

router.post('/', async (req, res, next) => {
  try {
    const { message, userId, baselineResult } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required and must be a non-empty string.' });
    }

    const trimmedMsg = message.trim();
    const username = userId || 'User';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        reply: getHeuristicFallback(trimmedMsg, baselineResult),
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
        let errorMsg = `Gemini API responded with status ${response.status}`;
        try {
          const errData = await response.json();
          if (errData?.error?.message) {
            errorMsg += `: ${errData.error.message.trim()}`;
          }
        } catch (_) {}
        throw new Error(errorMsg);
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
      console.error('Gemini API error in chat route, falling back to heuristic:', apiError.message);
      res.json({
        reply: getHeuristicFallback(trimmedMsg, baselineResult),
        source: 'fallback'
      });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
