# CarbonIQ — Full Build Specification

**Purpose of this document:** This is a complete, self-contained specification for building "CarbonIQ," a carbon footprint decision-support assistant, for the Google PromptWars Challenge 3 ("Carbon Footprint Awareness Platform"). It is written so that any AI coding assistant or developer can implement the project correctly without needing additional context. Follow it section by section, in order. Do not skip the reasoning sections — they explain *why* a structure exists, which matters for keeping implementation decisions consistent.

---

## 0. Project Identity

- **Name:** CarbonIQ
- **One-line pitch:** A carbon-awareness assistant that helps people make better carbon decisions *in the moment* (Decision Mode), backed by a transparent, explainable reasoning engine, with an optional full lifestyle baseline (Baseline Mode) for users who want the bigger picture.
- **Why this framing, not a plain calculator:** Most competing submissions for this challenge will build a one-time "answer a questionnaire → get a footprint score → get generic tips" tool. CarbonIQ is deliberately different in two ways:
  1. It centers on **specific, real-time decisions** ("should I drive or take the train for this trip") rather than only a one-time lifestyle audit — this is closer to how people actually behave and revisit a tool.
  2. It makes its reasoning **explainable on demand** — every number can be interrogated ("why is this the estimate, which input matters most, what's the uncertainty") rather than being a black box. This reads as more technically mature and aligns with "responsible AI" framing.
- Baseline Mode (the classic lifestyle questionnaire) is kept as a secondary feature so "track your footprint" is still fully covered, but it is not the headline.

---

## 1. Tech Stack (exact)

- **Backend:** Node.js (v18+), Express.js
- **Frontend:** React 18 (Vite as the build tool)
- **LLM (optional):** Google Gemini API (`gemini-2.0-flash` model via REST), called only from the backend, never from the browser
- **Persistence:** A single JSON file on disk (`server/data/sessions.json`), read/written via Node's `fs` module — no database
- **Testing:** Plain Node `assert` module, no external test framework (keeps dependencies minimal, keeps repo size down)
- **No TypeScript** — use plain JavaScript with JSDoc comments for clarity, to keep build complexity and repo size low
- **No CSS framework dependency required** — handwritten CSS is acceptable and preferred for size/control, but a lightweight utility approach is fine if preferred

### Hard constraints to respect throughout
- Total repository size must stay under 10 MB. This means:
  - `node_modules/` must NEVER be committed (must be in `.gitignore`)
  - `.env` must NEVER be committed (must be in `.gitignore`, only `.env.example` is committed)
  - No large binary assets, no committed build output folders like `dist/` or `client/dist/`
- Repository must have exactly **one branch** (`main`). All work happens directly on `main`. Do not create feature branches that get merged — if branches are used for organization, they must be deleted before final submission so only `main` remains.
- Repository must be **public** on GitHub.

---

## 2. Repository Structure (exact, final)

```
carbon-footprint-assistant/
├── client/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api.js
│       ├── styles/
│       │   └── global.css
│       └── components/
│           ├── ChatThread.jsx
│           ├── MessageBubble.jsx
│           ├── ModeSelector.jsx
│           ├── DecisionForm.jsx
│           ├── DecisionCard.jsx
│           ├── ExplainPanel.jsx
│           ├── BaselineQuestionnaire.jsx
│           ├── BaselineCard.jsx
│           ├── RecommendationList.jsx
│           └── WhatIfSlider.jsx
├── server/
│   ├── package.json
│   ├── server.js
│   ├── .env.example
│   ├── data/
│   │   ├── emissionFactors.json
│   │   ├── equivalences.json
│   │   └── sessions.json          (created at runtime; commit an empty version: `{"sessions": []}`)
│   ├── engine/
│   │   ├── calculator.js
│   │   ├── calculator.test.js
│   │   ├── comparator.js
│   │   ├── comparator.test.js
│   │   ├── explainer.js
│   │   ├── explainer.test.js
│   │   └── recommender.js
│   └── routes/
│       ├── calculate.js
│       ├── advice.js
│       ├── decision.js
│       ├── explain.js
│       └── sessions.js
├── .gitignore
└── README.md
```

