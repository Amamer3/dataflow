import express from 'express';

const router = express.Router();

router.get('/paystack-public-key', (req, res) => {
  const publicKey = process.env.PAYSTACK_PUBLIC_KEY ?? null; 
  if (!publicKey) {
    res.status(500).json({ error: 'Paystack public key not configured' });
    return;
  }

  res.status(200).json({ publicKey });
});

export default router;
