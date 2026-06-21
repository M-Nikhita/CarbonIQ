const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const sessionsFilePath = path.join(__dirname, '../data/sessions.json');

// In-memory cache
let dbCache = null;

// Helper to load sessions from the JSON file
async function loadSessions() {
  if (dbCache !== null) {
    return dbCache;
  }
  try {
    const data = await fs.readFile(sessionsFilePath, 'utf8');
    dbCache = JSON.parse(data);
    return dbCache;
  } catch (error) {
    // If the file doesn't exist or is corrupted, return a seed template
    dbCache = { sessions: [] };
    return dbCache;
  }
}

// Helper to save sessions to the JSON file
async function saveSessions(data) {
  dbCache = data;
  await fs.writeFile(sessionsFilePath, JSON.stringify(data, null, 2), 'utf8');
}

// 1. GET /api/sessions/:userId
router.get('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const db = await loadSessions();

    const userSessions = db.sessions
      .filter(s => s.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ sessions: userSessions });
  } catch (error) {
    next(error);
  }
});

// 2. POST /api/sessions
router.post('/', async (req, res, next) => {
  try {
    const { userId, type, payload } = req.body;

    if (!userId || !type || !payload) {
      return res.status(400).json({ error: 'Missing userId, type, or payload' });
    }

    if (type !== 'baseline' && type !== 'decision') {
      return res.status(400).json({ error: 'Type must be baseline or decision' });
    }

    const db = await loadSessions();

    const newSession = {
      id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'),
      userId,
      createdAt: new Date().toISOString(),
      type,
      payload,
      committed: false,
      committedAt: null
    };

    db.sessions.push(newSession);
    await saveSessions(db);

    res.status(201).json(newSession);
  } catch (error) {
    next(error);
  }
});

// 3. PATCH /api/sessions/:sessionId/commit
router.patch('/:sessionId/commit', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const db = await loadSessions();

    const sessionIndex = db.sessions.findIndex(s => s.id === sessionId);

    if (sessionIndex === -1) {
      return res.status(404).json({ error: 'Session not found' });
    }

    db.sessions[sessionIndex].committed = true;
    db.sessions[sessionIndex].committedAt = new Date().toISOString();

    await saveSessions(db);

    res.json(db.sessions[sessionIndex]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
