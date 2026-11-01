/* Đăng nhập bằng Google (OAuth 2.0 Authorization Code + PKCE).
   GET /api/auth/google?next=/tai-khoan/   -> chuyển sang trang đăng nhập Google
   GET /api/auth/google/callback           -> Google trả về, tạo / liên kết tài khoản, đặt cookie phiên
   Cần: vars.GOOGLE_CLIENT_ID + secret GOOGLE_CLIENT_SECRET. Redirect URI đăng ký trong Google Cloud:
   <origin>/api/auth/google/callback (mỗi domain chạy site cần 1 dòng). */
import { redirect } from "./http.js";
import { randomToken, b64url, createSession, nowIso, readCookie, rateLimit } from "./auth.js";

const STATE_COOKIE = "casa_oauth";
const STATE_PATH = "/api/auth/google";
const ACCOUNT_PAGE = "/tai-khoan/";

const callbackUrl = (request) => new URL(request.url).origin + "/api/auth/google/callback";

/** Chỉ cho quay về đường dẫn nội bộ (chống open redirect). */
function safeNext(next) {
  const n = String(next || "");
  return n.startsWith("/") && !n.startsWith("//") && !n.includes("\\") && n.length < 300 ? n : ACCOUNT_PAGE;
}

const errorBack = (code, clearCookie = true) =>
  redirect(`${ACCOUNT_PAGE}?error=${code}`, clearCookie ? { "set-cookie": clearStateCookie() } : {});

const clearStateCookie = () => `${STATE_COOKIE}=; Path=${STATE_PATH}; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

export async function googleStart(request, env) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return errorBack("google_unconfigured", false);
  const url = new URL(request.url);
  const state = randomToken(16);
  const verifier = randomToken(32);
  const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  const next = encodeURIComponent(safeNext(url.searchParams.get("next")));

  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: callbackUrl(request),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();

  // state + PKCE verifier + trang quay về giữ trong cookie ngắn hạn, chỉ gửi kèm tới /api/auth/google*
  const cookie = `${STATE_COOKIE}=${state}.${verifier}.${next}; Path=${STATE_PATH}; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
  return redirect(auth.toString(), { "set-cookie": cookie });
}

/** Giải mã phần payload của id_token. Token nhận TRỰC TIẾP từ Google qua HTTPS (không qua trình duyệt)
    nên không cần kiểm chữ ký (theo tài liệu OpenID của Google), chỉ kiểm aud / iss / hạn. */
function decodeIdToken(idToken) {
  const part = String(idToken || "").split(".")[1] || "";
  const pad = part.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((part.length + 3) % 4);
  const bytes = Uint8Array.from(atob(pad), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function googleCallback(request, env) {
  const url = new URL(request.url);
  const [state, verifier, nextEnc] = readCookie(request, STATE_COOKIE).split(".");
  if (url.searchParams.get("error")) return errorBack("google_cancelled");
  if (!state || !verifier || url.searchParams.get("state") !== state) return errorBack("google_state");
  const code = url.searchParams.get("code");
  if (!code) return errorBack("google_state");

  const ip = request.headers.get("cf-connecting-ip") || "?";
  await rateLimit(env, `google:${ip}`, 30, 900, "Đăng nhập quá nhiều lần");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: callbackUrl(request),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    signal: AbortSignal.timeout(10000),
  });
  const tokens = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokens.id_token) {
    console.error("google token error", tokenRes.status, tokens.error);
    return errorBack("google_failed");
  }

  let p;
  try {
    p = decodeIdToken(tokens.id_token);
  } catch {
    return errorBack("google_failed");
  }
  const issOk = p.iss === "https://accounts.google.com" || p.iss === "accounts.google.com";
  if (!issOk || p.aud !== env.GOOGLE_CLIENT_ID || !p.sub || (p.exp || 0) * 1000 < Date.now()) {
    return errorBack("google_failed");
  }
  if (!p.email || p.email_verified !== true) return errorBack("google_unverified");

  const email = String(p.email).toLowerCase();
  const now = nowIso();
  const name = String(p.name || "").slice(0, 100);
  const avatar = String(p.picture || "").slice(0, 500);

  let user = await env.DB.prepare("SELECT * FROM users WHERE google_sub = ?").bind(p.sub).first();
  if (!user) {
    const byEmail = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
    if (byEmail) {
      // Liên kết Google vào tài khoản đã đăng ký bằng email này. Nếu email đó chưa từng được xác minh,
      // xoá mật khẩu cũ + mọi phiên cũ: có thể ai khác đã đăng ký trước bằng email của chủ nhân thật.
      const unverified = !byEmail.email_verified_at;
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE users SET google_sub = ?, email_verified_at = COALESCE(email_verified_at, ?), " +
            "avatar_url = CASE WHEN avatar_url = '' THEN ? ELSE avatar_url END, " +
            "name = CASE WHEN name = '' THEN ? ELSE name END, " +
            (unverified ? "pass_hash = NULL, " : "") + "updated_at = ? WHERE id = ?"
        ).bind(p.sub, now, avatar, name, now, byEmail.id),
        ...(unverified ? [env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(byEmail.id)] : []),
      ]);
      user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(byEmail.id).first();
    } else {
      user = await env.DB.prepare(
        "INSERT INTO users (email, name, avatar_url, google_sub, email_verified_at, created_at, updated_at) " +
          "VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *"
      ).bind(email, name, avatar, p.sub, now, now, now).first();
    }
  } else if (avatar && user.avatar_url !== avatar) {
    await env.DB.prepare("UPDATE users SET avatar_url = ? WHERE id = ?").bind(avatar, user.id).run();
  }

  if (user.locked) return errorBack("locked");

  const session = await createSession(env, user.id);
  let next = ACCOUNT_PAGE;
  try { next = safeNext(decodeURIComponent(nextEnc || "")); } catch { /* giữ mặc định */ }
  return redirect(next, { "set-cookie": [session, clearStateCookie()] });
}
