const axios = require('axios');

class AIService {
  constructor() {
    this.cachedWorkingModel = null;
    this.failedModels = new Set();
  }

  getApiKey() {
    return (process.env.AI_API_KEY || '').trim();
  }

  getProvider() {
    return (process.env.AI_PROVIDER || 'gemini').toLowerCase();
  }

  getTimeoutMs() {
    const envVal = parseInt(process.env.AI_TIMEOUT_MS, 10);
    return !isNaN(envVal) && envVal > 0 ? envVal : 30000;
  }

  isConfigured() {
    const key = this.getApiKey();
    return Boolean(key && key.length > 5);
  }

  getModelsToTry() {
    const list = [
      process.env.GEMINI_MODEL,
      this.cachedWorkingModel,
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-2.5-pro',
      'gemini-1.5-pro',
      'gemini-flash-latest'
    ].filter(Boolean);

    const unique = [];
    for (const m of list) {
      if (!this.failedModels.has(m) && !unique.includes(m)) {
        unique.push(m);
      }
    }
    return unique.length > 0 ? unique : ['gemini-1.5-flash'];
  }

  buildContents(prompt, history = []) {
    const contents = [];
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-8);
      for (const msg of recentHistory) {
        if (!msg) continue;
        const text = msg.text || msg.content || '';
        if (!text.trim()) continue;
        const role = (msg.sender === 'USER' || msg.role === 'user') ? 'user' : 'model';
        contents.push({
          role,
          parts: [{ text: text.trim() }]
        });
      }
    }

    if (prompt && prompt.trim()) {
      const last = contents[contents.length - 1];
      if (!last || last.role !== 'user' || last.parts[0].text !== prompt.trim()) {
        contents.push({
          role: 'user',
          parts: [{ text: prompt.trim() }]
        });
      }
    }

    return contents;
  }

  parseErrorDetails(err) {
    const status = err.response?.status;
    const msg = err.response?.data?.error?.message || err.message || '';
    const isTimeout = err.code === 'ECONNABORTED' || /timeout/i.test(msg);

    if (isTimeout) {
      return {
        category: 'TIMEOUT',
        userMessage: 'The AI request timed out while generating a response. Please try again or ask a shorter question.',
        status: 504
      };
    }
    if (status === 401 || status === 403 || /api.?key|auth/i.test(msg)) {
      return {
        category: 'AUTH_FAILED',
        userMessage: 'Gemini rejected the API key. Please check AI_API_KEY in backend/.env.',
        status: 401
      };
    }
    if (status === 429 || /quota|rate.?limit/i.test(msg)) {
      return {
        category: 'QUOTA_EXCEEDED',
        userMessage: 'AI quota or rate limit exceeded for this API key. Please wait a moment before retrying.',
        status: 429
      };
    }
    if (status === 503 || status === 502) {
      return {
        category: 'PROVIDER_UNAVAILABLE',
        userMessage: 'Google Gemini AI service is temporarily unavailable. Please try again shortly.',
        status: 503
      };
    }

    return {
      category: 'PROVIDER_ERROR',
      userMessage: `AI provider error: ${msg || 'Generation failed'}`,
      status: status || 500
    };
  }

  /**
   * Fast Gemini API call supporting cached working model and model blacklisting
   */
  async callGeminiApi(prompt, systemInstruction = '', history = [], isProbe = false) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('AI_API_KEY is missing in backend configuration.');
    }

    const contents = this.buildContents(prompt, history);
    if (contents.length === 0) {
      throw new Error('No user message provided for AI generation.');
    }

    const payload = {
      contents,
      ...(systemInstruction ? {
        systemInstruction: { parts: [{ text: systemInstruction }] }
      } : {}),
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024
      }
    };

    const modelsToTry = isProbe ? [this.cachedWorkingModel || 'gemini-1.5-flash'] : this.getModelsToTry();
    const requestTimeout = isProbe ? 8000 : this.getTimeoutMs();
    let lastError = null;
    const startTime = Date.now();

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await axios.post(url, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: requestTimeout
        });

        const candidates = response.data?.candidates;
        if (candidates && candidates.length > 0) {
          const textPart = candidates[0]?.content?.parts?.[0]?.text;
          if (textPart) {
            this.cachedWorkingModel = model;
            const durationMs = Date.now() - startTime;
            return { text: textPart, modelUsed: model, durationMs };
          }
        }
      } catch (err) {
        lastError = err;
        const status = err.response?.status;
        if (status === 404 || status === 400) {
          this.failedModels.add(model);
        }
        if (status === 401 || status === 403) {
          throw err;
        }
      }
    }

    throw lastError || new Error('Failed to get response from Gemini API.');
  }

  /**
   * Server-Sent Events (SSE) streaming API call for real-time incremental responses
   */
  async callGeminiApiStream(prompt, systemInstruction = '', history = [], onChunk) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('AI_API_KEY is missing in backend configuration.');
    }

    const contents = this.buildContents(prompt, history);
    if (contents.length === 0) {
      throw new Error('No user message provided for AI generation.');
    }

    const payload = {
      contents,
      ...(systemInstruction ? {
        systemInstruction: { parts: [{ text: systemInstruction }] }
      } : {}),
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024
      }
    };

    const modelsToTry = this.getModelsToTry();
    const requestTimeout = this.getTimeoutMs();
    let lastError = null;
    const startTime = Date.now();
    let ttft = null;

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
        const response = await axios.post(url, payload, {
          headers: { 'Content-Type': 'application/json' },
          responseType: 'stream',
          timeout: requestTimeout
        });

        let fullText = '';
        let buffer = '';

        return await new Promise((resolve, reject) => {
          response.data.on('data', (chunk) => {
            if (ttft === null) {
              ttft = Date.now() - startTime;
            }
            buffer += chunk.toString('utf8');
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6).trim();
                if (!jsonStr || jsonStr === '[DONE]') continue;
                try {
                  const dataObj = JSON.parse(jsonStr);
                  const candidateText = dataObj.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (candidateText) {
                    fullText += candidateText;
                    if (onChunk) onChunk(candidateText);
                  }
                } catch (e) {
                  // Partial JSON line ignore
                }
              }
            }
          });

          response.data.on('end', () => {
            this.cachedWorkingModel = model;
            const totalDurationMs = Date.now() - startTime;
            resolve({
              text: fullText,
              modelUsed: model,
              ttftMs: ttft || totalDurationMs,
              durationMs: totalDurationMs
            });
          });

          response.data.on('error', (err) => {
            reject(err);
          });
        });
      } catch (err) {
        lastError = err;
        const status = err.response?.status;
        if (status === 404 || status === 400) {
          this.failedModels.add(model);
        }
        if (status === 401 || status === 403) {
          throw err;
        }
      }
    }

    throw lastError || new Error('Failed to stream response from Gemini API.');
  }

  // 1. Multi-turn AI Chatbot
  async chat(userMessage, studentContext = {}, history = []) {
    if (this.isConfigured()) {
      try {
        const sysInstruction = `You are InternHub AI, the career assistant for an Internship Management Portal. Help students discover internships, improve resumes, and prepare for interviews. Be concise, helpful, and clear.
Student: ${studentContext.full_name || 'Student'}, CGPA: ${studentContext.cgpa || 'N/A'}, Skills: ${Array.isArray(studentContext.skills) ? studentContext.skills.join(', ') : 'Not set'}, Profile Completion: ${studentContext.profile_completion || 0}%.`;

        const resObj = await this.callGeminiApi(userMessage, sysInstruction, history);
        return {
          success: true,
          provider: `Google Gemini AI (${resObj.modelUsed})`,
          isFallback: false,
          response: resObj.text,
          durationMs: resObj.durationMs
        };
      } catch (err) {
        const details = this.parseErrorDetails(err);
        console.warn(`[AI Service] Gemini call failed (${details.category}):`, err.message);
        return {
          success: false,
          provider: 'Google Gemini AI',
          isFallback: true,
          errorCategory: details.category,
          error: details.userMessage,
          response: details.userMessage
        };
      }
    }

    return {
      success: true,
      provider: 'InternHub Career Assistant (Setup Required)',
      isFallback: true,
      response: `InternHub AI is ready! Please configure a valid AI_API_KEY in backend/.env.`
    };
  }

  // 2. Skill Gap Analyzer
  async analyzeSkillGap(studentSkills = [], targetRoleOrInternship = {}) {
    const requiredSkills = targetRoleOrInternship.requiredSkills || ['React', 'Node.js', 'PostgreSQL', 'System Design', 'Docker'];
    const studentSkillSet = new Set(studentSkills.map(s => s.toLowerCase()));

    const possessed = [];
    const missing = [];

    for (const req of requiredSkills) {
      if (studentSkillSet.has(req.toLowerCase())) {
        possessed.push(req);
      } else {
        missing.push(req);
      }
    }

    if (this.isConfigured()) {
      try {
        const prompt = `Perform a detailed skill-gap analysis for a student targeting '${targetRoleOrInternship.title || 'Backend Engineer'}'. 
Possessed Skills: ${possessed.join(', ') || 'None'}
Missing Skills: ${missing.join(', ') || 'None'}
Provide actionable learning steps.`;
        const resObj = await this.callGeminiApi(prompt);
        return { success: true, isFallback: false, possessed, missing, aiAnalysis: resObj.text };
      } catch (err) {
        console.warn('[AI Service] Skill gap AI call failed:', err.message);
      }
    }

    return {
      success: true,
      isFallback: true,
      possessed,
      missing,
      suggestions: [
        { skill: missing[0] || 'Docker', priority: 'HIGH', learningOrder: 1, reason: 'Crucial containerization skill demanded by tech companies.' },
        { skill: missing[1] || 'System Design', priority: 'MEDIUM', learningOrder: 2, reason: 'Essential for technical interview rounds.' },
        { skill: missing[2] || 'Cloud Services', priority: 'LOW', learningOrder: 3, reason: 'Good experience for production deployments.' }
      ]
    };
  }

  // 3. Resume Assistant
  async improveResume(studentProfile, targetInternship) {
    if (this.isConfigured()) {
      try {
        const prompt = `Tailor student resume summary and project bullets for target internship '${targetInternship.title}' requiring [${targetInternship.requiredSkills?.join(', ')}].
Summary: ${studentProfile.bio || 'Computer Science student'}
Skills: ${Array.isArray(studentProfile.skills) ? studentProfile.skills.join(', ') : 'Software Development'}
Provide professional summary and 3 bullet points.`;
        const resObj = await this.callGeminiApi(prompt);
        return { success: true, isFallback: false, tailoredResume: resObj.text };
      } catch (err) {
        console.warn('[AI Service] Resume AI call failed:', err.message);
      }
    }

    return {
      success: true,
      isFallback: true,
      tailoredSummary: `Enthusiastic software engineering student skilled in ${Array.isArray(studentProfile.skills) ? studentProfile.skills.slice(0, 3).join(', ') : 'full-stack development'}. Demonstrates strong problem-solving capabilities.`,
      improvedProjects: [
        `Architected full-stack web application with responsive UI, real-time API integrations, and database indexing.`,
        `Optimized API performance and endpoint query handling, reducing response latency.`
      ],
      suggestedKeywords: targetInternship?.requiredSkills || ['React', 'Node.js', 'SQL', 'REST API', 'System Design']
    };
  }

  // 4. Career Advisor
  async getCareerAdvice(studentProfile, targetCareer = 'Software Engineer') {
    if (this.isConfigured()) {
      try {
        const prompt = `Provide a structured 3-phase career roadmap for a student aiming to become a '${targetCareer}'. Current skills: ${Array.isArray(studentProfile.skills) ? studentProfile.skills.join(', ') : 'Programming'}.`;
        const resObj = await this.callGeminiApi(prompt);
        return { success: true, isFallback: false, targetCareer, aiRoadmap: resObj.text };
      } catch (err) {
        console.warn('[AI Service] Career advice AI call failed:', err.message);
      }
    }

    return {
      success: true,
      isFallback: true,
      targetCareer,
      currentSkills: studentProfile.skills || ['React', 'Node.js', 'SQL'],
      roadmap: [
        { phase: 'Phase 1: Core Foundations', target: 'Master Data Structures, Algorithms, and Web Architecture.' },
        { phase: 'Phase 2: Full-Stack Mastery', target: 'Build production-grade REST APIs and database schemas.' },
        { phase: 'Phase 3: Production & DevOps', target: 'Containerize with Docker and practice system design.' }
      ]
    };
  }

  // 5. Interview Prep
  async generateInterviewPrep(companyName, internshipTitle, userResponse = '') {
    if (this.isConfigured()) {
      try {
        const prompt = userResponse
          ? `Evaluate student's answer for '${internshipTitle}' at '${companyName}': "${userResponse}". Provide score out of 100, strengths, and improvements.`
          : `Generate 3 realistic interview questions (Technical, System Design, Behavioral) for '${internshipTitle}' at '${companyName}'.`;
        const resObj = await this.callGeminiApi(prompt);
        return { success: true, isFallback: false, companyName, internshipTitle, aiContent: resObj.text };
      } catch (err) {
        console.warn('[AI Service] Interview prep AI call failed:', err.message);
      }
    }

    const defaultQuestions = [
      { id: 1, type: 'TECHNICAL', question: 'How do you optimize state management and re-renders in a React web application?', guidance: 'Discuss memoization, hooks, and local vs global state.' },
      { id: 2, type: 'SYSTEM DESIGN', question: 'Explain how database indexing improves query lookup times and when indexes should be avoided.', guidance: 'Discuss B-Trees, write overhead, and cardinalities.' },
      { id: 3, type: 'BEHAVIORAL', question: 'Describe a challenging technical bug you encountered and how you systematically resolved it.', guidance: 'Use the STAR method: Situation, Task, Action, Result.' }
    ];

    let feedback = null;
    if (userResponse && userResponse.trim().length > 5) {
      feedback = {
        score: 88,
        strengths: ['Clear explanation', 'Good identification of key technical concepts'],
        improvements: ['Include explicit edge case handling', 'Discuss performance complexity trade-offs']
      };
    }

    return {
      success: true,
      isFallback: true,
      companyName: companyName || 'Tech Partner',
      internshipTitle: internshipTitle || 'Software Engineering Intern',
      questions: defaultQuestions,
      evaluation: feedback
    };
  }

  // 6. Project Recommendations
  async recommendProjects(targetRole = 'Backend Developer', currentSkills = []) {
    return {
      success: true,
      recommendedProjects: [
        {
          title: 'Smart Internship Management Portal',
          difficulty: 'INTERMEDIATE',
          technologies: ['React', 'Node.js', 'PostgreSQL', 'REST API'],
          description: 'A full-stack candidate matching portal with dynamic profile completion tracking and AI career coaching.',
          skillsGained: ['Full-stack REST APIs', 'Database Schema Design', 'AI Integration']
        },
        {
          title: 'Distributed Microservice Activity Monitor',
          difficulty: 'ADVANCED',
          technologies: ['Node.js', 'Docker', 'PostgreSQL', 'Redis'],
          description: 'Real-time activity logging system with automated analytics and responsive dashboard visualizers.',
          skillsGained: ['Containerization', 'Performance Optimization', 'System Metrics']
        }
      ]
    };
  }
}

module.exports = new AIService();
