function createMockRes(){ return { statusCode:200,_json:null,status(c){this.statusCode=c;return this;},json(p){this._json=p;return this;} }; }

async function run(){
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';
  const db = require('../api/_lib/db');
  db.getBusinessByFromNumber = async () => ({ id: 'biz-1', surge_account_id: 'acc-1', from_number: '+18885551234' });
  db.upsertContact = async () => ({ id: 'c-1' });
  db.upsertMessage = async () => ({ id: 'm-1' });
  db.setContactOptedOut = async () => ({ id: 'c-1', opted_out: true });

  const surgeClient = require('../api/_lib/surgeClient');
  surgeClient.verifySignature = () => true;
  surgeClient.sendMessage = async () => ({ messageId: 'auto-1', status: 'queued' });

  const handler = require('../api/sms/webhook');

  let req = { method: 'POST', headers: { 'x-surge-signature': 't=1,v1=dummy' }, body: { type: 'inbound', data: { to: '+18885551234', from: '+14155550123', body: 'STOP', id: 's-1' } } };
  let res = createMockRes();
  await handler(req, res);
  console.log('Webhook STOP ->', res.statusCode, res._json);

  req = { method: 'POST', headers: { 'x-surge-signature': 't=1,v1=dummy' }, body: { type: 'inbound', data: { to: '+18885551234', from: '+14155550123', body: 'HELP', id: 's-2' } } };
  res = createMockRes();
  await handler(req, res);
  console.log('Webhook HELP ->', res.statusCode, res._json);
}

run().catch((e)=>{ console.error(e); process.exit(1); });