---

## 3. Data Layer (exact contents)

### 3.1 `server/data/emissionFactors.json`

This is the single source of truth for all emission factor constants. Both Baseline Mode and Decision Mode read from this file — never hardcode emission numbers anywhere else in the codebase.

```json
{
  "_meta": {
    "description": "Emission factors used by the calculation engine. Values are approximate global averages compiled from EPA, IPCC, and Our World in Data sources, intended for educational/awareness purposes rather than precise carbon accounting.",
    "unit": "kgCO2e",
    "lastUpdated": "2026"
  },
  "transport": {
    "car": {
      "petrol": { "perKm": 0.192 },
      "diesel": { "perKm": 0.171 },
      "electric": { "perKm": 0.053 },
      "hybrid": { "perKm": 0.106 }
    },
    "motorbike": { "perKm": 0.103 },
    "publicTransit": {
      "bus": { "perKm": 0.105 },
      "train": { "perKm": 0.041 },
      "metro": { "perKm": 0.028 }
    },
    "bicycle": { "perKm": 0 },
    "walk": { "perKm": 0 },
    "flight": {
      "shortHaul": { "perKm": 0.255, "avgTripKm": 800 },
      "longHaul": { "perKm": 0.195, "avgTripKm": 6000 }
    }
  },
  "energy": {
    "electricityPerKwh": 0.475,
    "renewableOffsetFactor": 0.92,
    "avgHouseholdKwhPerPersonPerMonth": 90
  },
  "food": {
    "dietAnnualCO2e": {
      "meatHeavy": 3300,
      "moderateMeat": 2500,
      "vegetarian": 1700,
      "vegan": 1500
    },
    "foodWastePenaltyFactor": {
      "high": 1.25,
      "moderate": 1.1,
      "low": 1.0
    }
  },
  "consumption": {
    "shoppingFrequencyAnnualCO2e": {
      "frequent": 900,
      "moderate": 500,
      "minimal": 200
    },
    "flightsPerYearAvgCO2e": {
      "0": 0,
      "1-2": 600,
      "3-5": 1800,
      "6+": 4000
    }
  },
  "benchmarks": {
    "globalAveragePerYear": 4700,
    "indiaAveragePerYear": 1900,
    "parisAgreementTargetPerYear": 2000,
    "usAveragePerYear": 14700
  }
}
```

### 3.2 `server/data/equivalences.json`

Used to translate raw kgCO2e numbers into relatable comparisons. Keep this small and only use it for display copy, never for core calculations.

```json
{
  "_meta": {
    "description": "Approximate equivalences to make kgCO2e figures relatable. Educational use only.",
    "unit": "kgCO2e"
  },
  "treeMonthsToAbsorb": { "perKg": 0.0545 },
  "smartphoneCharges": { "perKg": 121.95 },
  "kmDrivenPetrolCar": { "perKg": 5.2 },
  "ledBulbHoursVsIncandescent": { "perKg": 153.8 }
}
```

These are "per kg" multipliers — e.g., `kgCO2e * treeMonthsToAbsorb.perKg = tree-months needed to absorb that amount`. Use these to generate copy like: *"That's roughly equivalent to charging a phone 340 times."*

### 3.3 `server/data/sessions.json`

Committed in the repo as an empty seed so the app works on first clone:

```json
{ "sessions": [] }
```

**Session record shape** (each entry appended by the backend at runtime):

```json
{
  "id": "string (uuid or timestamp-based)",
  "userId": "string (simple name/identifier the user enters, no auth)",
  "createdAt": "ISO timestamp",
  "type": "baseline | decision",
  "payload": "the full result object returned by /api/calculate or /api/decision",
  "committed": "boolean (true if user chose to act on the recommendation)",
  "committedAt": "ISO timestamp or null"
}
```

---

## 4. Backend Engine Modules (exact logic specification)

All engine modules are **pure functions** — no side effects, no I/O, fully unit-testable, importable independently. Side effects (reading/writing `sessions.json`, calling Gemini) only happen inside `routes/`, never inside `engine/`.

### 4.1 `server/engine/calculator.js`

Already specified logic (build exactly this):

