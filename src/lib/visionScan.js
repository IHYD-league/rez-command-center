// Client wrapper around the /api/vision-parse Netlify function.
// Compresses the captured image to ~1024px wide JPEG before sending
// so request bodies stay small + the model sees clean text.

const MAX_DIM = 1024;

async function fileToCompressedJpegBase64(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const ratio = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        URL.revokeObjectURL(url);
        // Strip the "data:image/jpeg;base64," prefix; the API wants the
        // raw base64 payload.
        const b64 = dataUrl.split(",")[1];
        resolve({ base64: b64, mediaType: "image/jpeg" });
      } catch (e) { reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Couldn't read the image.")); };
    img.src = url;
  });
}

export async function scanImage({ file, kind }) {
  if (!file) throw new Error("No image selected.");
  if (!kind) throw new Error("scanImage: missing kind.");
  const { base64, mediaType } = await fileToCompressedJpegBase64(file);
  const r = await fetch("/api/vision-parse", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind, imageBase64: base64, imageMediaType: mediaType }),
  });
  if (!r.ok) throw new Error(`vision-parse HTTP ${r.status}`);
  return r.json();
}
