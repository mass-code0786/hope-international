const express = require('express');
const {
  register,
  login,
  previewReferral,
  webauthnRegisterOptions,
  webauthnRegisterVerify,
  webauthnLoginOptions,
  webauthnLoginVerify
} = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  registerSchema,
  loginSchema,
  webauthnRegisterOptionsSchema,
  webauthnRegisterVerifySchema,
  webauthnLoginOptionsSchema,
  webauthnLoginVerifySchema
} = require('../utils/schemas');

const router = express.Router();

router.get('/referral-preview', previewReferral);
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/webauthn/register/options', auth(), validate(webauthnRegisterOptionsSchema), webauthnRegisterOptions);
router.post('/webauthn/register/verify', auth(), validate(webauthnRegisterVerifySchema), webauthnRegisterVerify);
router.post('/webauthn/login/options', validate(webauthnLoginOptionsSchema), webauthnLoginOptions);
router.post('/webauthn/login/verify', validate(webauthnLoginVerifySchema), webauthnLoginVerify);

module.exports = router;
