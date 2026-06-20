require('dotenv').config();
const express = require('express');
const cors = require('cors');

const calculateRoute = require('./routes/calculate');
const adviceRoute = require('./routes/advice');
const decisionRoute = require('./routes/decision');
const explainRoute = require('./routes/explain');
const sessionsRoute = require('./routes/sessions');

const app = express();

// Apply middleware
// Permissive CORS for development since the React frontend runs on port 5173
// NOTE: For a production deployment, this should be restricted to the specific frontend origin.
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Mount API routes
app.use('/api/calculate', calculateRoute);
app.use('/api/advice', adviceRoute);
app.use('/api/decision', decisionRoute);
app.use('/api/explain', explainRoute);
app.use('/api/sessions', sessionsRoute);

// Simple health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Catch-all error-handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`CarbonIQ Server is running on port ${PORT}`);
  
  if (process.env.GEMINI_API_KEY) {
    console.log(`Gemini integration: ENABLED (found GEMINI_API_KEY)`);
  } else {
    console.log(`Gemini integration: DISABLED (set GEMINI_API_KEY in .env to enable)`);
  }
  console.log(`==================================================`);
});
