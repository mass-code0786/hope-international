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

const previewReferral = asyncHandler(async (req, res) => {
  const data = await authService.previewReferral(req.query.ref || req.query.sponsor, req.query.side);
  res.status(200).json({
    sponsor: sanitizeUser(data.sponsor),
    requestedSide: data.requestedSide,
    sideAvailable: data.sideAvailable
  });
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
  previewReferral,
  login
};
