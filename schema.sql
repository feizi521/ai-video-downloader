CREATE TABLE IF NOT EXISTS download_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    platform TEXT NOT NULL,
    content_type TEXT NOT NULL,
    title TEXT,
    thumbnail_url TEXT,
    download_url TEXT,
    user_ip TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_platform ON download_history(platform);
CREATE INDEX IF NOT EXISTS idx_created_at ON download_history(created_at);
CREATE INDEX IF NOT EXISTS idx_user_ip ON download_history(user_ip);
