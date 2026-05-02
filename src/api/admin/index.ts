import express from 'express';
import usersRoutes from './users.js';
import bundlesRoutes from './bundles.js';
import transactionsRoutes from './transactions.js';
import providersRoutes from './providers.js';
import systemRoutes from './system.js';

const router = express.Router();

router.use('/users', usersRoutes);
router.use('/bundles', bundlesRoutes);
router.use('/transactions', transactionsRoutes);
router.use('/providers', providersRoutes);
router.use('/', systemRoutes);

export default router;
