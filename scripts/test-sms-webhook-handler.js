// Lightweight test for api/sms/webhook.js inbound STOP/HELP

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
  // Stub lookups
  db.getBusinessByFromNumber = async () => ({ id: 'biz-1', surge_account_id: 'acc-1', from_number: '+18885551234' });
  db.upsertContact = async () => ({ id: 'c-1' });
  db.upsertMessage = async () => ({ id: 'm-1' });
  db.setContactOptedOut = async () => ({ id: 'c-1', opted_out: true });

  // Stub signature verification to true
  const surgeClient = require('../api/_lib/surgeClient');
  surgeClient.verifySignature = () => true;
  surgeClient.sendMessage = async () => ({ messageId: 'auto-1', status: 'queued' });

  const handler = require('../api/sms/webhook');

  // STOP inbound
  let req = { method: 'POST', headers: { 'x-surge-signature': 't=1,v1=dummy' }, body: { type: 'inbound', data: { to: '+18885551234', from: '+14155550123', body: 'STOP', id: 's-1' } } };
  let res = createMockRes();
  await handler(req, res);
  console.log('Webhook STOP ->', res.statusCode, res._json);

  // HELP inbound
  req = { method: 'POST', headers: { 'x-surge-signature': 't=1,v1=dummy' }, body: { type: 'inbound', data: { to: '+18885551234', from: '+14155550123', body: 'HELP', id: 's-2' } } };
  res = createMockRes();
  await handler(req, res);
  console.log('Webhook HELP ->', res.statusCode, res._json);
}

run().catch((e) => { console.error(e); process.exit(1); });


