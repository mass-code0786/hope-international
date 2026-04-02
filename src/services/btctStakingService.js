const { withTransaction } = require('../db/pool');
const { ApiError } = require('../utils/ApiError');
const walletRepository = require('../repositories/walletRepository');
const stakingRepository = require('../repositories/btctStakingRepository');
const walletService = require('./walletService');

const STAKING_REQUIRED_BTCT = 15000;
const STAKING_PAYOUT_USD = 15;
const STAKING_INTERVAL_DAYS = 10;

function addDays(dateInput, days) {
  const date = new Date(dateInput);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function normalizeStakingPlan(plan, wallet = null, payouts = []) {
  const safeWallet = wallet || {};
  return {
    plan,
    payouts,
    eligibility: {
      requiredBtct: STAKING_REQUIRED_BTCT,
      rewardAmountUsd: STAKING_PAYOUT_USD,
      payoutIntervalDays: STAKING_INTERVAL_DAYS,
      availableBtctBalance: Number(safeWallet.btct_available_balance ?? safeWallet.btct_balance ?? 0),
      lockedBtctBalance: Number(safeWallet.btct_locked_balance ?? 0),
      isEligible: Number(safeWallet.btct_available_balance ?? safeWallet.btct_balance ?? 0) >= STAKING_REQUIRED_BTCT && !plan
    }
  };
}

async function getUserStakingSummary(client, userId) {
  await walletRepository.createWallet(client, userId);
  const wallet = await walletService.getWalletSummary(client, userId);
  const plan = await stakingRepository.getActiveStakingByUserId(client, userId);
  const payouts = await stakingRepository.listPayoutsByUserId(client, userId, 100);
  return normalizeStakingPlan(plan, wallet.wallet, payouts);
}

async function startStaking(userId) {
  return withTransaction(async (client) => {
    await walletRepository.createWallet(client, userId);
    const walletSummary = await walletService.getWalletSummary(client, userId);
    const activePlan = await stakingRepository.getActiveStakingByUserId(client, userId, { forUpdate: true });
    if (activePlan) {
      throw new ApiError(409, 'BTCT staking is already active');
    }

    const availableBtct = Number(walletSummary.wallet?.btct_available_balance ?? walletSummary.wallet?.btct_balance ?? 0);
    if (availableBtct < STAKING_REQUIRED_BTCT) {
      throw new ApiError(400, `At least ${STAKING_REQUIRED_BTCT} BTCT is required to start staking`);
    }

    const lockedWallet = await walletRepository.adjustBtctLockedBalance(client, userId, STAKING_REQUIRED_BTCT);
    const startedAt = new Date().toISOString();
    const plan = await stakingRepository.createStakingPlan(client, {
      userId,
      stakingAmountBtct: STAKING_REQUIRED_BTCT,
      rewardAmountUsd: STAKING_PAYOUT_USD,
      payoutIntervalDays: STAKING_INTERVAL_DAYS,
      startedAt,
      nextPayoutAt: addDays(startedAt, STAKING_INTERVAL_DAYS),
      status: 'active'
    });

    return normalizeStakingPlan(plan, lockedWallet, []);
  });
}

async function runDuePayouts({ asOf = new Date().toISOString(), limit = 100 } = {}) {
  return withTransaction(async (client) => {
    const duePlans = await stakingRepository.listDueStakingPlans(client, asOf, limit);
    const processed = [];

    for (const duePlan of duePlans) {
      const plan = await stakingRepository.getStakingPlanById(client, duePlan.id, { forUpdate: true });
      if (!plan || plan.status !== 'active') continue;

      let nextPayoutAt = plan.next_payout_at;
      let lastPayoutAt = plan.last_payout_at;
      let totalPayouts = Number(plan.total_payouts || 0);
      let totalPayoutAmount = Number(plan.total_payout_amount || 0);
      let payoutsCreated = 0;

      while (new Date(nextPayoutAt) <= new Date(asOf)) {
        const cycleNumber = totalPayouts + 1;
        const payout = await stakingRepository.createStakingPayout(client, {
          stakingId: plan.id,
          userId: plan.user_id,
          cycleNumber,
          payoutAmountUsd: STAKING_PAYOUT_USD,
          payoutDate: nextPayoutAt,
          creditedTo: 'withdrawal_wallet'
        });

        if (payout) {
          await walletService.credit(client, plan.user_id, STAKING_PAYOUT_USD, 'btct_staking_payout', payout.id, {
            stakingId: plan.id,
            cycleNumber,
            creditedTo: 'withdrawal_wallet',
            walletType: 'withdrawal'
          });
          const walletTx = await walletRepository.getTransactionBySourceAndReference(client, plan.user_id, 'btct_staking_payout', payout.id);
          if (walletTx?.id) {
            await stakingRepository.updateStakingPayoutWalletTransaction(client, payout.id, walletTx.id);
          }
          payoutsCreated += 1;
        }

        totalPayouts = Math.max(totalPayouts, cycleNumber);
        totalPayoutAmount = Number((totalPayoutAmount + STAKING_PAYOUT_USD).toFixed(2));
        lastPayoutAt = nextPayoutAt;
        nextPayoutAt = addDays(nextPayoutAt, STAKING_INTERVAL_DAYS);
      }

      if (payoutsCreated > 0) {
        const updated = await stakingRepository.updateStakingPlanPayoutProgress(client, plan.id, {
          lastPayoutAt,
          nextPayoutAt,
          totalPayouts,
          totalPayoutAmount
        });
        processed.push(updated);
      }
    }

    return {
      asOf,
      processedCount: processed.length,
      plans: processed
    };
  });
}

module.exports = {
  STAKING_REQUIRED_BTCT,
  STAKING_PAYOUT_USD,
  STAKING_INTERVAL_DAYS,
  getUserStakingSummary,
  startStaking,
  runDuePayouts
};
