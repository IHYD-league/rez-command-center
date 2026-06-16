// Barcode decode helper — runs on the captured still image inside the
// existing scan flow (NOT a live camera loop). Cross-platform via the
// @zxing/browser JS library, which decodes UPC-A / EAN-13 (and the
// other 1D / 2D formats ZXing supports as a freebie) from a single
// image on every mobile browser, including iOS Safari where the
// native BarcodeDetector API is unsupported.
//
// Used by the ShoppingList "📷 Scan a product" flow. The handler
// runs decodeBarcode(file) FIRST; on a hit, the UPC is looked up via
// the /api/lookup-upc Netlify function (Open Food Facts) and a clean
// {title, brand} pair lands directly in the scan preview. On
// no-decode or OFF miss, the handler falls through silently to the
// existing /api/vision-parse photo path.
//
// Object-URL lifecycle: every createObjectURL is paired with a
// revoke in a finally block so a long scan session never leaks blob
// URLs.

import { BrowserMultiFormatReader } from "@zxing/browser";

// Lazy module-level singleton. The reader is allocation-light but
// instantiating per call wastes a few ms; one instance for the life
// of the tab is fine.
let reader = null;
function getReader() {
  if (!reader) reader = new BrowserMultiFormatReader();
  return reader;
}

// decodeBarcode(file): File -> Promise<string | null>
//
// Returns the decoded text (typically a UPC-A / EAN-13 digit string)
// on success, or null if no barcode was found in the image OR the
// decode threw for any reason. Callers treat null as "fall through
// to the vision-parse photo path."
export async function decodeBarcode(file) {
  if (!file) return null;
  const url = URL.createObjectURL(file);
  try {
    const result = await getReader().decodeFromImageUrl(url);
    const text = result?.getText?.();
    return text && text.trim() ? text.trim() : null;
  } catch (_err) {
    // ZXing throws NotFoundException when the image contains no
    // decodable barcode. Other thrown errors (image load failures,
    // decoder edge cases) all funnel to the same null = silent
    // fallthrough so the user never sees a barcode-specific error
    // toast — the vision path still runs and may succeed on the
    // product label.
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
