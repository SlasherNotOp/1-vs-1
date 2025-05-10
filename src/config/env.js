require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET,
  JUDGE0_API_URL: process.env.JUDGE0_API_URL,
  DATABASE_URL: process.env.DATABASE_URL
};
