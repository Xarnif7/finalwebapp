/*
  Dev helper: simulate a QBO invoice event and list resulting review requests
  Usage: ensure server is running on http://localhost:3001 then:
    node scripts/simulate-qbo.js
*/

async function main() {
  try {
    const base = 'http://localhost:3001';
    const db = await fetch(`${base}/api/test-db`).then(r => r.json());
    if (!db.integrations || !db.integrations.length) {
      console.log(JSON.stringify({ error: 'no_integrations' }));
      process.exit(1);
    }
    const biz = db.integrations[0].business_id;
    const realm = db.integrations[0].realm_id;

    const payload = {
      business_id: biz,
      realm_id: realm,
      description: 'Lawn mowing and grass mowed service',
      trigger: 'invoice_sent',
      amount: 200
    };

    const sim = await fetch(`${base}/api/qbo/test-simulate-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    const list = await fetch(`${base}/api/qbo/test-review-requests?business_id=${biz}`).then(r => r.json());

    console.log(JSON.stringify({ simulate: sim, list }, null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();


