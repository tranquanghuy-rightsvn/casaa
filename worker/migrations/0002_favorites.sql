-- Thư viện yêu thích theo tài khoản. project = vị trí dự án trong html/assets/js/projects-data.js (PROJECTS[n]).
CREATE TABLE favorites (
  user_id INTEGER NOT NULL,
  project INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, project)
);