- `calculateTransport({ mode, fuelType, weeklyKm, transitType, flightsPerYear })` → returns `{ commute, flights, total }` in kgCO2e/year.
  - `mode` ∈ `"car" | "motorbike" | "publicTransit" | "bicycle" | "walk"`
  - If `mode === "car"`: use `transport.car[fuelType].perKm`, default to `"petrol"` if `fuelType` missing/invalid.
  - If `mode === "motorbike"`: use `transport.motorbike.perKm`.
  - If `mode === "publicTransit"`: use `transport.publicTransit[transitType].perKm`, default to `"bus"`.
  - If `mode === "bicycle"` or `"walk"`: commute total is `0`.
  - `weeklyCO2e * 52` = annual commute total.
  - Flights: look up `consumption.flightsPerYearAvgCO2e[flightsPerYear]`, default `0` if missing.
  - `total = commute + flights`, all rounded to nearest integer.

- `calculateEnergy({ householdSize, usesRenewable, monthlyKwh })` → returns `{ total }`.
  - If `monthlyKwh` not provided, estimate as `energy.avgHouseholdKwhPerPersonPerMonth * householdSize`.
  - `annualCO2e = estimatedKwh * 12 * energy.electricityPerKwh`.
  - If `usesRenewable` is true, multiply by `(1 - energy.renewableOffsetFactor)`.
  - Divide by `householdSize` (minimum 1) to get a **per-person** figure — this avoids penalizing people in larger households for shared infrastructure.
  - Round to nearest integer.

- `calculateFood({ dietType, wasteLevel })` → returns `{ total }`.
  - Base value from `food.dietAnnualCO2e[dietType]`, default `"moderateMeat"` if invalid.
  - Multiply by `food.foodWastePenaltyFactor[wasteLevel]`, default `"moderate"` (factor `1.1`) if invalid.
  - Round to nearest integer.

- `calculateConsumption({ shoppingFrequency })` → returns `{ total }`.
  - Value from `consumption.shoppingFrequencyAnnualCO2e[shoppingFrequency]`, default `"moderate"` if invalid.

- `calculateFootprint(answers)` → the main entry point for Baseline Mode.
  - `answers` shape: `{ transport: {...}, energy: {...}, food: {...}, consumption: {...} }` (each sub-object matches the params above; missing sub-objects default to `{}`).
  - Calls all four functions above, assembles:
    ```js
    {
      categories: [
        { key: "transport", label: "Transport", total, detail: {...} },
        { key: "energy", label: "Home Energy", total, detail: {...} },
        { key: "food", label: "Food & Diet", total, detail: {...} },
        { key: "consumption", label: "Shopping & Consumption", total, detail: {...} }
      ],
      ranked: [ /* same objects, sorted descending by total */ ],
      grandTotal: number, // sum of all category totals, rounded
      benchmarks: { ...from emissionFactors.json },
      comparison: {
        vsGlobalAveragePercent: number, // ((grandTotal - globalAveragePerYear) / globalAveragePerYear) * 100, rounded
        vsParisTargetPercent: number    // same formula vs parisAgreementTargetPerYear
      }
    }
    ```

### 4.2 `server/engine/comparator.js` (NEW)

Purpose: power Decision Mode by comparing two or more options for a specific decision, using the *same* per-km/per-unit factors as `calculator.js` — do not duplicate factor logic, import and reuse it.

Required export:

```js
/**
 * Compares N options for a transport decision and returns each
 * option's CO2e plus a ranked verdict.
 *
 * @param {Object} params
 * @param {number} params.distanceKm - distance for this specific trip
 * @param {Array<Object>} params.options - e.g.
 *   [
 *     { id: "car-petrol", label: "Drive (petrol car)", mode: "car", fuelType: "petrol" },
 *     { id: "train", label: "Take the train", mode: "publicTransit", transitType: "train" },
 *     { id: "flight-short", label: "Fly", mode: "flight", flightType: "shortHaul" }
 *   ]
 * @returns {Object} {
 *   distanceKm,
 *   results: [ { id, label, co2eKg, ...inputUsed } ], // sorted ascending by co2eKg (lowest impact first)
 *   best: { id, label, co2eKg },       // results[0]
 *   worst: { id, label, co2eKg },      // results[results.length - 1]
 *   savingsKgIfBestChosenOverWorst: number
 * }
 */
function compareTransportOptions({ distanceKm, options }) { /* ... */ }

module.exports = { compareTransportOptions };
```

