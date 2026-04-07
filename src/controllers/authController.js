const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');
const webauthnService = require('../services/webauthnService');
const { sanitizeUser } = require('../utils/sanitize');
const { success } = require('../utils/response');

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
  res.status(200).json({ user, token: data.token, rememberMe: Boolean(req.body.rememberMe) });
});

const webauthnRegisterOptions = asyncHandler(async (req, res) => {
  const data = await webauthnService.createRegisterOptions(req.user.sub, req.headers.origin);
  return success(res, {
    data,
    message: 'Biometric registration options generated'
  });
});

const webauthnRegisterVerify = asyncHandler(async (req, res) => {
  const data = await webauthnService.verifyRegisterResponse(req.user.sub, req.body, req.headers.origin);
  return success(res, {
    data,
    message: 'Biometric login enabled successfully'
  });
});

const webauthnLoginOptions = asyncHandler(async (req, res) => {
  const data = await webauthnService.createLoginOptions(req.body, req.headers.origin);
  return success(res, {
    data,
    message: 'Biometric login options generated'
  });
});

const webauthnLoginVerify = asyncHandler(async (req, res) => {
  const data = await webauthnService.verifyLoginResponse(req.body, req.headers.origin);
  return res.status(200).json({ user: sanitizeUser(data.user), token: data.token, rememberMe: Boolean(req.body.rememberMe) });
});

module.exports = {
  register,
  previewReferral,
  login,
  webauthnRegisterOptions,
  webauthnRegisterVerify,
  webauthnLoginOptions,
  webauthnLoginVerify
};
