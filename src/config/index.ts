import dotenv from 'dotenv';
import path from 'path';

// Load environmental variables
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  env: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'super-secret-access-token-key-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-token-key-change-in-production',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
};

export default config;
