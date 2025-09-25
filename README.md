# AI Humanizer & Personalizer

A complete system for transforming AI-generated text into natural, human-like content while maintaining ethical standards and transparency.

## Features

- **Multiple Tone Options**: Conversational, Professional, Empathetic, Humorous, Concise
- **Personalization**: Add recipient names, relationships, and custom sign-offs
- **Safety Controls**: Content filtering, audit logging, and ethical safeguards
- **Transparency**: Automatic AI disclosure with opt-out controls
- **Export Options**: JSON, plain text, and clipboard copy
- **Responsive UI**: Works on desktop and mobile devices

## Quick Start

### Backend Setup

```bash
# Install dependencies
npm install

# Start the server
npm start
# Server runs on http://localhost:3001
```

### Frontend Setup

```bash
# Navigate to client directory
cd client

# Install React dependencies
npm install

# Start the React app
npm start
# App runs on http://localhost:3000
```

### Development Mode

```bash
# Run both server and client in development
npm run dev
```

## API Usage

### POST /api/humanize

Transform text with the following request body:

```json
{
  "source_text": "Your text to humanize",
  "tone": "Conversational",
  "formality": "Medium", 
  "audience": "colleague",
  "personalization": {
    "name": "Alex",
    "relationship": "colleague",
    "signoff": "Best"
  },
  "variants": 2,
  "opt_out_disclosure": false,
  "opt_out_reason": ""
}
```

### Response Format

```json
{
  "output_variants": [
    {
      "variant_id": "v1",
      "tone": "Conversational", 
      "text": "Humanized text here..."
    }
  ],
  "changelog": [
    "- Added contractions for natural flow",
    "- Softened formal language"
  ],
  "style_profile": {
    "tone": "Conversational",
    "formality": "Medium",
    "audience": "colleague",
    "personalization_tokens_used": ["name"],
    "imperfection_level": "low"
  },
  "disclosure": "This text was assisted by an AI writing tool.",
  "confidence_score": 0.85
}
```

## Testing

Run the comprehensive test suite:

```bash
node test-suite.js
```

This generates:
- `test-report.json` - Automated test results
- `human-evaluation-template.json` - Template for human evaluation

## Safety & Ethics

### Built-in Safeguards
- Content filtering for harmful material
- Audit logging of all requests
- Required justification for disclosure opt-outs
- Rate limiting to prevent abuse

### Transparency Features
- Automatic AI disclosure in outputs
- Metadata tracking for exported content
- Changelog showing what was modified
- Confidence scoring for quality assessment

### Privacy Protection
- No storage of user content
- Anonymized audit logs
- GDPR-compliant data handling

## Configuration

### Environment Variables

```bash
PORT=3001                    # Server port
NODE_ENV=production         # Environment mode
RATE_LIMIT_WINDOW=900000    # Rate limit window (15 min)
RATE_LIMIT_MAX=100          # Max requests per window
```

### Content Filtering

Modify the `contentFilter` function in `server.js` to customize content screening:

```javascript
const contentFilter = (text) => {
  const flaggedPatterns = [
    /\b(fraud|scam|phishing)\b/i,
    // Add your patterns here
  ];
  return flaggedPatterns.some(pattern => pattern.test(text));
};
```

## Integration with LLM APIs

Replace the mock `callLLM` function in `server.js` with your preferred LLM API:

```javascript
const callLLM = async (systemPrompt, userPrompt) => {
  // Example: OpenAI API integration
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.7
  });
  
  return JSON.parse(response.choices[0].message.content);
};
```

## File Structure

```
ai-humaniser/
├── server.js              # Express server with API endpoints
├── system-prompt.txt      # LLM system prompt
├── package.json           # Server dependencies
├── test-suite.js          # Comprehensive test suite
├── audit.log             # Request audit trail
├── client/               # React frontend
│   ├── src/
│   │   ├── App.js        # Main React component
│   │   ├── App.css       # Styling
│   │   ├── index.js      # React entry point
│   │   └── index.css     # Global styles
│   ├── public/
│   │   └── index.html    # HTML template
│   └── package.json      # Client dependencies
└── README.md             # This file
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests: `node test-suite.js`
4. Submit a pull request

## Support

For issues and questions:
- Check the test suite results
- Review audit logs for debugging
- Ensure all dependencies are installed
- Verify API endpoints are accessible