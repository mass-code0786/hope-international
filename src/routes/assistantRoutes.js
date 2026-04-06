const express = require('express');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const assistantController = require('../controllers/assistantController');
const { assistantChatSchema } = require('../utils/schemas');

const router = express.Router();

router.post('/chat', auth(), validate(assistantChatSchema), assistantController.chat);

module.exports = router;
