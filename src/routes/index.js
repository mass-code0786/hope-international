const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const walletRoutes = require('./walletRoutes');
const matchingRoutes = require('./matchingRoutes');
const productRoutes = require('./productRoutes');
const orderRoutes = require('./orderRoutes');
const adminRoutes = require('./admin');
const sellerRoutes = require('./sellerRoutes');
const { auth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/wallet', walletRoutes);
router.use('/matching', matchingRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/seller', sellerRoutes);
router.use('/admin', auth(), requireAdmin, adminRoutes);

module.exports = router;
