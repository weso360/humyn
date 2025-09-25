require('dotenv').config();

async function testOpenAIKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ No API key found in .env file');
    return;
  }
  
  console.log(`🔑 API Key loaded: ${apiKey.substring(0, 10)}...`);
  
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (response.ok) {
      console.log('✅ API key is valid and working');
      const data = await response.json();
      console.log(`📋 Available models: ${data.data.length}`);
    } else {
      console.log(`❌ API key test failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log(`❌ API test error: ${error.message}`);
  }
}

testOpenAIKey();