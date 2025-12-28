import React, { useState, useEffect } from "react";
import { Package, CheckCircle2, Loader2, User, AlertCircle } from "lucide-react";

/**
 * 【重要】ここをあなたの ID に書き換えてください
 */
const LIFF_ID = "2008786844-ebqsTmW8";

// 表示用（Odoo側の default_code と合わせる）
const PRODUCTS = [
  {
    sku: "ID21",
    name: "Kinmemai White 5kg",
  },
];

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [storeId, setStoreId] = useState("unspecified");

  // cart: { [sku]: qty }
  const [cart, setCart] = useState({});
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        if (!LIFF_ID || LIFF_ID === "YOUR_LIFF_ID") {
          throw new Error(
            "LIFF_ID が設定されていません。LINE Developers の LIFF ID を App.jsx に貼り付けてください。"
          );
        }

        // store_id は LIFF でも Web でも取れるように先に読む
        const params = new URLSearchParams(window.location.search);
        setStoreId(params.get("store_id") || "default");

        if (window.liff) {
          await window.liff.init({ liffId: LIFF_ID });

          if (!window.liff.isLoggedIn()) {
            // LINEアプリ外（PCブラウザ等）で見ている場合はログインへ
            if (!window.liff.isInClient()) {
              window.liff.login();
              return; // login() で遷移するのでここで止める
            }
          } else {
            const profile = await window.liff.getProfile();
            setUser(profile);
          }
        } else {
          throw new Error(
            "LIFF SDK (sdk.js) が読み込まれていません。index.html を確認してください。"
          );
        }
      } catch (err) {
        setError(err?.message || String(err));
        // テスト用ダミー
        setUser({ displayName: "テストユーザー", userId: "TEST_ID" });
        const params = new URLSearchParams(window.location.search);
        setStoreId(params.get("store_id") || "default");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const totalQty = Object.values(cart).reduce((a, b) => a + b, 0);

  const setQty = (sku, nextQty) => {
    setCart((prev) => {
      const n = { ...prev };
      const q = Math.max(0, Number(nextQty) || 0);
      if (q === 0) delete n[sku];
      else n[sku] = q;
      return n;
    });
  };

  const sendOrder = async () => {
    if (totalQty === 0) return;
    setLoading(true);

    try {
      const payload = {
        source: "liff",
        order_id: `liff-${Date.now()}`, // 二重作成防止に使える
        store_code: storeId, // 店舗識別（QRで渡す想定）
        line_user_id: user?.userId || null,
        line_user_name: user?.displayName || null,
        items: Object.entries(cart).map(([sku, qty]) => ({
          sku,
          qty,
        })),
        debug: {
          host: window.location.host,
          key_prefix: (import.meta.env.VITE_ORDER_KEY || "").slice(0, 4),
        },
      };

      const res = await fetch("/api/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Vercelのフロント環境変数（VITE_）から読む
          "X-ORDER-KEY": import.meta.env.VITE_ORDER_KEY || "",
        },
        body: JSON.stringify(payload),
      });

      // ★失敗時は必ず本文を表示（unauthorized / make_status が見える）
      const text = await res.text().catch(() => "");
      if (!res.ok) {
        throw new Error(`Webhook error: ${res.status}\n${text}`);
      }

      setComplete(true);

      if (window.liff?.isInClient()) {
        setTimeout(() => window.liff.closeWindow(), 3000);
      }
    } catch (e) {
      alert("送信失敗: " + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <Loader2 className="animate-spin text-slate-400 mb-2" size={32} />
        <p className="text-slate-400 text-xs">読み込み中...</p>
      </div>
    );

  if (complete)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-10 text-center bg-white">
        <CheckCircle2 className="text-green-500 mb-4" size={64} />
        <h2 className="text-xl font-bold">注文完了</h2>
        <p className="text-slate-500 mt-2 text-sm">
          Make に送信しました（Odoo登録はMake側で実行）。
        </p>
      </div>
    );

  // デバッグ表示（後で消してOK）
  const host = window.location.host;
  const keyPrefix = (import.meta.env.VITE_ORDER_KEY || "").slice(0, 4);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-32">
      {/* デバッグ：LINEがどのHostを見ているか / キーが空か */}
      <div className="px-4 pt-3">
        <div className="text-[10px] text-slate-500">
          Host: <span className="font-bold">{host}</span>
        </div>
        <div className="text-[10px] text-slate-500">
          Key prefix:{" "}
          <span className="font-bold">{keyPrefix || "(empty)"}</span>
        </div>
        <div className="text-[10px] text-slate-500">
          Store: <span className="font-bold">{storeId}</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-500 text-white p-3 flex items-center gap-2 text-xs font-bold italic mt-2 mx-4 rounded-lg">
          <AlertCircle size={14} />
          <span>ERROR: {error}</span>
        </div>
      )}

      <header className="bg-white p-6 border-b flex justify-between items-end mt-3">
        <div>
          <h1 className="font-black text-2xl tracking-tighter text-slate-900 italic leading-none">
            SAMURICE
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">
            Store: {storeId}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 ring-2 ring-slate-50">
          <User size={20} />
        </div>
      </header>

      <main className="p-4 space-y-4">
        <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">
            Authenticated Customer
          </p>
          <h2 className="text-xl font-bold">{user?.displayName || "Guest"} 様</h2>
          <User className="absolute -right-4 -bottom-4 text-white/5" size={100} />
        </div>

        <div className="space-y-3">
          {PRODUCTS.map((p) => (
            <div
              key={p.sku}
              className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300">
                  <Package size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold">
                    SKU: {p.sku}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-xl border">
                <button
                  onClick={() => setQty(p.sku, (cart[p.sku] || 0) - 1)}
                  className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400"
                >
                  -
                </button>

                <span className="w-6 text-center font-bold text-slate-700">
                  {cart[p.sku] || 0}
                </span>

                <button
                  onClick={() => setQty(p.sku, (cart[p.sku] || 0) + 1)}
                  className="w-8 h-8 rounded-lg bg-slate-900 text-white shadow-md flex items-center justify-center font-bold"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-slate-100">
        <div className="max-w-md mx-auto flex flex-col gap-4">
          <div className="flex justify-between items-end px-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Total Items
            </span>
            <span className="text-2xl font-black text-slate-900">{totalQty}</span>
          </div>

          <button
            onClick={sendOrder}
            disabled={totalQty === 0}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-slate-200 active:scale-95 transition-all disabled:bg-slate-200"
          >
            注文を確定する ({totalQty})
          </button>
        </div>
      </footer>
    </div>
  );
}