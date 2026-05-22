import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate, validate } from '../../middleware/auth';
import { registerSchema, loginSchema, refreshTokenSchema } from './auth.schema';

export const authRoutes = Router();

// POST /api/v1/auth/register
authRoutes.post('/register', validate(registerSchema), authController.register);

// POST /api/v1/auth/login
authRoutes.post('/login', validate(loginSchema), authController.login);

// POST /api/v1/auth/refresh
authRoutes.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);

// POST /api/v1/auth/logout
authRoutes.post('/logout', authController.logout);

// GET /api/v1/auth/profile
authRoutes.get('/profile', authenticate, authController.profile as any);
