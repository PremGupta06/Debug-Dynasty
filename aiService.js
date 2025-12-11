// services/aiService.js
// Text-only AI service using Gemini (Gemini SDK must be installed)
// npm install @google/generative-ai
require("dotenv").config();
const fs = require("fs");

/**
 * Helper: get Gemini model instance (dynamic import for CommonJS)
 * Change model name via GEMINI_MODEL env var if needed (default: gemini-2.5-flash).
 */
async function getGeminiModel(modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash") {
  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    return genAI.getGenerativeModel({ model: modelName });
  } catch (err) {
    console.error("getGeminiModel import error:", err.message);
    throw err;
  }
}

/**
 * Helper: try to parse JSON from model output safely
 */
function safeParseJson(text) {
  if (!text || typeof text !== "string") return { raw: text };
  try {
    // Prefer exact parse
    return JSON.parse(text);
  } catch (e) {
    // Try to extract JSON object from larger text
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]);
      } catch (e2) {
        // fallthrough
      }
    }
    // Try to extract JSON array
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try {
        return JSON.parse(arrMatch[0]);
      } catch (e3) {
        // fallthrough
      }
    }
    // nothing parseable
    return { raw: text };
  }
}

/**
 * careerChat(message, history)
 * - message: user message string
 * - history: array of { userMessage, aiResponse } (optional)
 * Returns: string (AI reply) or friendly fallback on error
 */
async function careerChat(message, history = []) {
  const systemPrompt =
    "You are a friendly, practical career guidance assistant for students and early-career " +
    "professionals. Only answer career-related questions: skills, learning paths, internships, " +
    "job roles, resume tips, and interview prep. If the question is outside this domain, " +
    "politely say you can't help with that.";

  // Build prompt parts: system + short history + user
  const parts = [
    { text: systemPrompt },
    ... (Array.isArray(history) ? history.slice(-6).map(h => ({ text: `User: ${h.userMessage}\nAssistant: ${h.aiResponse}` })) : []),
    { text: `User: ${message}` }
  ];

  try {
    const model = await getGeminiModel();
    const result = await model.generateContent(parts);
    return result.response.text();
  } catch (e) {
    console.error("Gemini careerChat error:", e?.message || e);
    // Try to detect quota error and give a helpful user-visible message
    const msg = (e && e.message) || "";
    if (msg.includes("quota") || msg.includes("Too Many Requests") || msg.includes("exceeded")) {
      return (
        "Our AI chat is temporarily unavailable due to API quota limits. Please try again later, " +
        "or ask a more general question and we'll help as best we can."
      );
    }
    // Generic fallback: helpful non-AI reply
    return (
      "Sorry — the AI service is currently unavailable. Meanwhile: focus on building 1-2 " +
      "concrete projects, learn data structures and one fullstack stack (e.g. MERN), and document your work on GitHub. " +
      "If you want, paste your resume here and we can give a basic checklist."
    );
  }
}

/**
 * analyzeResumeText(resumeText)
 * - Sends resume text to Gemini and expects strict JSON:
 *   { skills: [], missing_skills: [], experience_level: "", job_roles: [], summary: "", rating_10: number }
 * - Returns parsed object; on failure returns a best-effort fallback object.
 */
async function analyzeResumeText(resumeText) {
  const prompt =
    "You are an expert resume evaluator for software/tech roles in the CURRENT job market. " +
    "Given the resume text below, respond ONLY in valid JSON with these keys:\n" +
    "- skills: array of strings\n" +
    "- missing_skills: array of strings describing important missing skills\n" +
    "- experience_level: string (student/intern/junior/mid-level/senior)\n" +
    "- job_roles: array of suitable job role titles\n" +
    "- summary: short summary string (1-2 sentences)\n" +
    "- rating_10: integer from 1 to 10 (overall resume strength for current market)\n\n" +
    "Do NOT include any extra commentary outside the JSON.\n\n" +
    "Resume text:\n" + resumeText;

  try {
    const model = await getGeminiModel();
    const result = await model.generateContent([{ text: prompt }]);
    const text = result.response.text().trim();
    const parsed = safeParseJson(text);

    // If parsed contains raw text instead of expected keys, fall through to fallback
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed.skills || parsed.rating_10 || parsed.summary)
    ) {
      return parsed;
    }

    // fallback if unexpected structure
    return {
      skills: parsed.skills || [],
      missing_skills: parsed.missing_skills || [],
      experience_level: parsed.experience_level || "unknown",
      job_roles: parsed.job_roles || [],
      summary: parsed.summary || (parsed.raw ? String(parsed.raw).slice(0, 300) : ""),
      rating_10: typeof parsed.rating_10 === "number" ? parsed.rating_10 : 5,
      raw: parsed.raw || text
    };
  } catch (e) {
    console.error("analyzeResumeText error:", e?.message || e);
    // Quota-aware friendly fallback
    const msg = (e && e.message) || "";
    if (msg.includes("quota") || msg.includes("Too Many Requests") || msg.includes("exceeded")) {
      return {
        skills: [],
        missing_skills: ["AI analysis unavailable due to quota limits"],
        experience_level: "unknown",
        job_roles: [],
        summary: "AI resume analysis temporarily unavailable due to API quota limits.",
        rating_10: 5,
        raw_error: msg
      };
    }
    // Deterministic lightweight fallback (simple keyword heuristics)
    const lower = (resumeText || "").toLowerCase();
    const skills = [];
    if (lower.includes("javascript")) skills.push("JavaScript");
    if (lower.includes("react")) skills.push("React");
    if (lower.includes("node")) skills.push("Node.js");
    if (lower.includes("python")) skills.push("Python");
    if (lower.includes("sql")) skills.push("SQL");

    const missing = ["Git", "Data Structures", "System Design"].filter(s => !skills.map(x => x.toLowerCase()).includes(s.toLowerCase()));

    return {
      skills,
      missing_skills: missing,
      experience_level: lower.includes("intern") ? "intern" : "student",
      job_roles: skills.length ? ["Software Developer"] : ["Software Developer"],
      summary: "Fallback analysis: basic keyword-based results (AI unavailable).",
      rating_10: Math.min(10, Math.max(1, Math.round((skills.length / 5) * 10))),
      raw_error: (e && e.message) || "unknown"
    };
  }
}

