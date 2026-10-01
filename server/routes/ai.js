import express from 'express';
import { getDatabase } from '../config/database.js';
import { chat, getConversationHistory } from '../utils/ai.js';

const router = express.Router();
const db = getDatabase();

// Chat endpoint
router.post('/chat', async (req, res, next) => {
  try {
    const { message, sessionId } = req.body;
    const userId = req.session?.user?.id || null;

    if (!message || !sessionId) {
      return res.status(400).json({ error: 'Message and sessionId are required' });
    }

    // Store user message
    const insertStmt = db.prepare(`
      INSERT INTO ai_conversations (user_id, session_id, role, content)
      VALUES (?, ?, 'user', ?)
    `);
    insertStmt.run(userId, sessionId, message);

    // Get AI response
    const response = await chat(message, sessionId);

    // Store AI response
    insertStmt.run(userId, sessionId, 'assistant', response);

    res.json({ message: response });
  } catch (err) {
    next(err);
  }
});

// Get conversation history
router.get('/history/:sessionId', (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const stmt = db.prepare(`
      SELECT role, content, created_at FROM ai_conversations
      WHERE session_id = ?
      ORDER BY created_at ASC
    `);
    const history = stmt.all(sessionId);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

// Delete conversation
router.delete('/history/:sessionId', (req, res, next) => {
  try {
    const { sessionId } = req.params;
    db.prepare('DELETE FROM ai_conversations WHERE session_id = ?').run(sessionId);
    res.json({ message: 'Conversation deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
