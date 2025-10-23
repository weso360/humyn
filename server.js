const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import routes and middleware
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payment');
const { authenticateToken, checkUsageLimit } = require('./middleware/auth');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/humyn')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Logging
const logRequest = (req, optOut = false, reason = '') => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    optOut,
    reason,
    textLength: req.body.source_text?.length || 0
  };
  
  fs.appendFileSync(path.join(__dirname, 'audit.log'), JSON.stringify(logEntry) + '\n');
};

// Content filter (basic)
const contentFilter = (text) => {
  const flaggedPatterns = [
    /\b(fraud|scam|phishing)\b/i,
    /\b(hate|violence|harm)\b/i,
    /\b(illegal|criminal)\b/i
  ];
  
  return flaggedPatterns.some(pattern => pattern.test(text));
};

// OpenAI API integration with fallback
const callLLM = async (systemPrompt, userPrompt) => {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    console.log('❌ No API key, using mock response');
    return getMockResponse(userPrompt);
  }

  console.log('🔄 Calling OpenAI API...');
  
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
    
    console.log(`📡 OpenAI response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ OpenAI API error:', errorText);
      return getMockResponse(userPrompt);
    }
    
    const data = await response.json();
    
    if (data.error) {
      console.log('❌ OpenAI API error:', data.error);
      return getMockResponse(userPrompt);
    }
    
    console.log('📝 Raw OpenAI response:', data.choices[0].message.content.substring(0, 100) + '...');
    
    try {
      const parsed = JSON.parse(data.choices[0].message.content);
      console.log('✅ Successfully parsed OpenAI JSON response');
      return parsed;
    } catch (parseError) {
      console.log('❌ Failed to parse JSON:', parseError.message);
      console.log('📄 Full response:', data.choices[0].message.content);
      return getMockResponse(userPrompt);
    }
  } catch (error) {
    console.log('❌ OpenAI API failed:', error.message);
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

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
}

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);

// Optional authentication middleware
const jwt = require('jsonwebtoken');
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      req.user = user;
    }
    
    next();
  } catch (error) {
    next();
  }
};

// Main API endpoint with optional authentication
app.post('/api/humanize', optionalAuth, async (req, res) => {
  try {
    const {
      source_text,
      tone = 'Conversational',
      formality = 'Medium',
      audience = 'general',
      personalization = {},
      variants = 2,
      opt_out_disclosure = false,
      opt_out_reason = ''
    } = req.body;

    // Validation
    if (!source_text || source_text.trim().length === 0) {
      return res.status(400).json({ error: 'Source text is required' });
    }

    if (source_text.length > 10000) {
      return res.status(400).json({ error: 'Text too long (max 10,000 characters)' });
    }

    // Content filtering
    if (contentFilter(source_text)) {
      logRequest(req, false, 'Content filtered');
      return res.status(400).json({ 
        error: 'Content contains potentially harmful material',
        suggestion: 'Please revise your text to remove any harmful, misleading, or inappropriate content.'
      });
    }

    // Handle opt-out logging
    if (opt_out_disclosure) {
      if (!opt_out_reason || opt_out_reason.trim().length < 10) {
        return res.status(400).json({ 
          error: 'Disclosure opt-out requires detailed justification (minimum 10 characters)' 
        });
      }
      logRequest(req, true, opt_out_reason);
    } else {
      logRequest(req, false);
    }

    // Build user prompt
    const userPrompt = `Humanize and personalize the following text while preserving meaning.
Input: "${source_text}"
Tone: ${tone}
Formality: ${formality}
Audience: ${audience}
Personalization tokens: ${JSON.stringify(personalization)}
Variants: ${variants}
Return exactly valid JSON with fields: output_variants[], changelog[], style_profile{}, disclosure{}.
Do not add facts not present in the input. ${opt_out_disclosure ? 'User has opted out of disclosure.' : 'Include a short disclosure indicating AI assistance.'}`;

    // Load system prompt
    const systemPrompt = fs.readFileSync(path.join(__dirname, 'system-prompt.txt'), 'utf8');

    // Call LLM
    const result = await callLLM(systemPrompt, userPrompt);

    // Override disclosure if opted out
    if (opt_out_disclosure) {
      result.disclosure = '';
    }

    // Update usage count in database for authenticated users
    if (req.user && req.user.plan === 'free') {
      req.user.usageCount += 1;
      await req.user.save();
    }

    res.json(result);

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all handler for React app in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`OpenAI API Key loaded: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
  console.log(`API Key starts with: ${process.env.OPENAI_API_KEY?.substring(0, 10)}...`);
});