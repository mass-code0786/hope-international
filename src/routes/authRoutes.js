const express = require('express');
const { register, login, demoLogin } = require('../controllers/authController');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema, demoLoginSchema } = require('../utils/schemas');

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/demo-login', validate(demoLoginSchema), demoLogin);

module.exports = router;
