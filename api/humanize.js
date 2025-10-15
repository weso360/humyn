// OpenAI API integration for Vercel
const callOpenAI = async (systemPrompt, userPrompt) => {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    console.log('❌ No API key, using mock response');
    return getMockResponse(userPrompt);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      console.log('❌ OpenAI API error, using mock');
      return getMockResponse(userPrompt);
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.log('❌ OpenAI API failed, using mock:', error.message);
    return getMockResponse(userPrompt);
  }
};

// Mock response for testing
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

const systemPrompt = `You are the "Humanize & Personalize Assistant." Transform AI-generated text into natural, human-like content while preserving meaning. Return exactly valid JSON with this structure:
{
  "output_variants": [
    {"variant_id": "v1", "tone": "Conversational", "text": "..."},
    {"variant_id": "v2", "tone": "Professional", "text": "..."}
  ],
  "changelog": [
    "- Shortened sentences and added contractions to improve flow.",
    "- Removed redundant phrases and clarified call-to-action."
  ],
  "style_profile": {
    "tone": "Conversational",
    "formality": "Medium",
    "audience": "customer",
    "personalization_tokens_used": ["name", "signoff"],
    "imperfection_level": "low"
  },
  "disclosure": "This text was assisted by an AI writing tool.",
  "confidence_score": 0.86
}`;

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
      variants = 1
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

    // Call OpenAI API
    const result = await callOpenAI(systemPrompt, userPrompt);

    res.json(result);

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}