const express = require('express');
const authenticate = require('../middlewares/auth.middleware');

module.exports = CodeController => {
  const r = express.Router();
  
  r.post('/submitCode', CodeController.submitSolution.bind(CodeController));
  
  return r;
};
