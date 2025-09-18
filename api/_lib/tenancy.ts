// Tenancy utilities for multi-tenant data isolation

export interface TenancyError {
  ok: false;
  error: string;
  code: string;
}

// Error response for unauthorized cross-tenant access
export const UNAUTHORIZED_CROSS_TENANT_ACCESS: TenancyError = {
  ok: false,
  error: 'Unauthorized access to data from different business',
  code: 'CROSS_TENANT_ACCESS_DENIED'
};

// Assert that a row belongs to the user's business
export function assertRowBelongsToBusiness(
  rowBusinessId: string | null | undefined,
  userBusinessId: string | null | undefined
): void {
  if (!rowBusinessId || !userBusinessId) {
    throw new Error('Missing business_id in row or user context');
  }
  
  if (rowBusinessId !== userBusinessId) {
    throw new Error('Row does not belong to user\'s business');
  }
}

// Validate business_id format (UUID)
export function isValidBusinessId(businessId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(businessId);
}

// Generate payload hash for audit logging
export function generatePayloadHash(payload: any): string {
  const crypto = require('crypto');
  const payloadString = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto.createHash('sha256').update(payloadString).digest('hex');
}
