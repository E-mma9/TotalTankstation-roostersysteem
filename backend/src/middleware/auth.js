import { verifyAccessToken } from '../utils/jwt.js';
import { unauthorized, forbidden } from '../utils/httpError.js';

export function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(unauthorized('Geen access token'));
  }
  try {
    const payload = verifyAccessToken(header.slice(7));
    req.user = { id: payload.sub, role: payload.role, email: payload.email, firstName: payload.firstName, lastName: payload.lastName };
    next();
  } catch {
    next(unauthorized('Ongeldig of verlopen access token'));
  }
}

export function requireManager(req, _res, next) {
  if (req.user?.role !== 'MANAGER') {
    return next(forbidden('Manager-rol vereist'));
  }
  next();
}
