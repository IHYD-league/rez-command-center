// Keyless UPC lookup proxy — pipes a barcode through Open Food Facts
// and returns a clean {title, brand} pair the ShoppingList scan
// preview can consume directly.
//
// Why a serverless function instead of a direct client call: server-
// side we control the User-Agent header (OFF etiquette for non-
// trivial use), the timeout, and the response shape — so swapping
// providers later (UPCitemdb paid tier, etc.) doesn't require a
// client release. Lightweight: one outbound fetch per call.
//
// Statuses returned to the client (HTTP 200 in all but the input-
// shape cases — the client only acts on "ok" and treats everything
// else as a silent miss / fallthrough to vision-parse):
//   "ok"           — title + brand resolved, return in the payload
//   "not_found"    — OFF doesn't have it (likely US private-label)
//   "timeout"      — OFF didn't respond inside 2s
//   "error"        — OFF returned non-2xx or threw
//   "invalid_upc"  — UPC missing or not 8-14 digits (HTTP 400)
//   "invalid_json" — request body wasn't JSON (HTTP 400)
//   "method_not_allowed" — non-POST (HTTP 405)

const OFF_BASE = "https://world.openfoodfacts.org/api/v2/product";
const USER_AGENT = "MyFamilyHQ/1.0 (https://myfamilyhqapp.com)";
const TIMEOUT_MS = 2000;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ status: "method_not_allowed" }, 405);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ status: "invalid_json" }, 400);
  }

  const upc = String(body?.upc || "").trim();
  if (!upc || !/^\d{8,14}$/.test(upc)) {
    return jsonResponse({ status: "invalid_upc" }, 400);
  }

  // Trim the OFF response to the three fields we actually read. Cuts
  // payload from ~30KB to ~500 bytes per call.
  const url = `${OFF_BASE}/${encodeURIComponent(upc)}.json?fields=product_name,product_name_en,brands`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": USER_AGENT,
        "accept": "application/json",
      },
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return jsonResponse({ status: "error", off_http: res.status });
    }

    const data = await res.json().catch(() => ({}));

    // OFF returns status:1 on hit, status:0 on miss. A status:1 with
    // no usable product_name is a partial record — treat as miss so
    // the client falls through to vision rather than landing an
    // empty title in the preview.
    if (data?.status !== 1 || !data.product) {
      return jsonResponse({ status: "not_found" });
    }

    const title =
      data.product.product_name_en ||
      data.product.product_name ||
      null;
    if (!title || !title.trim()) {
      return jsonResponse({ status: "not_found" });
    }

    // brands is sometimes a comma-separated list; take the first.
    const brandsRaw = String(data.product.brands || "");
    const brand = brandsRaw.split(",")[0].trim() || null;

    return jsonResponse({
      status: "ok",
      title: title.trim(),
      brand,
      upc,
    });
  } catch (e) {
    clearTimeout(timer);
    if (e?.name === "AbortError") {
      return jsonResponse({ status: "timeout" });
    }
    return jsonResponse({ status: "error", detail: String(e?.message || e) });
  }
};
