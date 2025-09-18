import { send } from './http.js';
import crypto from 'crypto';

export const UNAUTHORIZED_TENANT_ACCESS_ERROR = {
  ok: false,
  error: 'unauthorized_tenant_access',
  message: 'You do not have access to this business data.',
};

export function assertRowBelongsToBusiness(
  rowBusinessId,
  userBusinessId,
  res
) {
  if (rowBusinessId !== userBusinessId) {
    send(res, 403, UNAUTHORIZED_TENANT_ACCESS_ERROR);
    return false;
  }
  return true;
}

export function generatePayloadHash(payload) {
  const payloadString = JSON.stringify(payload);
  return crypto.createHash('sha256').update(payloadString).digest('hex');
}
