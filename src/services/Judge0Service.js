const axios = require('axios');
const { JUDGE0_API_URL } = require('../config/env');

class Judge0Service {
  constructor() {
    this.apiUrl = JUDGE0_API_URL;
  }

  getLanguageId(lang) {
    const map = {
      javascript: 63, python: 71, java: 62, cpp: 54,
      c: 50, csharp: 51, ruby: 72, go: 60,
      php: 68, kotlin: 78, rust: 73, swift: 83
    };
    return map[lang.toLowerCase()];
  }

  async submitCode(code, language, testCases) {
    const langId = this.getLanguageId(language);
    if (!langId) throw new Error('Unsupported language');
    const submissions = testCases.map(tc => ({
      source_code: code,
      language_id: langId,
      stdin: tc.input,
      expected_output: tc.output
    }));
    const resp = await axios.post(`${this.apiUrl}/submissions/batch`, { submissions });
    return resp.data.map(s => s.token);
  }

  async getSubmissionResults(tokens) {
    const results = await Promise.all(
      tokens.map(t => axios.get(`${this.apiUrl}/submissions/${t}`))
    );
    const allPassed = results.every(r =>
      r.data.status.id === 3 &&
      r.data.stdout?.trim() === r.data.expected_output?.trim()
    );
    const passed = results.filter(r =>
      r.data.status.id === 3 &&
      r.data.stdout?.trim() === r.data.expected_output?.trim()
    ).length;
    return { allTestsPassed: allPassed, passedTests: passed, totalTests: tokens.length, details: results.map(r => r.data) };
  }
}

module.exports = { Judge0Service };
