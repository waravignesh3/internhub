const aiService = require('../services/ai/aiService');
const { query } = require('../config/db');
const { calculateProfileCompletion } = require('../utils/profileCompletion');

/**
 * GET /api/ai/status
 * Returns the real connection state of the AI provider.
 */
async function aiStatus(req, res) {
  try {
    const configured = aiService.isConfigured();
    if (!configured) {
      return res.json({
        configured: false,
        connected: false,
        provider: 'gemini',
        status: 'configuration_missing',
        message: 'AI_API_KEY is not configured in backend/.env.'
      });
    }

    try {
      await aiService.callGeminiApi('Reply with exactly: ok', '', []);
      return res.json({
        configured: true,
        connected: true,
        provider: 'Google Gemini AI',
        status: 'connected',
        message: 'Gemini API connection verified successfully.'
      });
    } catch (probeErr) {
      const msg = probeErr.message || '';
      let status = 'provider_error';
      let userMsg = 'Gemini API returned an error during connection probe.';

      if (/401|403|authentication|api.?key|invalid/i.test(msg)) {
        status = 'auth_failed';
        userMsg = 'Gemini rejected the API key. The key may be invalid, expired, or restricted.';
      } else if (/429|quota|rate.?limit/i.test(msg)) {
        status = 'quota_exceeded';
        userMsg = 'Gemini quota or rate limit exceeded for this API key.';
      } else if (/404|not.?found|model/i.test(msg)) {
        status = 'model_unavailable';
        userMsg = 'The requested Gemini model is unavailable or unsupported.';
      } else if (/network|ECONNREFUSED|ETIMEDOUT|fetch/i.test(msg)) {
        status = 'provider_unavailable';
        userMsg = 'Network failure or Gemini API is unreachable.';
      }

      return res.json({
        configured: true,
        connected: false,
        provider: 'Google Gemini AI',
        status,
        message: userMsg
      });
    }
  } catch (error) {
    console.error('[AI Status] Unexpected error:', error.message);
    return res.status(500).json({ configured: false, connected: false, status: 'error', message: 'AI status check failed.' });
  }
}

async function chat(req, res) {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message content is required.' });
    }

    let studentContext = {};
    if (req.user) {
      const s = await query('SELECT * FROM students WHERE user_id = $1', [req.user.id]);
      if (s.length > 0) {
        studentContext = s[0];
        const sks = await query('SELECT sk.name FROM student_skills ss JOIN skills sk ON ss.skill_id = sk.id WHERE ss.student_id = $1', [studentContext.id]);
        studentContext.skills = sks.map(k => k.name);

        const projects = await query('SELECT * FROM projects WHERE student_id = $1', [studentContext.id]);
        studentContext.projects = projects;

        const totalApps = await query('SELECT COUNT(*) as cnt FROM applications WHERE student_id = $1', [studentContext.id]);
        studentContext.totalApplications = parseInt(totalApps[0].cnt || totalApps[0].CNT || 0, 10);

        studentContext.completionDetails = calculateProfileCompletion(studentContext, studentContext.skills, projects);
        studentContext.profile_completion = studentContext.completionDetails.percentage;
      }
    }

    const result = await aiService.chat(message, studentContext, history || []);
    return res.json(result);
  } catch (error) {
    console.error('ai chat error:', error);
    return res.status(500).json({ success: false, error: 'AI chatbot failed.' });
  }
}

async function chatStream(req, res) {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message content is required.' });
    }

    let studentContext = {};
    if (req.user) {
      const s = await query('SELECT * FROM students WHERE user_id = $1', [req.user.id]);
      if (s.length > 0) {
        studentContext = s[0];
        const sks = await query('SELECT sk.name FROM student_skills ss JOIN skills sk ON ss.skill_id = sk.id WHERE ss.student_id = $1', [studentContext.id]);
        studentContext.skills = sks.map(k => k.name);

        const projects = await query('SELECT * FROM projects WHERE student_id = $1', [studentContext.id]);
        studentContext.projects = projects;

        const totalApps = await query('SELECT COUNT(*) as cnt FROM applications WHERE student_id = $1', [studentContext.id]);
        studentContext.totalApplications = parseInt(totalApps[0].cnt || totalApps[0].CNT || 0, 10);

        studentContext.completionDetails = calculateProfileCompletion(studentContext, studentContext.skills, projects);
        studentContext.profile_completion = studentContext.completionDetails.percentage;
      }
    }

    if (!aiService.isConfigured()) {
      return res.json({
        success: true,
        provider: 'InternHub Career Assistant (Setup Required)',
        isFallback: true,
        response: 'InternHub AI is ready! Configure AI_API_KEY in backend/.env to enable live Gemini answers.'
      });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sysInstruction = `You are InternHub AI, the career assistant for an Internship Management Portal. Help students discover internships, improve resumes, and prepare for interviews. Be concise, professional, and clear.
Student: ${studentContext.full_name || 'Student'}, CGPA: ${studentContext.cgpa || 'N/A'}, Skills: ${Array.isArray(studentContext.skills) ? studentContext.skills.join(', ') : 'Not set'}, Profile Completion: ${studentContext.profile_completion || 0}%.`;

    const result = await aiService.callGeminiApiStream(
      message,
      sysInstruction,
      history || [],
      (chunkText) => {
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
    );

    res.write(`data: ${JSON.stringify({ done: true, provider: `Google Gemini AI (${result.modelUsed})`, ttftMs: result.ttftMs, durationMs: result.durationMs })}\n\n`);
    res.write('data: [DONE]\n\n');
    return res.end();
  } catch (error) {
    console.error('ai chatStream error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: 'AI streaming failed.' });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      return res.end();
    }
  }
}

