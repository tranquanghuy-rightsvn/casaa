/* Thư viện yêu thích của người đang đăng nhập:
   GET    /api/me/favorites            -> { items: [n, ...] } (theo thứ tự đã ghim)
   PUT    /api/me/favorites/<n>        -> ghim dự án n
   DELETE /api/me/favorites/<n>        -> bỏ ghim
   POST   /api/me/favorites/merge      { items: [n, ...] } -> gộp danh sách từ trình duyệt vào tài khoản
   n = vị trí dự án trong PROJECTS (html/assets/js/projects-data.js). */
import { json, HttpError, readBody } from "./http.js";
import { currentUser, nowIso } from "./auth.js";

const MAX_PROJECT = 9999; // chặn số rác; danh sách thật ~34 dự án
const MAX_ITEMS = 500;

const validIndex = (v) => Number.isInteger(v) && v >= 0 && v <= MAX_PROJECT;

async function list(env, userId) {
  const { results } = await env.DB.prepare(
    "SELECT project FROM favorites WHERE user_id = ? ORDER BY created_at, rowid"
  ).bind(userId).all();
  return results.map((r) => r.project);
}

async function count(env, userId) {
  return env.DB.prepare("SELECT count(*) AS n FROM favorites WHERE user_id = ?").bind(userId).first("n");
}

export async function handleFavorites(request, env, parts) {
  // parts: ["me", "favorites", <n|merge>?]
  const u = await currentUser(request, env);
  if (!u) throw new HttpError(401, "Vui lòng đăng nhập");
  const method = request.method;
  const arg = parts[2];

  if (arg === undefined && method === "GET") {
    return json({ items: await list(env, u.id) });
  }

  if (arg === "merge" && method === "POST") {
    const body = await readBody(request);
    const items = Array.isArray(body.items) ? [...new Set(body.items.filter(validIndex))].slice(0, MAX_ITEMS) : [];
    if (items.length) {
      const now = Date.now();
      // created_at tăng dần để giữ đúng thứ tự ghim trên trình duyệt (xếp sau các mục đã có)
      await env.DB.batch(items.map((n, i) => env.DB.prepare(
        "INSERT OR IGNORE INTO favorites (user_id, project, created_at) VALUES (?, ?, ?)"
      ).bind(u.id, n, new Date(now + i).toISOString())));
    }
    return json({ items: await list(env, u.id) });
  }

  const n = Number(arg);
  if (arg !== undefined && /^\d+$/.test(arg) && validIndex(n)) {
    if (method === "PUT") {
      if ((await count(env, u.id)) >= MAX_ITEMS) throw new HttpError(400, "Thư viện yêu thích đã đầy");
      await env.DB.prepare("INSERT OR IGNORE INTO favorites (user_id, project, created_at) VALUES (?, ?, ?)")
        .bind(u.id, n, nowIso()).run();
      return json({ ok: true });
    }
    if (method === "DELETE") {
      await env.DB.prepare("DELETE FROM favorites WHERE user_id = ? AND project = ?").bind(u.id, n).run();
      return json({ ok: true });
    }
  }

  return null;
}
