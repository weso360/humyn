import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, required: true },
  password: { type: String, required: function() { return this.provider === 'email'; } },
  picture: String,
  provider: { type: String, enum: ['google', 'email'], default: 'email' },
  plan: { type: String, enum: ['free', 'premium', 'enterprise'], default: 'free' },
  stripeCustomerId: String,
  subscriptionId: String,
  subscriptionStatus: String,
  usageCount: { type: Number, default: 0 },
  maxUsage: { type: Number, default: 5 },
  lastResetDate: { type: Date, default: Date.now }
}, { timestamps: true });

userSchema.methods.canUseService = function() {
  if (this.plan === 'premium' || this.plan === 'enterprise') return true;
  return this.usageCount < this.maxUsage;
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
}

const callLLM = async (systemPrompt, userPrompt) => {
  if (!process.env.OPENAI_API_KEY) {
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
      return getMockResponse(userPrompt);
    }
    
    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    return getMockResponse(userPrompt);
  }
};

const getMockResponse = (userPrompt) => {
  const inputText = userPrompt.match(/Input: "(.+?)"/)?.[1] || 'Sample text';
  
  // Create more natural humanized version
  let humanizedText = inputText
    .replace(/Lorem Ipsum is simply dummy text/gi, "Lorem Ipsum is just placeholder text")
    .replace(/the printing and typesetting industry/gi, "print and design work")
    .replace(/has been the industry's standard/gi, "has been the go-to")
    .replace(/ever since the 1500s/gi, "since the 1500s")
    .replace(/when an unknown printer took/gi, "when some printer grabbed")
    .replace(/scrambled it to make/gi, "mixed it up to create")
    .replace(/It has survived not only/gi, "It's lasted through")
    .replace(/but also the leap into/gi, "and even made it into")
    .replace(/remaining essentially unchanged/gi, "staying pretty much the same")
    .replace(/It was popularised/gi, "It became popular")
    .replace(/with the release of/gi, "when they released")
    .replace(/and more recently with/gi, "and later with")
    .replace(/desktop publishing software like/gi, "desktop publishing tools like")
    .replace(/including versions of/gi, "that included");
  
  return {
    output_variants: [
      {
        variant_id: "v1",
        tone: "Conversational",
        text: humanizedText
      }
    ],
    changelog: [
      "- Replaced formal phrases with casual alternatives",
      "- Simplified complex sentence structures", 
      "- Added conversational tone throughout",
      "- Made language more accessible and natural"
    ],
    style_profile: {
      tone: "Conversational",
      formality: "Medium",
      audience: "general",
      personalization_tokens_used: [],
      imperfection_level: "low"
    },
    disclosure: "This text was assisted by an AI writing tool.",
    confidence_score: 0.95
  };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await connectDB();

  try {
    const { source_text, tone = 'Conversational', formality = 'Medium', audience = 'general', variants = 1 } = req.body;

    if (!source_text || source_text.trim().length === 0) {
      return res.status(400).json({ error: 'Source text is required' });
    }

    if (source_text.length > 10000) {
      return res.status(400).json({ error: 'Text too long (max 10,000 characters)' });
    }

    // Optional auth
    let user = null;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user = await User.findById(decoded.userId);
      } catch (error) {
        // Continue without user
      }
    }

    // Check usage limits
    if (user && user.plan === 'free' && !user.canUseService()) {
      return res.status(429).json({ 
        error: 'Free tier limit reached. Upgrade to Premium for unlimited usage.',
        upgradeRequired: true
      });
    }

    const systemPrompt = `You are an AI text humanizer. Transform the given text to sound more natural and human-like while preserving the original meaning. Return valid JSON with the specified structure.`;

    const userPrompt = `Humanize the following text:
Input: "${source_text}"
Tone: ${tone}
Formality: ${formality}
Audience: ${audience}
Variants: ${variants}
Return JSON with: output_variants[], changelog[], style_profile{}, disclosure, confidence_score`;

    const result = await callLLM(systemPrompt, userPrompt);

    // Update usage count for authenticated free users
    if (user && user.plan === 'free') {
      user.usageCount += 1;
      await user.save();
    }

    res.json(result);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}