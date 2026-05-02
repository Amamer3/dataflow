import express from 'express';
import topupRouter from './topup.js';

const router = express.Router();

router.use('/', topupRouter);

export default router;