const express = require('express');
const router = express.Router();
const { verifyAdmin } = require('../middleware/auth');
// const { GoogleGenerativeAI } = require('@google/genai'); // If actual key provided

// POST /api/workflow/assistant - Mocked AI logic for generating recommendations/summaries
router.post('/assistant', verifyAdmin, async (req, res) => {
  try {
    const { prompt, context_data } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required.' });
    }

    // In a real production app with a Gemini API key:
    // const ai = new GoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
    // const response = await ai.generateContent({ model: 'gemini-2.5-pro', contents: [...] });

    // Mock response generation based on prompt type to avoid paid API Key dependency
    let reply = `Here is an automated AI summary based on your request:\n\n`;

    if (prompt.toLowerCase().includes('summary') || prompt.toLowerCase().includes('summarize')) {
      reply += `- The data indicates a steady trend.\n- Most recent bookings are confirmed.\n- Revenue is on track for this quarter.`;
    } else if (prompt.toLowerCase().includes('recommendation') || prompt.toLowerCase().includes('recommend')) {
      reply += `- Consider running a double-points campaign to boost weekend bookings.\n- Review driver availability for the upcoming holiday season.\n- Send automated follow-ups to "Pending" bookings.`;
    } else {
      reply += `I have processed your request regarding: "${prompt}". Everything looks to be in order based on the current context data.`;
    }

    if (context_data && context_data.length > 0) {
      reply += `\n\n(Processed ${context_data.length} records in context)`;
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    return res.json({ reply });
  } catch (err) {
    console.error('AI workflow error:', err);
    return res.status(500).json({ message: 'Server error processing AI workflow.', error: err.message });
  }
});

module.exports = router;
