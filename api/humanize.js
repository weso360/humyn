const fs = require('fs');
const path = require('path');

// Mock LLM function for Vercel
const getMockResponse = (userPrompt) => {
  const inputText = userPrompt.match(/Input: "(.+?)"/)?.[1] || 'Sample text';
  
  return {
    output_variants: [
      {
        variant_id: "v1",
        tone: "Conversational",
        text: inputText.replace(/\b(must|shall|will)\b/gi, 'should').replace(/\./g, '!') + ' What do you think?'
      },
      {
        variant_id: "v2", 
        tone: "Professional",
        text: inputText.replace(/\b(hey|hi)\b/gi, 'Hello').replace(/!/g, '.')
      }
    ],
    changelog: [
      "- Softened formal language and added conversational elements",
      "- Maintained professional tone while improving readability"
    ],
    style_profile: {
      tone: "Mixed",
      formality: "Medium",
      audience: "general",
      personalization_tokens_used: [],
      imperfection_level: "low"
    },
    disclosure: "This text was assisted by an AI writing tool.",
    confidence_score: 0.75
  };
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      source_text,
      tone = 'Conversational',
      formality = 'Medium',
      audience = 'general',
      variants = 2
    } = req.body;

    // Validation
    if (!source_text || source_text.trim().length === 0) {
      return res.status(400).json({ error: 'Source text is required' });
    }

    if (source_text.length > 10000) {
      return res.status(400).json({ error: 'Text too long (max 10,000 characters)' });
    }

    // Build user prompt
    const userPrompt = `Humanize and personalize the following text while preserving meaning.
Input: "${source_text}"
Tone: ${tone}
Formality: ${formality}
Audience: ${audience}
Variants: ${variants}`;

    // Use mock response for now (replace with OpenAI API call)
    const result = getMockResponse(userPrompt);

    res.json(result);

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}