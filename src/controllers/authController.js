const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');
const { sanitizeUser } = require('../utils/sanitize');

const register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body);
  res.status(201).json({ user: sanitizeUser(data.user), token: data.token });
});

const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  res.status(200).json({ user: sanitizeUser(data.user), token: data.token });
});

module.exports = {
  register,
  login
};
