const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const adminTeamService = require('../../services/admin/adminTeamService');

const tree = asyncHandler(async (req, res) => {
  const depth = Number(req.query.depth || 2);
  const data = await adminTeamService.getTree(req.params.id, depth);
  return success(res, {
    data,
    message: 'Team tree fetched successfully'
  });
});

const summary = asyncHandler(async (req, res) => {
  const data = await adminTeamService.getSummary(req.params.id);
  return success(res, {
    data,
    message: 'Team summary fetched successfully'
  });
});

module.exports = {
  tree,
  summary
};
