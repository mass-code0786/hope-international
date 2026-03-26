const userRepository = require('../repositories/userRepository');
const compensationRepository = require('../repositories/compensationRepository');
const rewardService = require('./rewardService');
const { ApiError } = require('../utils/ApiError');

function toMoney(value) {
  return Number(Number(value).toFixed(2));
}

function assertValidCycle(start, end, label) {
  if (!start || !end) {
    throw new ApiError(400, `${label} start and end are required`);
  }

  if (new Date(start) > new Date(end)) {
    throw new ApiError(400, `${label} start must be before or equal to end`);
  }
}

async function getWeeklyStatus(userId, cycleStart, cycleEnd) {
  assertValidCycle(cycleStart, cycleEnd, 'Weekly cycle');

  const user = await userRepository.findById(null, userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const summary = await compensationRepository.getWeeklyUserSummary(null, userId, cycleStart, cycleEnd);
  if (summary) {
    return {
      cycleStart,
      cycleEnd,
      currentRank: summary.rank_name,
      weeklySelfPv: Number(summary.self_pv),
      weeklyCapMultiplier: Number(summary.cap_multiplier),
      weeklyCap: Number(summary.cap_limit),
      weeklyLeftPv: Number(summary.left_pv),
      weeklyRightPv: Number(summary.right_pv),
      matchedPv: Number(summary.matched_pv),
      matchingIncomeNet: Number(summary.matching_income_net),
      directIncome: Number(summary.direct_income)
    };
  }

  const weeklyVolumes = await compensationRepository.aggregateUserQualifyingVolumes(null, userId, cycleStart, cycleEnd);
  const weeklySelfPv = Number(weeklyVolumes.total_pv || 0);
  const weeklyCapMultiplier = Number(user.rank_cap_multiplier || 3);

  return {
    cycleStart,
    cycleEnd,
    currentRank: user.rank_name,
    weeklySelfPv: toMoney(weeklySelfPv),
    weeklyCapMultiplier,
    weeklyCap: toMoney(weeklySelfPv * weeklyCapMultiplier),
    weeklyLeftPv: null,
    weeklyRightPv: null,
    matchedPv: null,
    matchingIncomeNet: null,
    directIncome: toMoney(
      await compensationRepository.aggregateUserDirectIncome(null, userId, cycleStart, cycleEnd)
    )
  };
}

async function getMonthlyStatus(userId, monthStart, monthEnd) {
  assertValidCycle(monthStart, monthEnd, 'Monthly cycle');

  const user = await userRepository.findById(null, userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const existing = await compensationRepository.getMonthlyStatus(null, userId, monthStart, monthEnd);
  if (existing) {
    return {
      monthStart,
      monthEnd,
      currentRank: user.rank_name,
      monthlyBv: Number(existing.monthly_bv || 0),
      monthlyPv: Number(existing.monthly_pv || 0),
      rewardQualified: Boolean(existing.qualified),
      rewardAmount: Number(existing.reward_amount || 0),
      rewardLabel: existing.reward_label,
      rewardStatus: existing.reward_status || (existing.qualified ? 'qualified' : 'not_qualified')
    };
  }

  const monthlyBv = toMoney(await compensationRepository.aggregateMonthlyBv(null, userId, monthStart, monthEnd));
  const monthlyPv = toMoney(await compensationRepository.aggregateMonthlyPv(null, userId, monthStart, monthEnd));
  const reward = rewardService.resolveReward(monthlyBv);

  return {
    monthStart,
    monthEnd,
    currentRank: user.rank_name,
    monthlyBv,
    monthlyPv,
    rewardQualified: Boolean(reward),
    rewardAmount: reward ? reward.rewardAmount : 0,
    rewardLabel: reward ? reward.rewardLabel : null,
    rewardStatus: reward ? 'preview_qualified' : 'preview_not_qualified'
  };
}

module.exports = {
  getWeeklyStatus,
  getMonthlyStatus
};
