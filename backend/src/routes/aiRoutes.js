const express = require('express');
const router = express.Router();
const { chat, chatStream, skillGap, resumeAssistant, careerAdvisor, interviewPrep, projectRecommendations, aiStatus } = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/auth');

// AI status check — no auth needed so the chatbot UI can check before login
router.get('/status', aiStatus);

router.post('/chat', authenticateToken, chat);
router.post('/chat/stream', authenticateToken, chatStream);
router.post('/skill-gap', authenticateToken, skillGap);
router.post('/resume', authenticateToken, resumeAssistant);
router.post('/career', authenticateToken, careerAdvisor);
router.post('/interview', authenticateToken, interviewPrep);
router.post('/projects', authenticateToken, projectRecommendations);

module.exports = router;
