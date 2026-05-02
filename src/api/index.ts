import express from 'express';
import paystackKeyRouter from './paystack-public-key.js';

const router = express.Router();

router.use('/', paystackKeyRouter);

export default router;