**Implementation notes:**
- For `mode: "car"` / `"motorbike"` / `"publicTransit"`: `co2eKg = distanceKm * factor.perKm` (look up factor exactly as `calculator.js` does).
- For `mode: "flight"`: `co2eKg = distanceKm * transport.flight[flightType].perKm` (ignore `avgTripKm`, which is only used in Baseline Mode's flights-per-year estimate, not here — Decision Mode always works from an actual distance).
- For `mode: "bicycle"` / `"walk"`: `co2eKg = 0`.
- Sort `results` ascending by `co2eKg`.
- This function must remain decision-type-agnostic in structure even though only transport is implemented first — if time permits, a near-identical `comparePurchaseOptions` or `compareFoodOptions` can be added later following the same input/output shape pattern.

### 4.3 `server/engine/explainer.js` (NEW)

Purpose: the "trust layer." Given a calculation function, its inputs, and the result, perform a simple sensitivity analysis and return a human-explainable breakdown.

Required export:

```js
/**
 * Performs a basic sensitivity analysis on a calculation by
 * perturbing each numeric input by +10% and measuring the
 * resulting % change in output. Identifies which input the
 * result is most sensitive to.
 *
 * @param {Function} calcFn - a pure function from calculator.js or comparator.js
 * @param {Object} inputs - the exact inputs that were passed to calcFn
 * @param {Function} extractOutput - given calcFn's return value, returns the single number to track (e.g. result => result.total)
 * @returns {Object} {
 *   baselineOutput: number,
 *   sensitivities: [
 *     { input: "weeklyKm", originalValue: 150, percentChangeInOutput: number }
 *   ], // sorted descending by absolute percentChangeInOutput
 *   mostSensitiveInput: string, // sensitivities[0].input
 *   explanationText: string // human-readable sentence, see below
 * }
 */
function explainSensitivity(calcFn, inputs, extractOutput) { /* ... */ }

module.exports = { explainSensitivity };
```

**Implementation notes:**
- Only perturb keys in `inputs` whose values are of type `number` (skip strings like `mode` or `fuelType` — sensitivity analysis here is about magnitude inputs, not categorical choices).
- For each numeric key: clone `inputs`, multiply that key's value by `1.1`, call `calcFn(perturbedInputs)`, extract output via `extractOutput`, compute `% change = ((perturbedOutput - baselineOutput) / baselineOutput) * 100`.
- `explanationText` template: `"This estimate is most sensitive to {mostSensitiveInput}. A 10% increase there shifts the result by {percentChangeInOutput}%, compared to {nextMostSensitiveInput} at {itsPercentChangeInOutput}%."` — if there's only one numeric input, simplify to a single-factor sentence.
- If `inputs` has zero numeric keys (e.g., a pure walk/bicycle case with no distance), return `sensitivities: []` and `explanationText: "This estimate has no variable inputs — it's a fixed zero-emission option."`

### 4.4 `server/engine/recommender.js`

Already specified rule-based recommendation engine (reuse as already designed): a `RULES` array of `{ id, category, appliesTo(answers), estimateSavingsKg(answers, result), text(savings) }` objects, and `generateRecommendations(answers, result, limit = 3)` which filters applicable rules, computes savings, sorts descending by savings, returns the top `limit`.

Required rules to include at minimum (each tied to a specific condition):
- Switch car commute to transit (if `mode === "car"`)
- Switch petrol to hybrid/EV (if `mode === "car" && fuelType === "petrol"`)
- Reduce flights (if `flightsPerYear` is `"3-5"` or `"6+"`)
- Go renewable (if `!usesRenewable`)
- Efficient appliances (always applicable, smaller savings)
- Reduce meat (if `dietType === "meatHeavy"`)
- Reduce food waste (if `wasteLevel === "high"`)
- Mindful shopping (if `shoppingFrequency === "frequent"`)

---

## 5. Backend API Routes (exact contracts)

All routes are mounted under `/api` in `server.js`. All responses are JSON. All routes must validate their input and return `400` with a clear `{ error: string }` body on invalid input, and `500` with `{ error: string }` on internal failure — never let an unhandled exception crash the process or leak a stack trace to the client.

### 5.1 `POST /api/calculate`
- **Body:** `{ transport: {...}, energy: {...}, food: {...}, consumption: {...} }` (Baseline Mode answers, shapes as in §4.1)
- **Response 200:** `{ result: <calculateFootprint output>, recommendations: <generateRecommendations output> }`
- **Response 400:** if body is missing or not an object.

### 5.2 `POST /api/advice`
- **Body:** `{ result: <object from /api/calculate>, recommendations: <array from /api/calculate> }`
- **Behavior:**
  1. Build a fallback templated string from `result` and `recommendations` (always computed, regardless of Gemini availability).
  2. If `process.env.GEMINI_API_KEY` is unset, return `{ advice: fallbackText, source: "rule-based" }` immediately.
  3. Otherwise, call Gemini's `generateContent` REST endpoint with a prompt that:
     - States the category breakdown and grand total as fixed facts
     - States the top recommendations (with their already-computed savings) as fixed facts
     - Explicitly instructs the model: *"Do NOT invent any new numbers or statistics — only reference the figures given above. Do NOT use markdown formatting. Plain conversational text only."*
     - Requests a 4–6 sentence warm, encouraging summary
  4. On any Gemini error (non-200 response, missing text in response, network failure), catch it, log server-side, and fall back to the templated string — never let a Gemini failure break the user-facing response.
- **Response 200:** `{ advice: string, source: "gemini" | "rule-based" }`

### 5.3 `POST /api/decision`
- **Body:** `{ distanceKm: number, options: [ { id, label, mode, fuelType?, transitType?, flightType? } ] }`
- **Behavior:** calls `compareTransportOptions`, then for the `best` and `worst` results, attaches an equivalence string computed from `equivalences.json` (e.g., phone charges equivalent of `savingsKgIfBestChosenOverWorst`).
- **Response 200:**
  ```json
  {
    "comparison": { "distanceKm": 0, "results": [], "best": {}, "worst": {}, "savingsKgIfBestChosenOverWorst": 0 },
    "equivalence": "string, e.g. 'roughly 340 smartphone charges'"
  }
  ```
- **Response 400:** if `distanceKm` is not a positive number, or `options` has fewer than 2 entries.

### 5.4 `POST /api/explain`
- **Body:** `{ type: "baseline" | "decision", inputs: {...}, category?: string }`
  - If `type === "baseline"`, `category` must be one of `"transport" | "energy" | "food" | "consumption"`, and the route picks the matching `calculate*` function from `calculator.js`, with `extractOutput = result => result.total`.
  - If `type === "decision"`, the route uses `compareTransportOptions` for a single option's inputs (distance + one option's mode/fuelType), with `extractOutput = result => result.co2eKg` — note: for decision explain calls, only pass one option's worth of inputs (e.g., `{ distanceKm, mode, fuelType }`), not the full multi-option comparator input.
