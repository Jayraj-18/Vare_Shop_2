import express from 'express';
import { registerUser, loginUser, getUserProfile } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
// router.get('/profile', protect, getUserProfile); // We'll add 'protect' middleware if needed later

export default router;
