import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../database/client';
import { config } from '../../config';
import { AppError } from '../../middleware/error';
import { RegisterInput, LoginInput } from './auth.schema';
import { TokenPayload } from '../../types';

const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiry as any,
  });
};

const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiry as any,
  });
};

export const authService = {
  async register(data: RegisterInput) {
    const existing = await prisma.admin.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError('Email already registered', 409);

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const admin = await prisma.admin.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    const payload: TokenPayload = { id: admin.id, email: admin.email, role: admin.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({ data: { adminId: admin.id, token: refreshToken, expiresAt } });

    return { admin, accessToken, refreshToken };
  },

  async login(data: LoginInput) {
    const admin = await prisma.admin.findUnique({ where: { email: data.email } });
    if (!admin) throw new AppError('Invalid email or password', 401);

    const isPasswordValid = await bcrypt.compare(data.password, admin.password);
    if (!isPasswordValid) throw new AppError('Invalid email or password', 401);

    const payload: TokenPayload = { id: admin.id, email: admin.email, role: admin.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({ data: { adminId: admin.id, token: refreshToken, expiresAt } });

    const { password: _, ...adminData } = admin;
    return { admin: adminData, accessToken, refreshToken };
  },

  async refreshToken(token: string) {
    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    let decoded: TokenPayload;
    try {
      decoded = jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
    } catch {
      throw new AppError('Invalid refresh token', 401);
    }

    const admin = await prisma.admin.findUnique({ where: { id: decoded.id } });
    if (!admin) throw new AppError('Account not found', 401);

    const payload: TokenPayload = { id: admin.id, email: admin.email, role: admin.role };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    // Rotate refresh token
    await prisma.refreshToken.delete({ where: { token } });
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({ data: { adminId: admin.id, token: newRefreshToken, expiresAt } });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  },

  async logout(token: string) {
    await prisma.refreshToken.deleteMany({ where: { token } });
  },

  async getProfile(adminId: string) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    if (!admin) throw new AppError('Admin not found', 404);
    return admin;
  },
};
