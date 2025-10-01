function createMockRes() {
  return { statusCode: 200, _json: null, status(code){ this.statusCode=code; return this; }, json(p){ this._json=p; return this; } };
}

async function run() {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';
  const db = require('../api/_lib/db');
  db.supabase.auth = { getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }) };
  db.supabase.from = (table) => {
    if (table === 'profiles') {
      return { select(){return this;}, eq(){return this;}, maybeSingle: async () => ({ data: { business_id: 'biz-1' }, error: null }) };
    }
    if (table === 'businesses') {
      return { select(){return this;}, eq(){return this;}, single: async () => ({ data: { id: 'biz-1' }, error: null }) };
    }
    return { select(){return this;}, eq(){return this;}, single: async () => ({ data: null, error: null }) };
  };
  db.getBusiness = async () => ({ id: 'biz-1', name: 'BizName', from_number: null, surge_account_id: null });
  db.updateBusiness = async () => ({ id: 'biz-1', from_number: '+18885551234' });

  const surgeClient = require('../api/_lib/surgeClient');
  surgeClient.createAccountForBusiness = async () => ({ accountId: 'acc-1' });
  surgeClient.purchaseTollFreeNumber = async ({ accountId }) => ({ phoneId: 'p-1', e164: '+18885551234' });
  surgeClient.submitTfnVerification = async ({ accountId, payload }) => ({ verificationId: 'v-1', status: 'pending' });

  const handler = require('../api/surge/provision-number');

  // Missing required fields
  let req = { method: 'POST', headers: {}, body: { businessId: 'biz-1', businessInfo: { legal_name: 'Blipp', contact_email: 'x@example.com' } } };
  let res = createMockRes();
  await handler(req, res);
  console.log('Provision missing required fields ->', res.statusCode, res._json);

  // Happy path
  req = { method: 'POST', headers: { authorization: 'Bearer test-token' }, body: { businessId: 'biz-1', businessInfo: { legal_name: 'Blipp', brand_name: 'Blipp Brand', website: 'https://myblipp.com', address: { street_line1: '123 Main St', street_line2: 'Suite 100', city: 'New York', state: 'NY', postal_code: '10001', country: 'US' }, ein: '123456789', sole_prop: false, contact_name: 'Alex', contact_email: 'x@example.com', contact_phone_e164: '+14155550123', opt_in_method: 'website', opt_in_evidence_url: 'https://myblipp.com/opt-in', terms_url: 'https://myblipp.com/terms', privacy_url: 'https://myblipp.com/privacy', estimated_monthly_volume: 1000, time_zone_iana: 'America/New_York' } } };
  res = createMockRes();
  await handler(req, res);
  console.log('Provision happy path ->', res.statusCode, res._json);
}

run().catch((e) => { console.error(e); process.exit(1); });


