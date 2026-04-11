const { withTransaction } = require('../db/pool');
const userRepository = require('../repositories/userRepository');
const compensationRepository = require('../repositories/compensationRepository');
const walletService = require('./walletService');
const { MONTHLY_REWARD_THRESHOLDS } = require('../config/constants');
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

function resolveReward(monthlyBv) {
  const sorted = [...MONTHLY_REWARD_THRESHOLDS].sort((a, b) => a.thresholdBv - b.thresholdBv);
  const matched = sorted.filter((t) => monthlyBv >= t.thresholdBv).pop();
  return matched || null;
}

function resolveRewardExtra(rewardLabel) {
  if (!rewardLabel || !rewardLabel.includes('+')) {
    return null;
  }
  return rewardLabel.split('+').slice(1).join('+').trim() || null;
}

function buildRewardExtra(rewardLabel, monthlyLeftBv, monthlyRightBv, matchingBv) {
  const extraLabel = resolveRewardExtra(rewardLabel);
  return JSON.stringify({
    extraLabel,
    leftBv: toMoney(monthlyLeftBv),
    rightBv: toMoney(monthlyRightBv),
    matchingBv: toMoney(matchingBv)
  });
}

async function runMonthlyRewards(monthStart, monthEnd, notes = null) {
  assertValidCycle(monthStart, monthEnd, 'Month');

  return withTransaction(async (client) => {
    let cycle;
    try {
      cycle = await compensationRepository.createMonthlyCycle(client, {
        monthStart,
        monthEnd,
        notes
      });
    } catch (error) {
      if (error.code === '23505') {
        throw new ApiError(409, `Monthly rewards already calculated for ${monthStart} to ${monthEnd}`);
      }
      throw error;
    }

    const users = await userRepository.listAllUsers(client);
    const results = [];

    for (const user of users) {
      const { leftBv, rightBv } = await compensationRepository.aggregateMonthlyLegBv(client, user.id, monthStart, monthEnd);
      const monthlyLeftBv = toMoney(leftBv);
      const monthlyRightBv = toMoney(rightBv);
      const monthlyMatchingBv = toMoney(Math.min(monthlyLeftBv, monthlyRightBv));
      const monthlyPv = toMoney(await compensationRepository.aggregateMonthlyPv(client, user.id, monthStart, monthEnd));
      const directIncome = toMoney(
        await compensationRepository.aggregateMonthlyIncomeBySource(client, user.id, monthStart, monthEnd, 'direct_income')
      );
      const matchingIncome = toMoney(
        await compensationRepository.aggregateMonthlyIncomeBySource(client, user.id, monthStart, monthEnd, 'matching_income')
      );

      const reward = resolveReward(monthlyMatchingBv);
      const rewardAmount = reward ? toMoney(reward.rewardAmount) : 0;
      const rewardLabel = reward ? reward.rewardLabel : null;
      const rewardLevel = reward ? `${reward.thresholdBv}_BV` : null;
      const rewardExtra = reward ? buildRewardExtra(rewardLabel, monthlyLeftBv, monthlyRightBv, monthlyMatchingBv) : null;
      const qualified = Boolean(reward);

      if (qualified && rewardAmount > 0) {
        await walletService.credit(client, user.id, rewardAmount, 'reward_qualification', cycle.id, {
          monthStart,
          monthEnd,
          matchingBv: monthlyMatchingBv,
          leftBv: monthlyLeftBv,
          rightBv: monthlyRightBv,
          rewardLabel
        });

        await compensationRepository.upsertMonthlyRewardQualification(client, {
          cycleId: cycle.id,
          userId: user.id,
          monthlyBv: monthlyMatchingBv,
          thresholdBv: reward.thresholdBv,
          rewardAmount,
          rewardLabel,
          rewardLevel,
          rewardExtra,
          status: 'qualified'
        });
      }

      const summary = await compensationRepository.upsertMonthlySummary(client, {
        cycleId: cycle.id,
        userId: user.id,
        monthlyBv: monthlyMatchingBv,
        monthlyPv,
        directIncome,
        matchingIncome,
        rewardAmount,
        rewardLabel,
        qualified
      });

      results.push(summary);
    }

    return { cycle, results };
  });
}

module.exports = {
  runMonthlyRewards,
  resolveReward
};
