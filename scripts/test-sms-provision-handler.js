// Lightweight test for api/surge/provision-number.js with stubbed dependencies

function createMockRes() {
  return {
    statusCode: 200,
    _json: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this._json = payload; return this; }
  };
}

async function run() {
  const db = require('../api/_lib/db');
  db.supabase.auth = {
    getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null })
  };
  db.supabase.from = (table) => {
    if (table === 'profiles') {
      return {
        select() { return this; },
        eq() { return this; },
        maybeSingle: async () => ({ data: { business_id: 'biz-1' }, error: null })
      };
    }
    if (table === 'businesses') {
      return {
        select() { return this; },
        eq() { return this; },
        single: async () => ({ data: { id: 'biz-1' }, error: null })
      };
    }
    return { select() { return this; }, eq() { return this; }, single: async () => ({ data: null, error: null }) };
  };

  db.getBusiness = async () => ({ id: 'biz-1', from_number: null });
  db.updateBusiness = async () => ({ id: 'biz-1', from_number: '+18885551234' });

  const surgeClient = require('../api/_lib/surgeClient');
  surgeClient.createOrGetAccountForBusiness = async () => ({ accountId: 'acc-1' });
  surgeClient.purchaseTollFreeNumber = async () => ({ phoneId: 'p-1', e164: '+18885551234' });
  surgeClient.submitTfnVerification = async () => ({ verificationId: 'v-1', status: 'pending' });

  const handler = require('../api/surge/provision-number');

  // Missing auth
  let req = { method: 'POST', headers: {}, body: { businessId: 'biz-1', businessInfo: { legal_name: 'Blipp', contact_email: 'x@example.com' } } };
  let res = createMockRes();
  await handler(req, res);
  console.log('Provision without auth ->', res.statusCode, res._json);

  // Happy path
  req = { method: 'POST', headers: { authorization: 'Bearer test' }, body: { businessId: 'biz-1', businessInfo: { legal_name: 'Blipp', contact_email: 'x@example.com' } } };
  res = createMockRes();
  await handler(req, res);
  console.log('Provision happy path ->', res.statusCode, res._json);
}

run().catch((e) => { console.error(e); process.exit(1); });


