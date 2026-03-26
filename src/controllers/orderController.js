const asyncHandler = require('../utils/asyncHandler');
const orderService = require('../services/orderService');

const create = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.user.sub, req.body);
  res.status(201).json(order);
});

const listMine = asyncHandler(async (req, res) => {
  const orders = await orderService.listOrders(req.user.sub);
  res.status(200).json(orders);
});

module.exports = {
  create,
  listMine
};
