const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const assistantService = require('../services/assistantService');

const chat = asyncHandler(async (req, res) => {
  const data = await assistantService.chat(req.user.sub, req.body.message, req.body.language);
  return success(res, {
    data,
    message: 'Assistant response generated successfully'
  });
});

module.exports = {
  chat
};
