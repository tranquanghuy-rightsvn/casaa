/* Mật khẩu PBKDF2-SHA256 + salt riêng, session cookie HttpOnly lưu D1 (chỉ lưu SHA-256 của token),
   giới hạn tần suất. */
import { HttpError } from "./http.js";

const enc = new TextEncoder();
const PBKDF2_ITER = 100000; // trần của WebCrypto trên Workers
const SESSION_DAYS = 30;
export const COOKIE = "casa_session";

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export const b64url = (buf) => b64(buf).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export const nowIso = () => new Date().toISOString();

export function randomToken(bytes = 32) {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256(s) {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function pbkdf2(password, salt, iter) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, key, 256);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${PBKDF2_ITER}$${b64(salt)}$${b64(await pbkdf2(password, salt, PBKDF2_ITER))}`;
}

export async function verifyPassword(password, stored) {
  const [alg, iter, salt, hash] = String(stored || "").split("$");
  if (alg !== "pbkdf2") return false;
  const got = new Uint8Array(await pbkdf2(password, unb64(salt), Number(iter)));
  const want = unb64(hash);
  if (got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
  return diff === 0;
}

// ----- Kiểm tra dữ liệu nhập -----

export function checkPassword(pw) {
  if (typeof pw !== "string" || pw.length < 8) throw new HttpError(400, "Mật khẩu cần ít nhất 8 ký tự");
  if (pw.length > 200) throw new HttpError(400, "Mật khẩu quá dài");
}

export function normEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) || e.length > 200) throw new HttpError(400, "Email không hợp lệ");
  return e;
}

export function normName(name) {
  const n = String(name || "").trim().replace(/\s+/g, " ");
  if (n.length > 100) throw new HttpError(400, "Họ tên quá dài");
  return n;
}

export function normPhone(phone) {
  const p = String(phone || "").trim();
  if (p && !/^[0-9+().\s-]{6,20}$/.test(p)) throw new HttpError(400, "Số điện thoại không hợp lệ");
  return p;
}

/** Thông tin người dùng trả về cho trình duyệt (không lộ hash mật khẩu, google_sub). */
export function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    avatar_url: u.avatar_url,
    role: u.role,
    has_password: !!u.pass_hash,
    google_linked: !!u.google_sub,
    created_at: u.created_at,
  };
}

// ----- Session -----

export function readCookie(request, name) {
  const m = (request.headers.get("cookie") || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? m[1] : "";
}

export function sessionCookie(token, maxAgeSec) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSec}`;
}

/** Tạo phiên mới, cập nhật last_login_at, trả về chuỗi Set-Cookie. */
export async function createSession(env, userId) {
  const token = randomToken();
  const now = nowIso();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400 * 1000).toISOString();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
      .bind(await sha256(token), userId, now, expires),
    env.DB.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").bind(now, userId),
    // Dọn phiên hết hạn của người này
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND expires_at < ?").bind(userId, now),
  ]);
  return sessionCookie(token, SESSION_DAYS * 86400);
}

/** User đang đăng nhập (dòng users) hoặc null. Tài khoản bị khoá coi như chưa đăng nhập. */
export async function currentUser(request, env) {
  const token = readCookie(request, COOKIE);
  if (!token) return null;
  const row = await env.DB.prepare(
    "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.locked = 0"
  ).bind(await sha256(token), nowIso()).first();
  return row || null;
}

export async function destroySession(request, env) {
  const token = readCookie(request, COOKIE);
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
}

/** Đăng xuất mọi thiết bị khác (đổi mật khẩu, khoá tài khoản). Giữ phiên hiện tại nếu có. */
export async function destroyOtherSessions(env, userId, keepRequest) {
  const keep = keepRequest ? readCookie(keepRequest, COOKIE) : "";
  if (keep) {
    await env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?").bind(userId, await sha256(keep)).run();
  } else {
    await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId).run();
  }
}

// ----- Giới hạn tần suất (D1) -----

/** Đếm 1 lần cho key; vượt `limit` trong `windowSec` -> throw 429. */
export async function rateLimit(env, key, limit, windowSec, msg) {
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare("SELECT count, reset_at FROM rate_limits WHERE key = ?").bind(key).first();
  if (!row || row.reset_at <= now) {
    await env.DB.prepare(
      "INSERT INTO rate_limits (key, count, reset_at) VALUES (?1, 1, ?2) ON CONFLICT(key) DO UPDATE SET count = 1, reset_at = ?2"
    ).bind(key, now + windowSec).run();
    return;
  }
  if (row.count >= limit) {
    const mins = Math.max(1, Math.ceil((row.reset_at - now) / 60));
    throw new HttpError(429, (msg || "Thao tác quá nhiều lần") + `. Thử lại sau ${mins} phút.`);
  }
  await env.DB.prepare("UPDATE rate_limits SET count = count + 1 WHERE key = ?").bind(key).run();
}

export async function clearLimit(env, key) {
  await env.DB.prepare("DELETE FROM rate_limits WHERE key = ?").bind(key).run();
}
