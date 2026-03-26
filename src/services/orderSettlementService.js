const { withTransaction } = require('../db/pool');
const orderRepository = require('../repositories/orderRepository');
const userRepository = require('../repositories/userRepository');
const volumeRepository = require('../repositories/volumeRepository');
const sellerRepository = require('../repositories/sellerRepository');
const walletService = require('./walletService');
const rankService = require('./rankService');
const { DIRECT_INCOME_PERCENTAGE } = require('../config/constants');

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

async function applyMlmEffectsForOrder(client, order) {
  const user = await userRepository.getBinaryNode(client, order.user_id);
  if (!user) {
    return {
      qualifyingPv: 0,
      qualifyingBv: 0,
      directIncome: 0,
      volumePropagated: false
    };
  }

  const totals = await orderRepository.getQualifyingOrderTotals(client, order.id);
  const qualifyingPv = toMoney(Number(totals.qualifying_pv || 0));
  const qualifyingBv = toMoney(Number(totals.qualifying_bv || 0));

  if (qualifyingPv <= 0 && qualifyingBv <= 0) {
    return {
      qualifyingPv,
      qualifyingBv,
      directIncome: 0,
      volumePropagated: false
    };
  }

  await userRepository.addSelfVolume(client, user.id, qualifyingPv, qualifyingBv);
  await rankService.refreshUserRank(client, user.id);

  let current = user;
  while (current && current.parent_id) {
    const ancestor = await userRepository.getBinaryNode(client, current.parent_id);
    if (!ancestor) {
      break;
    }

    const leg = current.placement_side;
    if (!leg) {
      break;
    }

    await userRepository.addTeamVolume(client, ancestor.id, leg, qualifyingPv, qualifyingBv);
    await volumeRepository.createVolumeLedgerEntry(client, {
      ancestorUserId: ancestor.id,
      sourceUserId: user.id,
      orderId: order.id,
      leg,
      pv: qualifyingPv,
      bv: qualifyingBv
    });
    await rankService.refreshUserRank(client, ancestor.id);
    current = ancestor;
  }

  let directIncome = 0;
  if (user.sponsor_id && qualifyingBv > 0) {
    directIncome = toMoney(qualifyingBv * DIRECT_INCOME_PERCENTAGE);
    if (directIncome > 0) {
      await walletService.credit(client, user.sponsor_id, directIncome, 'direct_income', order.id, {
        sourceUserId: user.id,
        qualifyingBv,
        percentage: DIRECT_INCOME_PERCENTAGE,
        settlement: true
      });
    }
  }

  return {
    qualifyingPv,
    qualifyingBv,
    directIncome,
    volumePropagated: true
  };
}

async function runSettlementProcessor({ asOf, limit = 100, actorUserId = null, notes = null } = {}) {
  const settledOrders = [];
  const reversedOrders = [];

  const effectiveAsOf = asOf ? new Date(asOf) : new Date();

  await withTransaction(async (client) => {
    const pendingOrders = await orderRepository.listPendingSettlementOrders(client, effectiveAsOf.toISOString(), limit);

    for (const order of pendingOrders) {
      if (['cancelled', 'replaced', 'returned'].includes(order.status)) {
        await sellerRepository.updateSellerEarningsStatusByOrder(client, order.id, ['pending', 'eligible', 'paid', 'finalized'], 'reversed');
        const updated = await orderRepository.markOrderSettlementReversed(
          client,
          order.id,
          notes || 'Order cancelled/replaced within replacement window'
        );
        await orderRepository.createOrderSettlementEvent(client, {
          orderId: order.id,
          previousStatus: order.settlement_status,
          nextStatus: 'reversed',
          actorUserId,
          eventType: 'settlement.reversed',
          notes: updated?.settlement_notes,
          metadata: {
            orderStatus: order.status
          }
        });
        reversedOrders.push(updated);
        continue;
      }

      if (order.status !== 'paid') {
        continue;
      }

      const mlm = await applyMlmEffectsForOrder(client, order);
      await sellerRepository.updateSellerEarningsStatusByOrder(
        client,
        order.id,
        ['pending', 'eligible', 'paid'],
        'finalized',
        { settledAtNow: true }
      );
      const updated = await orderRepository.markOrderSettled(client, order.id, notes || 'Order settled after replacement window');
      await orderRepository.createOrderSettlementEvent(client, {
        orderId: order.id,
        previousStatus: order.settlement_status,
        nextStatus: 'settled',
        actorUserId,
        eventType: 'settlement.settled',
        notes: updated?.settlement_notes,
        metadata: mlm
      });
      settledOrders.push(updated);
    }
  });

  return {
    asOf: effectiveAsOf.toISOString(),
    limit,
    settledCount: settledOrders.length,
    reversedCount: reversedOrders.length,
    settledOrders,
    reversedOrders
  };
}

module.exports = {
  runSettlementProcessor
};
