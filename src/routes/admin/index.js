const express = require('express');
const dashboardRoutes = require('./dashboardRoutes');
const usersRoutes = require('./usersRoutes');
const productsRoutes = require('./productsRoutes');
const ordersRoutes = require('./ordersRoutes');
const walletRoutes = require('./walletRoutes');
const compensationRoutes = require('./compensationRoutes');
const rewardsRoutes = require('./rewardsRoutes');
const teamRoutes = require('./teamRoutes');
const settingsRoutes = require('./settingsRoutes');
const sellerApplicationsRoutes = require('./sellerApplicationsRoutes');
const ranksRoutes = require('./ranksRoutes');
const bannersRoutes = require('./bannersRoutes');
const auctionsRoutes = require('./auctionsRoutes');

const router = express.Router();

router.use('/dashboard', dashboardRoutes);
router.use('/users', usersRoutes);
router.use('/products', productsRoutes);
router.use('/orders', ordersRoutes);
router.use('/wallet', walletRoutes);
router.use('/compensation', compensationRoutes);
router.use('/rewards', rewardsRoutes);
router.use('/team', teamRoutes);
router.use('/settings', settingsRoutes);
router.use('/seller-applications', sellerApplicationsRoutes);
router.use('/ranks', ranksRoutes);
router.use('/banners', bannersRoutes);
router.use('/auctions', auctionsRoutes);

module.exports = router;
