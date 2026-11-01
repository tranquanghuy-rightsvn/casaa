export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

export function redirect(location, headers = {}) {
  const h = new Headers({ location, "cache-control": "no-store" });
  for (const [k, v] of Object.entries(headers)) {
    for (const val of [].concat(v)) h.append(k, val);
  }
  return new Response(null, { status: 302, headers: h });
}

export async function readBody(request) {
  return (await request.json().catch(() => null)) || {};
}

// So sánh thời gian hằng để không lộ khóa qua thời gian phản hồi
export function safeEqual(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(a), y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/** Chặn request ghi dữ liệu từ trang web khác (CSRF): Origin phải trùng site. */
export function checkOrigin(request) {
  if (request.method === "GET" || request.method === "HEAD") return;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, "Yêu cầu không hợp lệ");
}
