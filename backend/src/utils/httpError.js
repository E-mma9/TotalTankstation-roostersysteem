export class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (msg, code) => new HttpError(400, msg, code);
export const unauthorized = (msg = 'Niet geautoriseerd', code) => new HttpError(401, msg, code);
export const forbidden = (msg = 'Geen toegang', code) => new HttpError(403, msg, code);
export const notFound = (msg = 'Niet gevonden', code) => new HttpError(404, msg, code);
export const conflict = (msg, code) => new HttpError(409, msg, code);