- **Behavior:** calls `explainSensitivity` with the appropriate function/inputs/extractor.
- **Response 200:** the full object shape returned by `explainSensitivity` (§4.3).
- **Response 400:** if `type` or required fields are missing/invalid.

### 5.5 `GET /api/sessions/:userId`
- **Response 200:** `{ sessions: [ /* filtered from sessions.json where userId matches, sorted by createdAt descending */ ] }`
- **Response 200 with empty array** if no sessions exist for that user (not a 404 — empty history is a valid, expected state, not an error).

### 5.6 `POST /api/sessions`
- **Body:** `{ userId: string, type: "baseline" | "decision", payload: object }`
- **Behavior:** appends a new session record (shape in §3.3) to `sessions.json`, generates `id` (use `crypto.randomUUID()`), sets `createdAt` to current ISO timestamp, `committed: false`, `committedAt: null`.
- **Response 201:** the full created session record.
- **Response 400:** if `userId`, `type`, or `payload` missing.

### 5.7 `PATCH /api/sessions/:sessionId/commit`
- **Behavior:** finds the session by `id`, sets `committed: true`, `committedAt` to current ISO timestamp, persists back to `sessions.json`.
- **Response 200:** the updated session record.
- **Response 404:** if no session with that `id` exists.

---

## 6. Backend Entry Point: `server/server.js`