/**
 * generateResumeSuggestions(resumeText, analysis)
 * - Ask Gemini for 5-8 actionable suggestions; expects JSON array of strings.
 * - Falls back to simple static suggestions if AI fails.
 */
async function generateResumeSuggestions(resumeText, analysis = {}) {
  const prompt =
    "You are a resume coach. Based on the resume text and the analysis JSON provided, " +
    "return a JSON array of 5-8 specific, actionable suggestions (each suggestion as a short string). " +
    "Return ONLY the JSON array.\n\n" +
    "Resume Text:\n" + resumeText + "\n\nAnalysis JSON:\n" + JSON.stringify(analysis, null, 2);

  try {
    const model = await getGeminiModel();
    const result = await model.generateContent([{ text: prompt }]);
    const text = result.response.text().trim();

    // Try to parse as array or extract array
    const parsed = safeParseJson(text);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.suggestions)) return parsed.suggestions;

    // If parse didn't produce array, try to extract an array substring
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try {
        const arr = JSON.parse(arrMatch[0]);
        if (Array.isArray(arr)) return arr;
      } catch (e) { /* ignore */ }
    }

    // If still nothing, return fallback
    throw new Error("Unexpected suggestions format");
  } catch (e) {
    console.error("generateResumeSuggestions error:", e?.message || e);
    // Fallback suggestions
    const fallback = [
      "Add a clear skills section listing technical skills and tools.",
      "Include 2–3 projects with bullet points describing what you built and technologies used.",
      "Add links to GitHub/portfolio and deployed demos.",
      "Write a 2-line summary at the top highlighting your strongest skills and goals.",
      "Quantify impact in project bullet points (numbers, metrics)."
    ];
    return fallback;
  }
}

/**
 * getOnboardingCareerSuggestions({ interest, hobby, education })
 * - Returns an array of exactly 3 career option objects: { title, why }
 * - Uses Gemini, with deterministic fallback if AI unavailable.
 */
async function getOnboardingCareerSuggestions({ interest, hobby, education }) {
  const prompt =
    "You are a career counselor for students. Based on the user's interest, hobby and education, " +
    "suggest EXACTLY 3 career options. Respond ONLY as JSON with structure:\n" +
    `{"careers":[{"title":"...","why":"..."},{"title":"...","why":"..."},{"title":"...","why":"..."}]}\n\n` +
    "User data:\n" +
    `Interest: ${interest}\n` +
    `Hobby: ${hobby}\n` +
    `Education: ${education}\n\n` +
    "Keep answers concise and practical, focusing on early-career paths and entry-level progression.";

  try {
    const model = await getGeminiModel();
    const result = await model.generateContent([{ text: prompt }]);
    const text = result.response.text().trim();
    const parsed = safeParseJson(text);

    if (parsed && Array.isArray(parsed.careers)) return parsed.careers;

    // If parsed is an array itself, maybe model returned directly an array
    if (Array.isArray(parsed)) {
      // convert array of strings to objects if needed
      return parsed.slice(0, 3).map((item, idx) => {
        if (typeof item === "string") return { title: item, why: "" };
        return item;
      });
    }

    // Try to extract JSON and reparse
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      const p2 = safeParseJson(objMatch[0]);
      if (p2 && Array.isArray(p2.careers)) return p2.careers;
    }

    throw new Error("Unexpected onboarding suggestions format");
  } catch (e) {
    console.error("getOnboardingCareerSuggestions error:", e?.message || e);
    // Fallback deterministic list - simple mapping heuristics
    const lowerInterest = (interest || "").toLowerCase();
    const lowerHobby = (hobby || "").toLowerCase();

    // Simple heuristics
    const candidates = [];
    if (lowerInterest.includes("ai") || lowerInterest.includes("machine")) {
      candidates.push({ title: "AI / ML Engineer", why: "Strong demand; fits interest in AI." });
      candidates.push({ title: "Data Scientist", why: "If you like analytics and research." });
      candidates.push({ title: "ML Research Intern", why: "Good starter role to build portfolios." });
    } else if (lowerInterest.includes("web") || lowerInterest.includes("frontend") || lowerHobby.includes("design")) {
      candidates.push({ title: "Frontend Developer", why: "Build user-facing web apps using JS/React." });
      candidates.push({ title: "UI/UX Designer", why: "If you prefer visual/interaction design." });
      candidates.push({ title: "Full Stack Developer", why: "Combine frontend and backend skills." });
    } else {
      // generic defaults
      candidates.push({ title: "Software Developer", why: "Strong starting role for coding enthusiasts." });
      candidates.push({ title: "Data Analyst", why: "Great if you enjoy working with data and spreadsheets." });
      candidates.push({ title: "Quality Assurance / Test Engineer", why: "Good entry path to product teams and testing." });
    }
    return candidates.slice(0, 3);
  }
}

module.exports = {
  careerChat,
  analyzeResumeText,
  generateResumeSuggestions,
  getOnboardingCareerSuggestions
};
