/* API quản trị người dùng — nền cho trang quản trị sau này.
   Quyền: header "Authorization: Bearer <ADMIN_KEY>" (công cụ / CMS gọi từ máy chủ)
          HOẶC đang đăng nhập bằng tài khoản có role = 'admin' (trang quản trị trên trình duyệt).
   GET    /api/admin/users?q=&page=1     -> { users, total, page, page_size }
   GET    /api/admin/users/<id>          -> { user }
   PATCH  /api/admin/users/<id>          { name?, phone?, note?, role?, locked? }
   POST   /api/admin/users/<id>/logout   -> đăng xuất người đó khỏi mọi thiết bị
   DELETE /api/admin/users/<id> */
import { json, HttpError, readBody, safeEqual } from "./http.js";
import { currentUser, normName, normPhone, nowIso } from "./auth.js";

const PAGE_SIZE = 50;
const COLS = "id, email, name, phone, avatar_url, role, locked, note, created_at, updated_at, last_login_at, " +
  "email_verified_at, (pass_hash IS NOT NULL) AS has_password, (google_sub IS NOT NULL) AS google_linked";

export async function requireAdmin(request, env) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token) {
    if (env.ADMIN_KEY && safeEqual(token, env.ADMIN_KEY)) return { id: 0, email: "admin-key" };
    throw new HttpError(401, "Không có quyền");
  }
  const u = await currentUser(request, env);
  if (!u || u.role !== "admin") throw new HttpError(u ? 403 : 401, "Không có quyền");
  return u;
}

export async function handleAdmin(request, env, parts) {
  const admin = await requireAdmin(request, env);
  const method = request.method;
  if (parts[1] !== "users") return null;

  if (parts.length === 2 && method === "GET") {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim().toLowerCase().slice(0, 100);
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    const where = q ? "WHERE lower(email) LIKE ?1 ESCAPE '\\' OR lower(name) LIKE ?1 ESCAPE '\\' OR phone LIKE ?1 ESCAPE '\\'" : "";
    const binds = q ? [like] : [];
    const total = await env.DB.prepare(`SELECT count(*) AS n FROM users ${where}`).bind(...binds).first("n");
    const { results } = await env.DB.prepare(`SELECT ${COLS} FROM users ${where} ORDER BY id DESC LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`)
      .bind(...binds).all();
    return json({ users: results, total, page, page_size: PAGE_SIZE });
  }

  const id = Number(parts[2]);
  if (!Number.isInteger(id) || id <= 0) return null;
  const exists = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(id).first();
  if (!exists) throw new HttpError(404, "Không tìm thấy người dùng");

  if (parts.length === 3 && method === "GET") {
    return json({ user: await env.DB.prepare(`SELECT ${COLS} FROM users WHERE id = ?`).bind(id).first() });
  }

  if (parts.length === 3 && method === "PATCH") {
    const b = await readBody(request);
    const sets = [], vals = [];
    if (b.name !== undefined) { sets.push("name = ?"); vals.push(normName(b.name)); }
    if (b.phone !== undefined) { sets.push("phone = ?"); vals.push(normPhone(b.phone)); }
    if (b.note !== undefined) { sets.push("note = ?"); vals.push(String(b.note).slice(0, 2000)); }
    if (b.role !== undefined) {
      if (!["user", "admin"].includes(b.role)) throw new HttpError(400, "role phải là user hoặc admin");
      if (admin.id === id && b.role !== "admin") throw new HttpError(400, "Không tự gỡ quyền admin của chính mình");
      sets.push("role = ?"); vals.push(b.role);
    }
    if (b.locked !== undefined) {
      if (admin.id === id && b.locked) throw new HttpError(400, "Không tự khoá chính mình");
      sets.push("locked = ?"); vals.push(b.locked ? 1 : 0);
    }
    if (!sets.length) throw new HttpError(400, "Không có gì để cập nhật");
    sets.push("updated_at = ?"); vals.push(nowIso());
    const stmts = [env.DB.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).bind(...vals, id)];
    if (b.locked) stmts.push(env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id));
    await env.DB.batch(stmts);
    return json({ user: await env.DB.prepare(`SELECT ${COLS} FROM users WHERE id = ?`).bind(id).first() });
  }

  if (parts.length === 4 && parts[3] === "logout" && method === "POST") {
    await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id).run();
    return json({ ok: true });
  }

  if (parts.length === 3 && method === "DELETE") {
    if (admin.id === id) throw new HttpError(400, "Không tự xoá chính mình");
    await env.DB.batch([
      env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id),
      env.DB.prepare("DELETE FROM favorites WHERE user_id = ?").bind(id),
      env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id),
    ]);
    return json({ ok: true });
  }

  return null;
}
