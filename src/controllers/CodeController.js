const axios = require('axios');

class CodeController {
  constructor(prisma) {
    this.prisma = prisma;
  }

  // Helper function to encode string to base64
  encodeBase64(str) {
    return Buffer.from(str || '', 'utf-8').toString('base64');
  }

  // Helper function to decode base64 to string
  decodeBase64(base64Str) {
    return Buffer.from(base64Str || '', 'base64').toString('utf-8');
  }

  async submitSolution(req, res) {
    const { language_id, source_code, stdin, expected_output } = req.body;

    if (language_id === 0 || source_code === '') {
      return res.status(400).send('Enter language ID and source code');
    }

    try {
      // Encode the data to base64
      const encodedSourceCode = this.encodeBase64(source_code);
      const encodedStdin = this.encodeBase64(stdin);
      const encodedExpectedOutput = expected_output ? this.encodeBase64(expected_output) : undefined;

      const requestData = {
        language_id,
        source_code: encodedSourceCode,
        stdin: encodedStdin,
      };

      // Add expected_output only if it exists
      if (encodedExpectedOutput) {
        requestData.expected_output = encodedExpectedOutput;
      }

      const response = await axios.post(
        'https://garland.mohitsasane.tech/judge0/submissions?base64_encoded=true&wait=true',
        requestData,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Decode the response data back to readable format
      const responseData = { ...response.data };
      
      // Decode base64 fields in the response
      if (responseData.stdout) {
        responseData.stdout = this.decodeBase64(responseData.stdout);
      }
      if (responseData.stderr) {
        responseData.stderr = this.decodeBase64(responseData.stderr);
      }
      if (responseData.compile_output) {
        responseData.compile_output = this.decodeBase64(responseData.compile_output);
      }
      if (responseData.message) {
        responseData.message = this.decodeBase64(responseData.message);
      }

      res.json(responseData);
    } catch (error) {
      console.error('Judge0 API Error:', error.response?.data || error.message);
      res.status(500).json({ 
        error: 'Error while submitting code to Judge0',
        details: error.response?.data || error.message 
      });
    }
  }
}

module.exports = { CodeController };