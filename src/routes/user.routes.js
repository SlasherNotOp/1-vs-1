const express = require('express');
const authenticate = require('../middlewares/auth.middleware');

module.exports = userController => {
  const r = express.Router();
  r.get('/profile', authenticate, userController.getProfile.bind(userController));
  r.get('/matches', authenticate, userController.getMatchHistory.bind(userController));
  r.get('/leaderboard', userController.getLeaderboard.bind(userController));
  return r;
};
