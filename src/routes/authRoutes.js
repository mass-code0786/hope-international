const express = require('express');
const { register, login, previewReferral } = require('../controllers/authController');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../utils/schemas');

const router = express.Router();

router.get('/referral-preview', previewReferral);
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);

module.exports = router;
