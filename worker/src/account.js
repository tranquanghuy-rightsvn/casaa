/* API tài khoản cho trình duyệt:
   POST /api/auth/register  { name, email, password }
   POST /api/auth/login     { email, password }
   POST /api/auth/logout
   GET  /api/auth/google, /api/auth/google/callback  (google.js)
   GET  /api/me             -> { user } (null nếu chưa đăng nhập)
   PATCH /api/me            { name, phone }
   POST /api/me/password    { current_password?, new_password } (tài khoản chỉ có Google: không cần mật khẩu cũ) */
import { json, HttpError, readBody } from "./http.js";
import {
  hashPassword, verifyPassword, checkPassword, normEmail, normName, normPhone, publicUser, nowIso,
  createSession, currentUser, destroySession, destroyOtherSessions, rateLimit, clearLimit, COOKIE,
} from "./auth.js";
import { googleStart, googleCallback } from "./google.js";

const ip = (request) => request.headers.get("cf-connecting-ip") || "?";

async function requireUser(request, env) {
  const u = await currentUser(request, env);
  if (!u) throw new HttpError(401, "Vui lòng đăng nhập");
  return u;
}

export async function handleAccount(request, env, parts) {
  const method = request.method;
  const [a, b, c] = parts;

  if (a === "auth" && b === "google" && method === "GET") {
    return c === "callback" ? googleCallback(request, env) : googleStart(request, env);
  }

  if (a === "auth" && b === "register" && method === "POST") {
    await rateLimit(env, `register:${ip(request)}`, 5, 3600, "Đăng ký quá nhiều lần");
    const body = await readBody(request);
    const email = normEmail(body.email);
    const name = normName(body.name);
    if (!name) throw new HttpError(400, "Vui lòng nhập họ tên");
    checkPassword(body.password);
    const exists = await env.DB.prepare("SELECT id, google_sub FROM users WHERE email = ?").bind(email).first();
    if (exists) {
      throw new HttpError(409, exists.google_sub
        ? "Email này đã đăng ký bằng Google — hãy bấm \"Đăng nhập bằng Google\""
        : "Email này đã có tài khoản — hãy đăng nhập");
    }
    const now = nowIso();
    const user = await env.DB.prepare(
      "INSERT INTO users (email, name, pass_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?) RETURNING *"
    ).bind(email, name, await hashPassword(body.password), now, now).first();
    const cookie = await createSession(env, user.id);
    return json({ user: publicUser(user) }, 201, { "set-cookie": cookie });
  }

  if (a === "auth" && b === "login" && method === "POST") {
    const body = await readBody(request);
    const email = normEmail(body.email);
    const key = `login:${email}:${ip(request)}`;
    await rateLimit(env, key, 10, 900, "Đăng nhập sai quá nhiều lần");
    const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
    if (user && !user.pass_hash && user.google_sub) {
      throw new HttpError(400, "Tài khoản này đăng nhập bằng Google — hãy bấm \"Đăng nhập bằng Google\"");
    }
    if (!user || !(await verifyPassword(String(body.password || ""), user.pass_hash))) {
      throw new HttpError(400, "Email hoặc mật khẩu không đúng");
    }
    if (user.locked) throw new HttpError(403, "Tài khoản đã bị khoá. Vui lòng liên hệ hotline 0763 161 286.");
    await clearLimit(env, key);
    const cookie = await createSession(env, user.id);
    return json({ user: publicUser(user) }, 200, { "set-cookie": cookie });
  }

  if (a === "auth" && b === "logout" && method === "POST") {
    await destroySession(request, env);
    return json({ ok: true }, 200, { "set-cookie": `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` });
  }

  if (a === "me" && !b && method === "GET") {
    const u = await currentUser(request, env);
    return json({ user: u ? publicUser(u) : null });
  }

  if (a === "me" && !b && method === "PATCH") {
    const u = await requireUser(request, env);
    const body = await readBody(request);
    const name = body.name === undefined ? u.name : normName(body.name);
    const phone = body.phone === undefined ? u.phone : normPhone(body.phone);
    if (!name) throw new HttpError(400, "Vui lòng nhập họ tên");
    const user = await env.DB.prepare("UPDATE users SET name = ?, phone = ?, updated_at = ? WHERE id = ? RETURNING *")
      .bind(name, phone, nowIso(), u.id).first();
    return json({ user: publicUser(user) });
  }

  if (a === "me" && b === "password" && method === "POST") {
    const u = await requireUser(request, env);
    await rateLimit(env, `pw:${u.id}`, 10, 900, "Đổi mật khẩu quá nhiều lần");
    const body = await readBody(request);
    if (u.pass_hash && !(await verifyPassword(String(body.current_password || ""), u.pass_hash))) {
      throw new HttpError(400, "Mật khẩu hiện tại không đúng");
    }
    checkPassword(body.new_password);
    await env.DB.prepare("UPDATE users SET pass_hash = ?, updated_at = ? WHERE id = ?")
      .bind(await hashPassword(body.new_password), nowIso(), u.id).run();
    await destroyOtherSessions(env, u.id, request);
    return json({ ok: true });
  }

  return null;
}
