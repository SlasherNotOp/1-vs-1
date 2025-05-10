const express = require('express');
module.exports = authController => {
  const r = express.Router();
  r.post('/register', authController.register.bind(authController));
  r.post('/login', authController.login.bind(authController));
  return r;
};
