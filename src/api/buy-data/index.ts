import express from 'express';
import initiateRouter from './initiate.js';
import verifyRouter from './verify.js';

const router = express.Router();

router.use('/', initiateRouter);
router.use('/', verifyRouter);

export default router;