const router = require('express').Router();
const { askChatbot } = require('../services/chatbot');
const { authRequired } = require('../middleware/auth');

router.post('/ask', authRequired, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });
    const answer = await askChatbot(message);
    res.json({ answer });
  } catch (e) {
    res.status(500).json({ error: 'Chatbot error' });
  }
});

module.exports = router;


