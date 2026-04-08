const { withTransaction } = require('../db/pool');
const orderRepository = require('../repositories/orderRepository');
const productRepository = require('../repositories/productRepository');
const userRepository = require('../repositories/userRepository');
const userAddressRepository = require('../repositories/userAddressRepository');
const sellerRepository = require('../repositories/sellerRepository');
const walletService = require('./walletService');
const notificationService = require('./notificationService');
const { ApiError } = require('../utils/ApiError');
const { PV_TO_BV_RATIO } = require('../config/constants');

function toMoney(value) {
  return Number(Number(value).toFixed(2));
}

function buildDeliveryAddressSnapshot(address) {
  if (!address) return null;

  return {
    id: address.id,
    fullName: address.full_name,
    mobile: address.mobile,
    alternateMobile: address.alternate_mobile || '',
    country: address.country,
    state: address.state,
    city: address.city,
    area: address.area,
    addressLine: address.address_line,
    postalCode: address.postal_code,
    deliveryNote: address.delivery_note || '',
    isDefault: Boolean(address.is_default),
    capturedAt: new Date().toISOString()
  };
}

async function createOrder(userId, payload) {
  return withTransaction(async (client) => {
    if (!payload.items || payload.items.length === 0) {
      throw new ApiError(400, 'Order must contain at least one item');
    }

    if (payload.paymentSource && payload.paymentSource !== 'deposit_wallet') {
      throw new ApiError(400, 'Selected wallet is not allowed for this purchase');
    }

    const user = await userRepository.getBinaryNode(client, userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (!payload.addressId) {
      throw new ApiError(400, 'Delivery address is required');
    }

    const deliveryAddress = await userAddressRepository.getByIdAndUserId(client, payload.addressId, userId);
    if (!deliveryAddress) {
      throw new ApiError(400, 'Selected delivery address is invalid');
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
      if (!Number.isFinite(price) || price <= 0) {
        throw new ApiError(400, `Product price is invalid: ${item.productId}`);
      }
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

    await walletService.debitDepositBalance(client, userId, totalAmount, 'order_purchase', null, {
      reason: 'Order purchase',
      walletType: 'deposit',
      totalAmount
    });

    const order = await orderRepository.createOrder(client, {
      userId,
      status: 'paid',
      totalAmount,
      totalPv,
      totalBv,
      deliveryAddressId: deliveryAddress.id,
      deliveryAddressSnapshot: buildDeliveryAddressSnapshot(deliveryAddress),
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

    await notificationService.createNotificationOnce(client, notificationService.buildOrderStatusNotification(order));

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
