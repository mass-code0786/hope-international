const { withTransaction } = require('../db/pool');
const orderRepository = require('../repositories/orderRepository');
const productRepository = require('../repositories/productRepository');
const userRepository = require('../repositories/userRepository');
const sellerRepository = require('../repositories/sellerRepository');
const walletService = require('./walletService');
const { ApiError } = require('../utils/ApiError');
const { PV_TO_BV_RATIO } = require('../config/constants');

function toMoney(value) {
  return Number(Number(value).toFixed(2));
}

async function createOrder(userId, payload) {
  return withTransaction(async (client) => {
    if (!payload.items || payload.items.length === 0) {
      throw new ApiError(400, 'Order must contain at least one item');
    }

    const user = await userRepository.getBinaryNode(client, userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const enrichedItems = [];
    for (const item of payload.items) {
      const product = await productRepository.findById(client, item.productId);
      if (!product || !product.is_active) {
        throw new ApiError(404, `Product not available: ${item.productId}`);
      }

      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new ApiError(400, 'Quantity must be a positive number');
      }

      const price = Number(product.price);
      const bv = Number(product.bv);
      const pv = toMoney(bv * PV_TO_BV_RATIO);
      const lineTotal = toMoney(price * quantity);
      const linePv = toMoney(pv * quantity);
      const lineBv = toMoney(bv * quantity);

      enrichedItems.push({
        productId: product.id,
        quantity,
        price,
        pv,
        bv,
        lineTotal,
        linePv,
        lineBv,
        isQualifying: product.is_qualifying,
        sellerProfileId: product.seller_profile_id || null,
        category: product.category || 'General'
      });
    }

    const totalAmount = toMoney(enrichedItems.reduce((sum, i) => sum + i.lineTotal, 0));
    const totalPv = toMoney(enrichedItems.reduce((sum, i) => sum + i.linePv, 0));
    const totalBv = toMoney(enrichedItems.reduce((sum, i) => sum + i.lineBv, 0));
    if (payload.chargeWallet === false) {
      throw new ApiError(400, 'Wallet payment is required for this order');
    }

    await walletService.debit(client, userId, totalAmount, 'order_purchase', null, {
      reason: 'Order purchase',
      totalAmount
    });

    const order = await orderRepository.createOrder(client, {
      userId,
      status: 'paid',
      totalAmount,
      totalPv,
      totalBv,
      replacementWindowEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      settlementStatus: 'pending',
      settlementNotes: 'Awaiting replacement window settlement'
    });

    const sellerProfilesCache = new Map();

    for (const item of enrichedItems) {
      const orderItem = await orderRepository.createOrderItem(client, {
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        pv: item.pv,
        bv: item.bv,
        lineTotal: item.lineTotal
      });

      if (item.sellerProfileId) {
        let sellerProfile = sellerProfilesCache.get(item.sellerProfileId);
        if (!sellerProfile) {
          sellerProfile = await sellerRepository.getSellerProfileById(client, item.sellerProfileId);
          if (sellerProfile) {
            sellerProfilesCache.set(item.sellerProfileId, sellerProfile);
          }
        }

        if (sellerProfile) {
          const commissionRate = 0.5;
          const sellerCommission = toMoney(item.lineTotal * commissionRate);
          const platformMargin = toMoney(item.lineTotal - sellerCommission);
          await sellerRepository.createSellerEarningEntry(client, {
            sellerProfileId: item.sellerProfileId,
            sellerUserId: sellerProfile.user_id,
            orderId: order.id,
            orderItemId: orderItem.id,
            sourceType: 'order_sale',
            grossAmount: item.lineTotal,
            netEarningAmount: sellerCommission,
            commissionRate,
            platformMarginAmount: platformMargin,
            bv: item.lineBv,
            pv: item.linePv,
            earningStatus: 'pending',
            metadata: {
              quantity: item.quantity,
              productId: item.productId,
              category: item.category
            }
          });
        }
      }
    }

    return order;
  });
}

async function listOrders(userId) {
  return orderRepository.listOrdersByUser(null, userId);
}

module.exports = {
  createOrder,
  listOrders
};
