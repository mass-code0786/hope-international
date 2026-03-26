const asyncHandler = require('../utils/asyncHandler');
const matchingService = require('../services/matchingService');
const rewardService = require('../services/rewardService');

const run = asyncHandler(async (req, res) => {
  const { cycleStart, cycleEnd, notes } = req.body;
  const data = await matchingService.runWeeklyMatching(cycleStart, cycleEnd, notes);
  res.status(201).json(data);
});

const runs = asyncHandler(async (_req, res) => {
  const data = await matchingService.listRuns();
  res.status(200).json(data);
});

const runResults = asyncHandler(async (req, res) => {
  const data = await matchingService.getRunResults(req.params.cycleId);
  res.status(200).json(data);
});

const runMonthlyRewards = asyncHandler(async (req, res) => {
  const { monthStart, monthEnd, notes } = req.body;
  const data = await rewardService.runMonthlyRewards(monthStart, monthEnd, notes);
  res.status(201).json(data);
});

module.exports = {
  run,
  runs,
  runResults,
  runMonthlyRewards
};
