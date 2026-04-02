const { withTransaction } = require('../db/pool');
const { ApiError } = require('../utils/ApiError');
const walletRepository = require('../repositories/walletRepository');
const stakingRepository = require('../repositories/btctStakingRepository');
const walletService = require('./walletService');

const STAKING_BLOCK_BTCT = 5000;
const STAKING_PAYOUT_USD_PER_BLOCK = 10;
const STAKING_PAYOUT_DAYS = [10, 20, 30];
const STAKING_SCHEDULE_CODE = 'fixed_month_days_10_20_30';

function roundBtct(value) {
  return Number(Number(value || 0).toFixed(4));
}

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function getEligibleBlocks(availableBtct) {
  return Math.max(0, Math.floor(Number(availableBtct || 0) / STAKING_BLOCK_BTCT));
}

function isValidStakingAmount(amount) {
  return Number.isFinite(Number(amount))
    && Number(amount) >= STAKING_BLOCK_BTCT
    && Number(amount) % STAKING_BLOCK_BTCT === 0;
}

function getCycleKey(dateInput) {
  const date = new Date(dateInput);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getValidUtcDate(year, monthIndex, day) {
  const candidate = new Date(Date.UTC(year, monthIndex, day, 0, 0, 0, 0));
  if (candidate.getUTCFullYear() !== year || candidate.getUTCMonth() !== monthIndex || candidate.getUTCDate() !== day) {
    return null;
  }
  return candidate;
}

function getNextScheduledPayoutDate(afterDateInput) {
  const afterDate = new Date(afterDateInput);

  for (let monthOffset = 0; monthOffset < 24; monthOffset += 1) {
    const year = afterDate.getUTCFullYear() + Math.floor((afterDate.getUTCMonth() + monthOffset) / 12);
    const monthIndex = (afterDate.getUTCMonth() + monthOffset) % 12;

    for (const payoutDay of STAKING_PAYOUT_DAYS) {
      const candidate = getValidUtcDate(year, monthIndex, payoutDay);
      if (!candidate) continue;
      if (candidate > afterDate) {
        return candidate.toISOString();
      }
    }
  }

  throw new ApiError(500, 'Unable to calculate next BTCT staking payout date');
}

function normalizeStakingPlan(plan, wallet = null, payouts = []) {
  const safeWallet = wallet || {};
  const availableBtctBalance = Number(safeWallet.btct_available_balance ?? safeWallet.btct_balance ?? 0);
  const lockedBtctBalance = Number(safeWallet.btct_locked_balance ?? 0);
  const eligibleBlocks = getEligibleBlocks(availableBtctBalance);
  const autoStakeAmountBtct = roundBtct(eligibleBlocks * STAKING_BLOCK_BTCT);
  const autoPayoutPerCycleUsd = toMoney(eligibleBlocks * STAKING_PAYOUT_USD_PER_BLOCK);

  return {
    plan: plan
      ? {
          ...plan,
          staked_blocks: Number(plan.staked_blocks ?? Math.floor(Number(plan.staking_amount_btct || 0) / STAKING_BLOCK_BTCT)),
          payout_per_cycle_usd: toMoney(plan.payout_per_cycle_usd ?? plan.reward_amount_usd ?? 0)
        }
      : null,
    payouts,
    eligibility: {
      minimumBtct: STAKING_BLOCK_BTCT,
      blockSizeBtct: STAKING_BLOCK_BTCT,
      payoutUsdPerBlock: STAKING_PAYOUT_USD_PER_BLOCK,
      payoutDays: STAKING_PAYOUT_DAYS,
      availableBtctBalance,
      lockedBtctBalance,
      eligibleBlocks,
      autoStakeAmountBtct,
      autoPayoutPerCycleUsd,
      isEligible: eligibleBlocks >= 1 && !plan
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

async function startStaking(userId, payload = {}) {
  return withTransaction(async (client) => {
    await walletRepository.createWallet(client, userId);
    const walletSummary = await walletService.getWalletSummary(client, userId);
    const activePlan = await stakingRepository.getActiveStakingByUserId(client, userId, { forUpdate: true });
    if (activePlan) {
      throw new ApiError(409, 'BTCT staking is already active');
    }

    const availableBtct = Number(walletSummary.wallet?.btct_available_balance ?? walletSummary.wallet?.btct_balance ?? 0);
    const eligibleBlocks = getEligibleBlocks(availableBtct);
    const stakingAmountBtct = payload?.stakingAmountBtct === undefined || payload?.stakingAmountBtct === null
      ? eligibleBlocks * STAKING_BLOCK_BTCT
      : Number(payload.stakingAmountBtct);

    if (!isValidStakingAmount(stakingAmountBtct)) {
      throw new ApiError(400, `Staking amount must be ${STAKING_BLOCK_BTCT} BTCT or a multiple of ${STAKING_BLOCK_BTCT} BTCT`);
    }

    if (stakingAmountBtct > availableBtct) {
      throw new ApiError(400, 'Insufficient BTCT available for staking');
    }

    const stakedBlocks = Math.floor(stakingAmountBtct / STAKING_BLOCK_BTCT);
    const payoutPerCycleUsd = toMoney(stakedBlocks * STAKING_PAYOUT_USD_PER_BLOCK);
    const lockedWallet = await walletRepository.adjustBtctLockedBalance(client, userId, stakingAmountBtct);
    const startedAt = new Date().toISOString();
    const plan = await stakingRepository.createStakingPlan(client, {
      userId,
      stakingAmountBtct,
      stakedBlocks,
      rewardAmountUsd: payoutPerCycleUsd,
      payoutPerCycleUsd,
      payoutIntervalDays: 10,
      scheduleCode: STAKING_SCHEDULE_CODE,
      startedAt,
      nextPayoutAt: getNextScheduledPayoutDate(startedAt),
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
      let lastProcessedPayoutAt = plan.last_payout_at;
      let cycleNumber = Number(plan.total_payouts || 0);
      let payoutsCreated = 0;
      const payoutPerCycleUsd = toMoney(plan.payout_per_cycle_usd ?? plan.reward_amount_usd ?? 0);

      while (new Date(nextPayoutAt) <= new Date(asOf)) {
        cycleNumber += 1;
        const cycleKey = getCycleKey(nextPayoutAt);
        let payout = await stakingRepository.getStakingPayoutByCycleKey(client, plan.id, cycleKey);

        if (!payout) {
          payout = await stakingRepository.createStakingPayout(client, {
            stakingId: plan.id,
            userId: plan.user_id,
            cycleNumber,
            cycleKey,
            payoutAmountUsd: payoutPerCycleUsd,
            payoutDate: nextPayoutAt,
            creditedTo: 'withdrawal_wallet'
          });
        }

        if (payout && !payout.wallet_transaction_id) {
          const effectiveCycleNumber = Number(payout.cycle_number || cycleNumber);
          const { transaction } = await walletService.creditWithTransaction(
            client,
            plan.user_id,
            payoutPerCycleUsd,
            'btct_staking_payout',
            payout.id,
            {
              stakingId: plan.id,
              cycleNumber: effectiveCycleNumber,
              cycleKey,
              stakedBlocks: Number(plan.staked_blocks || 0),
              stakingAmountBtct: Number(plan.staking_amount_btct || 0),
              payoutPerCycleUsd,
              creditedTo: 'withdrawal_wallet',
              walletType: 'withdrawal'
            }
          );
          await stakingRepository.updateStakingPayoutWalletTransaction(client, payout.id, transaction.id);
          payoutsCreated += 1;
        }

        lastProcessedPayoutAt = nextPayoutAt;
        nextPayoutAt = getNextScheduledPayoutDate(nextPayoutAt);
      }

      if (lastProcessedPayoutAt !== plan.last_payout_at || nextPayoutAt !== plan.next_payout_at) {
        const summary = await stakingRepository.getStakingPlanPayoutSummary(client, plan.id);
        const updated = await stakingRepository.updateStakingPlanPayoutProgress(client, plan.id, {
          lastPayoutAt: summary?.last_payout_at || lastProcessedPayoutAt || null,
          nextPayoutAt,
          totalPayouts: Number(summary?.total_payouts || 0),
          totalPayoutAmount: toMoney(summary?.total_payout_amount || 0)
        });
        processed.push({
          ...updated,
          payouts_created: payoutsCreated
        });
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
  STAKING_BLOCK_BTCT,
  STAKING_PAYOUT_USD_PER_BLOCK,
  STAKING_PAYOUT_DAYS,
  getUserStakingSummary,
  startStaking,
  runDuePayouts
};
