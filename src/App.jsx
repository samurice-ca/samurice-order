import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, User, AlertCircle } from "lucide-react";

/**
 * ✅ ここはあなたの値のまま
 */
const LIFF_ID = "2008786844-ebqsTmW8";

/**
 * ✅ API（Vercel Functions /api/order）へPOSTする前提
 * もし直接Makeに投げたいなら、fetch先をMAKE_WEBHOOK_URLに戻してOK
 */
const API_ENDPOINT = "/api/order";

/**
 * ✅ ブランドカラー（#E6C0000 は桁が多いので #E6C000 として採用）
 */
const BRAND = "#E6C000";

/**
 * ✅ 画像（Viteなら public/ 配下に置けば /logo.png で参照できる）
 * - public/logo.png
 * - public/products/kinmemai-white-5kg.jpg
 */
const LOGO_SRC = "/logo.png";
const PRODUCT_IMG = "/products/kinmemai-white-5kg.jpg";

/**
 * ✅ 商品定義（SKUは裏だけ。画面には出さない）
 * MOQ=5、数量はプルダウン
 */
const PRODUCTS = [
  {
    sku: "ID21",
    name: "Kinmemai White 5kg",
    image: PRODUCT_IMG,
    moq: 5,
    // プルダウン候補（必要なら増やしてOK）
    qtyOptions: [5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50],
  },
];

export default function App() {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const [user, setUser] = useState(null);
  const [storeCode, setStoreCode] = useState("default");

  // cart: { [sku]: qty }  qtyは数値（0なら未選択）
  const [cart, setCart] = useState({});
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        if (!LIFF_ID) throw new Error("LIFF_ID が未設定です。");

        // store_code をURLから取得（例: ?store_code=kingyo_van）
        const params = new URLSearchParams(window.location.search);
        setStoreCode(params.get("store_code") || params.get("store_id") || "default");

        if (!window.liff) throw new Error("LIFF SDK が読み込まれていません。index.html を確認してください。");

        await window.liff.init({ liffId: LIFF_ID });

        if (!window.liff.isLoggedIn()) {
          if (!window.liff.isInClient()) window.liff.login();
        } else {
          const profile = await window.liff.getProfile();
          setUser(profile);
        }
      } catch (err) {
        console.error(err);
        setError(err.message || String(err));
        // テスト用ダミー
        const params = new URLSearchParams(window.location.search);
        setStoreCode(params.get("store_code") || params.get("store_id") || "default");
        setUser({ displayName: "テストユーザー", userId: "TEST_ID" });
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const totalQty = useMemo(() => {
    return Object.values(cart).reduce((sum, v) => sum + (Number(v) || 0), 0);
  }, [cart]);

  const setQty = (sku, qty) => {
    const q = Number(qty) || 0;
    setCart((prev) => {
      const next = { ...prev };
      if (!q) delete next[sku];
      else next[sku] = q;
      return next;
    });
  };

  const sendOrder = async () => {
    if (totalQty === 0) return;

    setSending(true);
    setError(null);

    try {
      const items = Object.entries(cart).map(([sku, qty]) => ({ sku, qty: Number(qty) || 0 }));

      // MOQチェック（商品ごと）
      for (const p of PRODUCTS) {
        const chosen = items.find((x) => x.sku === p.sku);
        if (chosen && chosen.qty > 0 && chosen.qty < p.moq) {
          throw new Error(`${p.name} は最小 ${p.moq} 個からです。`);
        }
      }

      const payload = {
        source: "liff",
        order_id: `liff-${Date.now()}`, // 重複防止用（Make側で活用可）
        store_code: storeCode,
        line_user_id: user?.userId || null,
        line_user_name: user?.displayName || null,
        items,
      };

      const res = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Vercel /api/order でキー検証している場合のみ必要
          "X-ORDER-KEY": import.meta.env.VITE_ORDER_KEY || "",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`送信失敗: ${res.status} ${text}`);
      }

      setComplete(true);

      if (window.liff?.isInClient()) {
        setTimeout(() => window.liff.closeWindow(), 2500);
      }
    } catch (e) {
      console.error(e);
      setError(e.message || String(e));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <Loader2 className="animate-spin text-slate-400 mb-2" size={32} />
        <p className="text-slate-400 text-xs">読み込み中...</p>
      </div>
    );
  }

  if (complete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-10 text-center bg-white">
        <CheckCircle2 className="mb-4" size={64} style={{ color: BRAND }} />
        <h2 className="text-xl font-bold">注文完了</h2>
        <p className="text-slate-500 mt-2 text-sm">送信しました。</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-28">
      {error && (
        <div className="bg-red-500 text-white p-3 flex items-center gap-2 text-xs font-bold">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white p-5 border-b flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img
            src={LOGO_SRC}
            alt="SAMURICE"
            className="h-10 w-auto"
            onError={(e) => {
              // ロゴがない時は文字にフォールバック
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="leading-tight">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Store: {storeCode}
            </p>
            <p className="text-xs text-slate-500 font-semibold">
              {user?.displayName ? `${user.displayName} 様` : "Guest"}
            </p>
          </div>
        </div>

        <div
          className="w-10 h-10 rounded-full flex items-center justify-center ring-2 ring-slate-50"
          style={{ backgroundColor: "#fff7cc", color: BRAND }}
          title={user?.displayName || "Guest"}
        >
          <User size={20} />
        </div>
      </header>

      {/* Main */}
      <main className="p-4 space-y-4">
        <div
          className="p-4 rounded-2xl shadow-sm border bg-white"
          style={{ borderColor: "#f3e7a1" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Order Items
          </p>
          <p className="text-xs text-slate-500 mt-1">
            ※ Kinmemai White 5kg は <b>5個から</b>注文できます
          </p>
        </div>

        {PRODUCTS.map((p) => {
          const currentQty = cart[p.sku] || 0;

          return (
            <div key={p.sku} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Image */}
              <div className="w-full h-44 bg-slate-100 overflow-hidden">
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // 画像がない場合の見た目崩れ防止
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-slate-900 text-base">{p.name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      MOQ: <b>{p.moq}</b>
                    </p>
                  </div>

                  {/* Qty Dropdown */}
                  <div className="min-w-[120px]">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Quantity
                    </label>
                    <select
                      value={currentQty || ""}
                      onChange={(e) => setQty(p.sku, e.target.value)}
                      className="w-full rounded-xl border px-3 py-2 text-sm font-bold bg-white"
                      style={{ borderColor: "#f3e7a1" }}
                    >
                      <option value="">Select</option>
                      {p.qtyOptions.map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {currentQty ? `Selected: ${currentQty}` : "Not selected"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 p-5 bg-white/90 backdrop-blur-md border-t border-slate-100">
        <div className="max-w-md mx-auto flex flex-col gap-3">
          <div className="flex justify-between items-end px-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Total Items
            </span>
            <span className="text-2xl font-black text-slate-900">{totalQty}</span>
          </div>

          <button
            onClick={sendOrder}
            disabled={totalQty === 0 || sending}
            className="w-full py-4 rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all disabled:bg-slate-200 disabled:text-slate-400"
            style={{
              backgroundColor: totalQty === 0 || sending ? "#e5e7eb" : BRAND,
              color: totalQty === 0 || sending ? "#94a3b8" : "#111827",
            }}
          >
            {sending ? "送信中..." : `注文を確定する (${totalQty})`}
          </button>
        </div>
      </footer>
    </div>
  );
}