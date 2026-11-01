-- Tài khoản người dùng website, phiên đăng nhập, giới hạn tần suất. Giờ lưu ISO UTC.

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,              -- chữ thường
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  pass_hash TEXT,                          -- NULL = chỉ đăng nhập bằng Google
  google_sub TEXT UNIQUE,                  -- ID tài khoản Google (NULL = chưa liên kết)
  email_verified_at TEXT,                  -- có khi đăng nhập Google (Google đã xác minh email)
  role TEXT NOT NULL DEFAULT 'user',       -- 'user' | 'admin'
  locked INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',           -- ghi chú nội bộ của quản trị
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,             -- SHA-256 của token trong cookie (không lưu token gốc)
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at INTEGER NOT NULL                -- epoch giây
);
