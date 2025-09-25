const fs = require('fs');
const path = require('path');

// Test cases for the humanization system
const testCases = [
  {
    id: 'formal_email',
    input: 'Per the prior email, you must submit the Q3 report by Friday EOD. Failure to meet the deadline will result in escalation.',
    expected_improvements: ['soften imperative language', 'add conversational elements', 'offer help'],
    tone: 'Professional',
    audience: 'colleague'
  },
  {
    id: 'robotic_response',
    input: 'Thank you for your inquiry. We have received your request and will process it within 24-48 hours. Please contact us if you have additional questions.',
    expected_improvements: ['add personality', 'use contractions', 'sound more human'],
    tone: 'Conversational',
    audience: 'customer'
  },
  {
    id: 'academic_text',
    input: 'The implementation of artificial intelligence systems requires careful consideration of ethical implications and potential societal impacts.',
    expected_improvements: ['simplify language', 'add examples', 'make accessible'],
    tone: 'Empathetic',
    audience: 'general'
  },
  {
    id: 'technical_jargon',
    input: 'Execute the deployment pipeline utilizing the containerized microservices architecture to facilitate scalable infrastructure provisioning.',
    expected_improvements: ['reduce jargon', 'explain terms', 'add clarity'],
    tone: 'Concise',
    audience: 'colleague'
  }
];

// Evaluation metrics
const evaluationCriteria = {
  naturalness: {
    description: 'How human-like does the text sound?',
    scale: '1-5 (1=robotic, 5=very natural)',
    weight: 0.3
  },
  clarity: {
    description: 'Is the meaning clear and easy to understand?',
    scale: '1-5 (1=confusing, 5=very clear)',
    weight: 0.25
  },
  tone_appropriateness: {
    description: 'Does the tone match the requested style?',
    scale: '1-5 (1=wrong tone, 5=perfect tone)',
    weight: 0.2
  },
  factual_preservation: {
    description: 'Are all original facts preserved?',
    scale: '1-5 (1=facts changed, 5=facts intact)',
    weight: 0.25
  }
};

// Test runner function
async function runTests() {
  console.log('🧪 AI Humanizer Test Suite');
  console.log('=' .repeat(50));
  
  const results = [];
  
  for (const testCase of testCases) {
    console.log(`\nTesting: ${testCase.id}`);
    console.log(`Input: "${testCase.input}"`);
    console.log(`Expected improvements: ${testCase.expected_improvements.join(', ')}`);
    
    try {
      // Simulate API call (replace with actual API call)
      const response = await fetch('http://localhost:3001/api/humanize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_text: testCase.input,
          tone: testCase.tone,
          audience: testCase.audience,
          variants: 2
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Test passed');
        console.log(`Variants generated: ${result.output_variants.length}`);
        console.log(`Changes: ${result.changelog.join('; ')}`);
        
        results.push({
          test_id: testCase.id,
          status: 'passed',
          variants: result.output_variants.length,
          confidence: result.confidence_score
        });
      } else {
        console.log('❌ Test failed - API error');
        results.push({
          test_id: testCase.id,
          status: 'failed',
          error: 'API error'
        });
      }
    } catch (error) {
      console.log(`❌ Test failed - ${error.message}`);
      results.push({
        test_id: testCase.id,
        status: 'failed',
        error: error.message
      });
    }
  }
  
  // Generate test report
  const report = {
    timestamp: new Date().toISOString(),
    total_tests: testCases.length,
    passed: results.filter(r => r.status === 'passed').length,
    failed: results.filter(r => r.status === 'failed').length,
    results: results,
    evaluation_criteria: evaluationCriteria
  };
  
  fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2));
  console.log('\n📊 Test Report Generated: test-report.json');
  console.log(`Passed: ${report.passed}/${report.total_tests}`);
}

// Human evaluation template
const humanEvaluationTemplate = {
  instructions: 'Rate each output on a scale of 1-5 for the following criteria:',
  criteria: evaluationCriteria,
  test_cases: testCases.map(tc => ({
    id: tc.id,
    original: tc.input,
    humanized_variants: [], // To be filled by evaluator
    ratings: {
      naturalness: null,
      clarity: null,
      tone_appropriateness: null,
      factual_preservation: null
    },
    comments: ''
  }))
};

fs.writeFileSync('human-evaluation-template.json', JSON.stringify(humanEvaluationTemplate, null, 2));

// Auto-run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

// Export for use as module
module.exports = { testCases, evaluationCriteria, runTests };