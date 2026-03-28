const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');
const { sanitizeUser } = require('../utils/sanitize');

const register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body);
  const user = sanitizeUser(data.user);
  if (process.env.NODE_ENV !== 'production') {
    console.info('[auth.register] response role', { username: user?.username, role: user?.role });
  }
  res.status(201).json({ user, token: data.token });
});

const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  const user = sanitizeUser(data.user);
  if (process.env.NODE_ENV !== 'production') {
    console.info('[auth.login] response role', { username: user?.username, role: user?.role });
  }
  res.status(200).json({ user, token: data.token });
});

module.exports = {
  register,
  login
};
