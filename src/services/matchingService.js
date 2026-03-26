const { withTransaction } = require('../db/pool');
const userRepository = require('../repositories/userRepository');
const compensationRepository = require('../repositories/compensationRepository');
const walletRepository = require('../repositories/walletRepository');
const walletService = require('./walletService');
const { MATCH_PERCENTAGE } = require('../config/constants');
const { ApiError } = require('../utils/ApiError');

function toMoney(value) {
  return Number(Number(value).toFixed(2));
}

function assertValidCycle(start, end) {
  if (!start || !end) {
    throw new ApiError(400, 'cycleStart and cycleEnd are required');
  }

  if (new Date(start) > new Date(end)) {
    throw new ApiError(400, 'cycleStart must be before or equal to cycleEnd');
  }
}

async function runWeeklyMatching(cycleStart, cycleEnd, notes = null) {
  assertValidCycle(cycleStart, cycleEnd);

  return withTransaction(async (client) => {
    let cycle;
    try {
      cycle = await compensationRepository.createWeeklyCycle(client, {
        cycleStart,
        cycleEnd,
        notes
      });
    } catch (error) {
      if (error.code === '23505') {
        throw new ApiError(409, `Weekly matching already executed for cycle ${cycleStart} to ${cycleEnd}`);
      }
      throw error;
    }

    const users = await userRepository.listForMatching(client);
    const summaries = [];

    for (const user of users) {
      const left = Number(user.carry_left_pv);
      const right = Number(user.carry_right_pv);
      const matchedPv = toMoney(Math.min(left, right));
      const grossIncome = toMoney(matchedPv * MATCH_PERCENTAGE);

      const weeklyVolumes = await compensationRepository.aggregateUserQualifyingVolumes(
        client,
        user.id,
        cycleStart,
        cycleEnd
      );
      const selfPv = Number(weeklyVolumes.total_pv || 0);
      const capMultiplier = Number(user.cap_multiplier || 3);
      const capLimit = toMoney(selfPv * capMultiplier);
      const netIncome = toMoney(Math.min(grossIncome, capLimit));
      const cappedOverflow = toMoney(Math.max(0, grossIncome - netIncome));
      const flushedLeftPv = toMoney(left - matchedPv);
      const flushedRightPv = toMoney(right - matchedPv);
      const directIncome = await compensationRepository.aggregateUserDirectIncome(
        client,
        user.id,
        cycleStart,
        cycleEnd
      );

      if (netIncome > 0) {
        await walletService.credit(client, user.id, netIncome, 'matching_income', cycle.id, {
          cycleStart,
          cycleEnd,
          matchedPv,
          capMultiplier,
          capLimit,
          grossIncome
        });
      }

      if (cappedOverflow > 0) {
        await walletRepository.createTransaction(client, {
          userId: user.id,
          txType: 'debit',
          source: 'cap_overflow',
          amount: cappedOverflow,
          referenceId: cycle.id,
          metadata: {
            cycleStart,
            cycleEnd,
            grossIncome,
            netIncome,
            reason: 'Matching cap overflow retained by cap rule'
          }
        });
      }

      const summary = await compensationRepository.createWeeklyUserSummary(client, {
        cycleId: cycle.id,
        userId: user.id,
        rankId: user.rank_id,
        selfPv,
        leftPv: left,
        rightPv: right,
        matchedPv,
        matchingIncomeGross: grossIncome,
        capMultiplier,
        capLimit,
        matchingIncomeNet: netIncome,
        cappedOverflow,
        flushedLeftPv,
        flushedRightPv,
        directIncome
      });

      await userRepository.applyMatchingReset(client, user.id);
      summaries.push(summary);
    }

    return { cycle, summaries };
  });
}

async function listRuns() {
  return compensationRepository.listWeeklyCycles(null, 20);
}

async function getRunResults(cycleId) {
  return compensationRepository.getWeeklyCycleResults(null, cycleId);
}

module.exports = {
  runWeeklyMatching,
  listRuns,
  getRunResults
};
