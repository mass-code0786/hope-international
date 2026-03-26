const { normalizePagination, buildPagination } = require('../../utils/pagination');
const { ApiError } = require('../../utils/ApiError');
const adminRepository = require('../../repositories/adminRepository');
const matchingService = require('../matchingService');
const rewardService = require('../rewardService');
const orderSettlementService = require('../orderSettlementService');

async function listWeekly(filters, paginationInput) {
  const pagination = normalizePagination(paginationInput);
  const result = await adminRepository.listWeeklyCycles(null, pagination);
  return {
    data: result.items,
    pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: result.total })
  };
}

async function getWeeklyCycle(cycleId) {
  const cycle = await adminRepository.getWeeklyCycleById(null, cycleId);
  if (!cycle) {
    throw new ApiError(404, 'Weekly cycle not found');
  }
  return cycle;
}

async function runWeekly(adminUserId, payload) {
  const result = await matchingService.runWeeklyMatching(payload.cycleStart, payload.cycleEnd, payload.notes);

  await adminRepository.logAdminAction(null, {
    adminUserId,
    actionType: 'compensation.weekly.run',
    targetEntity: 'weekly_cycle',
    targetId: result?.cycle?.id,
    beforeData: null,
    afterData: result?.cycle,
    metadata: {
      cycleStart: payload.cycleStart,
      cycleEnd: payload.cycleEnd
    }
  });

  return result;
}

async function runSettlements(adminUserId, payload) {
  const result = await orderSettlementService.runSettlementProcessor({
    asOf: payload.asOf,
    limit: payload.limit,
    actorUserId: adminUserId,
    notes: payload.notes
  });

  await adminRepository.logAdminAction(null, {
    adminUserId,
    actionType: 'order.settlement.run',
    targetEntity: 'order_settlement',
    targetId: null,
    beforeData: null,
    afterData: null,
    metadata: {
      asOf: result.asOf,
      limit: result.limit,
      settledCount: result.settledCount,
      reversedCount: result.reversedCount
    }
  });

  return result;
}

async function listMonthly(filters, paginationInput) {
  const pagination = normalizePagination(paginationInput);
  const result = await adminRepository.listMonthlyCycles(null, pagination);
  return {
    data: result.items,
    pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: result.total })
  };
}

async function getMonthlyCycle(cycleId) {
  const cycle = await adminRepository.getMonthlyCycleById(null, cycleId);
  if (!cycle) {
    throw new ApiError(404, 'Monthly cycle not found');
  }
  return cycle;
}

async function runMonthly(adminUserId, payload) {
  const result = await rewardService.runMonthlyRewards(payload.monthStart, payload.monthEnd, payload.notes);

  await adminRepository.logAdminAction(null, {
    adminUserId,
    actionType: 'compensation.monthly.run',
    targetEntity: 'monthly_cycle',
    targetId: result?.cycle?.id,
    beforeData: null,
    afterData: result?.cycle,
    metadata: {
      monthStart: payload.monthStart,
      monthEnd: payload.monthEnd
    }
  });

  return result;
}

module.exports = {
  listWeekly,
  getWeeklyCycle,
  runWeekly,
  runSettlements,
  listMonthly,
  getMonthlyCycle,
  runMonthly
};
