export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.status(405).send(JSON.stringify({ ok: false, error: "Method not allowed" }));
    return;
  }

  const zapierToken = req.headers['x-zapier-token'] || req.headers['X-Zapier-Token'];
  if (!zapierToken || zapierToken !== process.env.ZAPIER_TOKEN) {
    res.setHeader('Content-Type', 'application/json');
    res.status(401).send(JSON.stringify({ ok: false, error: "unauthorized" }));
    return;
  }

  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify({ ok: true }));
}