Exact responsibilities:
1. Load environment variables via `dotenv` (`require('dotenv').config()`).
2. Create an Express app, apply `express.json()` middleware and a permissive CORS middleware (since the React dev server runs on a different port — use the `cors` npm package, configured for `origin: true` in development; note in code comments that this should be tightened to a specific origin if ever deployed beyond localhost).
3. Mount all routes from §5 under their respective `/api/*` paths.
4. Add a catch-all error-handling middleware (4 args: `err, req, res, next`) that logs the error server-side and returns `500 { error: "Internal server error" }` — this is the last line of defense against leaking stack traces.
5. Listen on `process.env.PORT || 5000`, log a clear startup message including whether `GEMINI_API_KEY` is detected (e.g., `"Gemini integration: enabled"` or `"Gemini integration: disabled (set GEMINI_API_KEY in .env to enable)"`) — this makes the optional-LLM behavior visible and testable immediately on startup, which is good for a reviewer checking graceful degradation.

`server/.env.example`:
```
PORT=5000
GEMINI_API_KEY=
```

---

## 7. Frontend Specification

### 7.1 Overall interaction model

The entire app is a **single chat thread** (`ChatThread.jsx`). There is no separate "page" navigation. Every interaction — mode selection, questionnaire answers, decision inputs, results, recommendations, explain panels — renders as a message bubble in the thread, in chronological order. This is what makes the product *look* like an assistant rather than a form with a chat skin glued on top.

`MessageBubble.jsx` is the base renderer; it accepts a `role` (`"assistant" | "user"`) and a `content` which can be:
- Plain text
- An embedded interactive component (e.g., `ModeSelector`, `DecisionForm`, `DecisionCard`, `BaselineQuestionnaire`, `BaselineCard`, `RecommendationList`, `ExplainPanel`, `WhatIfSlider`)

`App.jsx` holds the message array in state (`useState`) and a simple state machine (`currentStep`) tracking what the assistant is waiting for next. Do not use any external state management library — `useState`/`useReducer` is sufficient for this scope and keeps dependencies minimal.

### 7.2 Conversation flow (exact sequence)

1. **App load:** assistant posts a greeting message, then renders `ModeSelector` — two buttons: "Log a quick decision" / "Build my carbon profile." Also ask for a short name/identifier (plain text input) to key session history — store in React state and `localStorage` is NOT to be used for this (per system constraints on artifacts, though note: this is a standalone repo, not a Claude artifact, so `localStorage` is actually fine here for remembering the userId between visits in this specific project; using it is acceptable since this frontend runs outside the Claude Artifacts sandbox).
2. **If "Log a quick decision":** assistant asks for trip distance (number input, km) and which options to compare (checkbox list: Drive – petrol, Drive – EV, Bus, Train, Metro, Flight – short haul; user picks 2 or more). On submit, call `POST /api/decision`, then render `DecisionCard` with the verdict, savings, and equivalence text. `DecisionCard` includes a "Why this number?" button that expands `ExplainPanel`, which calls `POST /api/explain` with `type: "decision"` for the *best* option's inputs, and renders the sensitivity explanation text. After showing the verdict, assistant asks "Want to commit to the lower-impact option?" — Yes/No buttons; if Yes, call `POST /api/sessions` then `PATCH /api/sessions/:id/commit`.
3. **If "Build my carbon profile":** assistant asks Baseline Mode questions one at a time via `BaselineQuestionnaire`, branching exactly as follows:
   - Transport: "How do you mainly get around?" (car / motorbike / public transit / bicycle / walk). If car → ask fuel type, then weekly km. If motorbike → ask weekly km. If public transit → ask transit type, then weekly km. If bicycle/walk → skip distance question entirely. Then always ask: "How many flights do you take per year?" (0 / 1-2 / 3-5 / 6+).
   - Energy: "How many people in your household?" (number), "Do you use renewable energy (solar/green tariff)?" (yes/no), optionally "Do you know your monthly electricity use in kWh?" (number, optional — skip button available, falls back to estimate).
   - Food: "How would you describe your diet?" (meat-heavy / moderate meat / vegetarian / vegan), "How much food do you typically waste?" (high / moderate / low).
   - Consumption: "How often do you shop for new non-essential items (clothes, gadgets, etc.)?" (frequent / moderate / minimal).
   - On completing all questions, call `POST /api/calculate`, then `POST /api/advice` with its result, then render `BaselineCard` (ranked category bars, grand total, comparison vs. global average/India average/Paris target) followed by `RecommendationList` (top 3 recommendations, each with estimated savings) followed by the advice text (labelled subtly if it came from Gemini vs. rule-based — e.g. a small "AI-enhanced" tag only when `source === "gemini"`, otherwise no tag, to stay honest about data provenance). Then call `POST /api/sessions` to persist this baseline. Offer a "What if?" prompt leading into `WhatIfSlider` (§7.4) if time permits.
