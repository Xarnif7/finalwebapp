// Lightweight test for api/sms/send.js with stubbed dependencies

const path = require('path');

function createMockRes() {
  return {
    statusCode: 200,
    _json: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this._json = payload;
      return this;
    }
  };
}

async function run() {
  // Stub db exports
  const db = require('../api/_lib/db');
  // Stub supabase auth and profiles
  db.supabase.auth = {
    getUser: async (token) => ({ data: { user: { id: 'user-1' } }, error: null })
  };
  db.supabase.from = (table) => {
    if (table === 'profiles') {
      return {
        select() { return this; },
        eq() { return this; },
        maybeSingle: async () => ({ data: { business_id: 'biz-1' }, error: null })
      };
    }
    return {
      select() { return this; },
      eq() { return this; },
      single: async () => ({ data: null, error: null })
    };
  };

  // Stub higher-level helpers used by handler
  db.getBusiness = async (businessId) => ({
    id: businessId,
    from_number: '+18885551234',
    verification_status: 'active',
    surge_account_id: 'acc-1'
  });
  db.getContact = async () => null;
  db.insertMessage = async () => ({ id: 'msg-local' });

  // Stub Surge client
  const surgeClient = require('../api/_lib/surgeClient');
  surgeClient.sendMessage = async () => ({ messageId: 'surge-123', status: 'queued' });

  const handler = require('../api/sms/send');

  // 1) Missing auth header
  let req = { method: 'POST', headers: {}, body: { businessId: 'biz-1', to: '+14155550123', body: 'Hello' } };
  let res = createMockRes();
  await handler(req, res);
  console.log('Send without auth ->', res.statusCode, res._json);

  // 2) With auth, ownership mismatch
  db.supabase.from = (table) => {
    if (table === 'profiles') {
      return {
        select() { return this; },
        eq() { return this; },
        maybeSingle: async () => ({ data: { business_id: 'biz-OTHER' }, error: null })
      };
    }
    return {
      select() { return this; },
      eq() { return this; },
      single: async () => ({ data: null, error: null })
    };
  };
  req = { method: 'POST', headers: { authorization: 'Bearer test' }, body: { businessId: 'biz-1', to: '+14155550123', body: 'Hello' } };
  res = createMockRes();
  await handler(req, res);
  console.log('Send with ownership mismatch ->', res.statusCode, res._json);

  // 3) With auth, ownership ok, happy path
  db.supabase.from = (table) => {
    if (table === 'profiles') {
      return {
        select() { return this; },
        eq() { return this; },
        maybeSingle: async () => ({ data: { business_id: 'biz-1' }, error: null })
      };
    }
    return {
      select() { return this; },
      eq() { return this; },
      single: async () => ({ data: null, error: null })
    };
  };
  req = { method: 'POST', headers: { authorization: 'Bearer test' }, body: { businessId: 'biz-1', to: '+14155550123', body: 'Hello' } };
  res = createMockRes();
  await handler(req, res);
  console.log('Send happy path ->', res.statusCode, res._json);
}

run().catch((e) => { console.error(e); process.exit(1); });


