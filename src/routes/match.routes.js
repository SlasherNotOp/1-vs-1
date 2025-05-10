const express = require('express');
const authenticate = require('../middlewares/auth.middleware');

module.exports = matchController => {
  const r = express.Router();
  r.post('/find', authenticate, matchController.findMatch.bind(matchController));
  r.post('/submit', authenticate, matchController.submitSolution.bind(matchController));
  r.get('/:id', authenticate, matchController.getMatchDetails.bind(matchController));
  return r;
};
