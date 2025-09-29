/*
  Dev helper: seed minimal QBO integration+customer, simulate invoice, list review requests
  Usage: ensure server is running on http://localhost:3001 then:
    node scripts/seed-and-simulate-qbo.js
*/

async function main() {
  try {
    const base = 'http://localhost:3001';

    const seed = await fetch(`${base}/api/qbo/test-seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    }).then(r => r.json());

    if (!seed || !seed.success) {
      console.log(JSON.stringify({ error: 'seed_failed', seed }, null, 2));
      process.exit(1);
    }

    const biz = seed.business_id;
    const realm = seed.realm_id;

    const payload = {
      business_id: biz,
      realm_id: realm,
      description: 'Lawn mowing and grass mowed service',
      trigger: 'invoice_sent',
      amount: 200
    };

    const simulate = await fetch(`${base}/api/qbo/test-simulate-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    const list = await fetch(`${base}/api/qbo/test-review-requests?business_id=${biz}`).then(r => r.json());

    console.log(JSON.stringify({ seed, simulate, list }, null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();


