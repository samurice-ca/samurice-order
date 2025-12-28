export default async function handler(req, res) {
  // CORS: ブラウザから /api/order を叩けるようにする
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-ORDER-KEY");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    // 簡易認証（任意だが強くおすすめ）
    //const key = req.headers["x-order-key"];
    //if (!key || key !== process.env.ORDER_KEY) {
    //  return res.status(401).json({ ok: false, error: "Unauthorized" });
    //}

    const makeUrl = process.env.MAKE_WEBHOOK_URL;
    if (!makeUrl) {
      return res.status(500).json({ ok: false, error: "MAKE_WEBHOOK_URL missing" });
    }

    const r = await fetch(makeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const text = await r.text().catch(() => "");
return res.status(r.ok ? 200 : 502).send(
  JSON.stringify({ ok: r.ok, make_status: r.status, make_body: text }, null, 2)
);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}