4. **Returning visit (userId found in `localStorage`):** before showing `ModeSelector`, call `GET /api/sessions/:userId`. If any sessions exist, assistant opens with a specific callback referencing the most recent committed decision/baseline (e.g., pull the most recent `committed: true` session and reference its `payload` data in a templated sentence) before offering the mode choice again.

### 7.3 `client/src/api.js`

A thin fetch wrapper, one function per backend route, all returning parsed JSON or throwing on non-2xx. Base URL read from `import.meta.env.VITE_API_URL` with fallback `"http://localhost:5000/api"`.

### 7.4 `WhatIfSlider.jsx` (stretch goal, build only after everything above works end-to-end)

A slider for `weeklyKm` (or whichever single numeric input is most relevant to the user's last Baseline Mode answer) that, on change, debounced, calls `POST /api/calculate` again with the modified value and re-renders an updated `grandTotal` live, without creating a new chat message each time (update in place). This demonstrates dynamic recalculation visually and is a strong demo moment, but is explicitly the lowest-priority item — do not start this until §7.2 steps 1–4 work correctly end to end.

### 7.5 Accessibility requirements (apply throughout, non-negotiable for the "Accessibility" eval criterion)

- All interactive elements (buttons, inputs, sliders) must be reachable and operable via keyboard (Tab/Enter/Space), with visible focus states (do not remove default focus outlines without replacing them).
- All form inputs have associated `<label>` elements (not just placeholder text).
- Color is never the only signal for meaning (e.g., "best option" in `DecisionCard` should also say "Lowest impact" in text, not just be colored green).
- Maintain WCAG AA contrast ratios for all text against its background.
- Use semantic HTML elements (`<button>`, `<fieldset>`/`<legend>` for grouped choices, `<main>`, `<section>`) rather than generic `<div>`s with click handlers.
- Chat messages should be added to the DOM in a way screen readers can announce (e.g., an `aria-live="polite"` region wrapping the thread, or at minimum new messages in a logical reading order).

---

## 8. Testing Requirements

Write tests for every pure function in `engine/`. Use Node's built-in `assert` module; no test runner dependency needed. Each test file should be runnable directly via `node engine/<file>.test.js` and should:
- Print a checkmark/cross per test with a descriptive name
- Print a final `"{passed} passed, {failed} failed"` summary
- `process.exit(1)` if any test failed (so it can be wired into a CI step or pre-commit check if desired)

Minimum required test coverage:
- `calculator.test.js`: zero-emission modes (bicycle/walk), fuel-type ordering (petrol > electric for same distance), flights add independently of commute mode, renewable reduces energy footprint, household size divides energy footprint per person, diet ordering (meatHeavy > vegan), waste level increases footprint, shopping frequency ordering, full `calculateFootprint` output shape and category sum consistency, a low-impact lifestyle scenario producing a sane low total.
- `comparator.test.js`: verify `compareTransportOptions` ranks a zero-emission option (bicycle/walk) as `best` when included, verify flight is `worst` when compared against train for the same distance, verify `savingsKgIfBestChosenOverWorst` equals `worst.co2eKg - best.co2eKg`.
- `explainer.test.js`: verify a single-numeric-input case identifies that input as `mostSensitiveInput`, verify a zero-numeric-input case (e.g. walk, no distance involved) returns an empty `sensitivities` array and the fixed explanation text, verify `percentChangeInOutput` sign matches the direction of the perturbation for a simple linear function.

---

## 9. `.gitignore` (exact contents)

```
node_modules/
.env
dist/
client/dist/
*.log
.DS_Store
```

---

## 10. README.md Structure (write this last, once the app is fully working)

1. **Title and one-line pitch**
2. **Chosen vertical:** Carbon Footprint Awareness Platform
3. **The problem with a typical solution** — briefly explain why a one-time questionnaire-and-score tool is weak, to frame why CarbonIQ is built differently
4. **Approach & logic** — explain Decision Mode + Baseline Mode + the explainability layer, referencing the architecture diagram
5. **Architecture diagram** (ASCII or image, from §3 of the original blueprint discussion)
6. **How the solution works** — step-by-step user journey for both modes, matching §7.2 here
7. **Data sources & assumptions** — explicitly state emission factors are approximate global-average educational estimates (cite EPA/IPCC/Our World in Data as general source categories), not precise carbon accounting; state that the explainability/sensitivity analysis is a simplified local perturbation method, not a full statistical uncertainty model
8. **Setup instructions** — exact commands:
   ```
   git clone <repo-url>
   cd carbon-footprint-assistant/server && npm install
   cp .env.example .env   # optionally add GEMINI_API_KEY
   npm start
   # in a second terminal:
   cd carbon-footprint-assistant/client && npm install
   npm run dev
   ```
9. **Testing** — `cd server && node engine/calculator.test.js` (and the other two test files), explain what's covered
10. **Limitations & future work** — be honest: no real user authentication (a simple name-based identifier only), emission factors are global averages not localized per-country precisely (aside from the named benchmarks), sensitivity analysis is a simplified heuristic not a rigorous statistical method, what-if slider (if not completed) listed as a natural next step
11. **Screenshots/GIF** of the chat flow (add after the app is running, for visual impact during judging)

---

## 11. Build Order (do not reorder — later steps depend on earlier ones being correct)

1. `emissionFactors.json`, `equivalences.json`, seed `sessions.json`
2. `calculator.js` + `calculator.test.js` — run and confirm all pass before continuing
3. `comparator.js` + `comparator.test.js` — run and confirm all pass
4. `explainer.js` + `explainer.test.js` — run and confirm all pass
5. `recommender.js`
6. All backend routes (§5), wired in `server.js`
7. Manually verify every route with a tool like `curl` or Postman before touching the frontend
8. Frontend scaffold: `App.jsx`, `ChatThread.jsx`, `MessageBubble.jsx`, `api.js`
9. Decision Mode UI (`ModeSelector`, `DecisionForm`, `DecisionCard`, `ExplainPanel`) wired to live backend
10. Baseline Mode UI (`BaselineQuestionnaire`, `BaselineCard`, `RecommendationList`) wired to live backend
11. Session persistence + commit flow + returning-user callback
12. Accessibility pass across all components
13. `WhatIfSlider.jsx` (only if time remains)
14. `README.md`, final `.gitignore` check, confirm repo size under 10MB, confirm single branch, push

---

## 12. Submission Checklist (verify all before final push)

- [ ] Repo is public
- [ ] Repo has exactly one branch (`main`)
- [ ] Repo size under 10MB (`du -sh .git` and working tree, excluding `.git` history bloat — avoid committing large files at any point in history)
- [ ] `node_modules/` and `.env` are not in the repo (check with `git ls-files | grep node_modules` — should return nothing)
- [ ] App runs from a clean clone following only the README's setup instructions
- [ ] All three test files pass
- [ ] App works fully with `GEMINI_API_KEY` unset (graceful fallback verified manually)
- [ ] README covers all four required sections: vertical, approach/logic, how it works, assumptions
