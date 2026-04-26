import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config.js';

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

export function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

export function refreshTokenExpiry() {
  const days = parseInt(config.jwt.refreshExpiresIn, 10) || 7;
  const ms = (config.jwt.refreshExpiresIn.endsWith('d') ? days : 7) * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms);
}
