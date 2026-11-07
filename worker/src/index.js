/* Worker "casaa": chạy trước mọi request (run_worker_first trong wrangler.jsonc);
   /api/* do code này xử lý, còn lại chuyển cho env.ASSETS (trang tĩnh trong html/). */
import { json, HttpError, checkOrigin } from "./http.js";
import { handleAccount } from "./account.js";
import { handleAdmin } from "./admin.js";
import { handleFavorites } from "./favorites.js";
import { EN_ROUTES } from "../../html/assets/js/routes.js";

// URL tiếng Anh đời đầu dùng slug tiếng Việt (/en/dich-vu/) -> 301 sang slug tiếng Anh (/en/services/)
const OLD_EN = Object.fromEntries(
  Object.entries(EN_ROUTES).filter(([vi]) => vi !== "/").map(([vi, en]) => ["/en" + vi, en])
);

const CANONICAL_HOST = "3d-printedfacade.com";

async function route(request, env) {
  const url = new URL(request.url);
  const parts = url.pathname.replace(/\/+$/, "").split("/").slice(2); // bỏ "", "api"
  checkOrigin(request);

  if (parts[0] === "health" && request.method === "GET") return json({ ok: true });

  if (parts[0] === "me" && parts[1] === "favorites") {
    const res = await handleFavorites(request, env, parts);
    if (res) return res;
  }

  if (parts[0] === "auth" || parts[0] === "me") {
    const res = await handleAccount(request, env, parts);
    if (res) return res;
  }

  if (parts[0] === "admin") {
    const res = await handleAdmin(request, env, parts);
    if (res) return res;
  }

  throw new HttpError(404, "Không tìm thấy");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Canonical là domain gốc, không www
    if (url.hostname === "www." + CANONICAL_HOST) {
      url.hostname = CANONICAL_HOST;
      return Response.redirect(url.toString(), 301);
    }
    const oldEn = OLD_EN[url.pathname.endsWith("/") ? url.pathname : url.pathname + "/"];
    if (oldEn) {
      url.pathname = oldEn;
      return Response.redirect(url.toString(), 301);
    }
    if (!url.pathname.startsWith("/api/")) {
      const res = await env.ASSETS.fetch(request);
      // Bản *.workers.dev là bản trùng: không cho công cụ tìm kiếm index
      if (url.hostname.endsWith(".workers.dev")) {
        const out = new Response(res.body, res);
        out.headers.set("x-robots-tag", "noindex");
        return out;
      }
      return res;
    }
    try {
      return await route(request, env);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status);
      console.error(err);
      return json({ error: "Lỗi máy chủ" }, 500);
    }
  },
};