async function skillGap(req, res) {
  try {
    const { targetInternshipId } = req.body;

    let studentSkills = ['C++', 'DSA', 'SQL', 'React'];
    if (req.user) {
      const s = await query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
      if (s.length > 0) {
        const sks = await query('SELECT sk.name FROM student_skills ss JOIN skills sk ON ss.skill_id = sk.id WHERE ss.student_id = $1', [s[0].id]);
        if (sks.length > 0) studentSkills = sks.map(k => k.name);
      }
    }

    let target = { title: 'C++ Systems & Backend Engineer', requiredSkills: ['C++', 'DSA', 'SQL', 'System Design', 'Docker', 'PostgreSQL'] };
    if (targetInternshipId) {
      const iRes = await query('SELECT * FROM internships WHERE id = $1', [targetInternshipId]);
      if (iRes.length > 0) {
        target.title = iRes[0].title;
        const sks = await query('SELECT sk.name FROM internship_skills isk JOIN skills sk ON isk.skill_id = sk.id WHERE isk.internship_id = $1', [targetInternshipId]);
        if (sks.length > 0) target.requiredSkills = sks.map(k => k.name);
      }
    }

    const result = await aiService.analyzeSkillGap(studentSkills, target);
    return res.json(result);
  } catch (error) {
    console.error('ai skillGap error:', error);
    return res.status(500).json({ success: false, error: 'Skill gap analysis failed.' });
  }
}

async function resumeAssistant(req, res) {
  try {
    const { targetInternshipId } = req.body;
    let studentProfile = { bio: 'Motivated Computer Science student skilled in C++, DSA and Web development.', skills: ['C++', 'DSA', 'React', 'SQL'], cgpa: 8.8 };
    let targetInternship = { title: 'Systems Developer', requiredSkills: ['C++', 'DSA', 'Docker', 'System Design'] };

    if (req.user) {
      const s = await query('SELECT * FROM students WHERE user_id = $1', [req.user.id]);
      if (s.length > 0) studentProfile = s[0];
    }

    if (targetInternshipId) {
      const iRes = await query('SELECT * FROM internships WHERE id = $1', [targetInternshipId]);
      if (iRes.length > 0) targetInternship = iRes[0];
    }

    const result = await aiService.improveResume(studentProfile, targetInternship);
    return res.json(result);
  } catch (error) {
    console.error('ai resume error:', error);
    return res.status(500).json({ success: false, error: 'Resume assistant failed.' });
  }
}

async function careerAdvisor(req, res) {
  try {
    const { targetCareer } = req.body;
    let studentProfile = { skills: ['C++', 'DSA', 'SQL'] };
    if (req.user) {
      const s = await query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
      if (s.length > 0) {
        const sks = await query('SELECT sk.name FROM student_skills ss JOIN skills sk ON ss.skill_id = sk.id WHERE ss.student_id = $1', [s[0].id]);
        studentProfile.skills = sks.map(k => k.name);
      }
    }

    const result = await aiService.getCareerAdvice(studentProfile, targetCareer || 'Backend Engineer');
    return res.json(result);
  } catch (error) {
    console.error('ai career error:', error);
    return res.status(500).json({ success: false, error: 'Career advisor failed.' });
  }
}

async function interviewPrep(req, res) {
  try {
    const { companyName, internshipTitle, userResponse } = req.body;
    const result = await aiService.generateInterviewPrep(companyName, internshipTitle, userResponse);
    return res.json(result);
  } catch (error) {
    console.error('ai interview prep error:', error);
    return res.status(500).json({ success: false, error: 'Interview prep failed.' });
  }
}

async function projectRecommendations(req, res) {
  try {
    const { targetRole } = req.body;
    const result = await aiService.recommendProjects(targetRole || 'Full Stack Engineer');
    return res.json(result);
  } catch (error) {
    console.error('ai projects error:', error);
    return res.status(500).json({ success: false, error: 'Project recommendation failed.' });
  }
}

module.exports = {
  aiStatus,
  chat,
  chatStream,
  skillGap,
  resumeAssistant,
  careerAdvisor,
  interviewPrep,
  projectRecommendations
};
