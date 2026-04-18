CREATE TABLE IF NOT EXISTS subscriptions (
  feed_url TEXT PRIMARY KEY NOT NULL,
  status TEXT NOT NULL,
  subscribed_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE TABLE IF NOT EXISTS playback_checkpoints (
  id TEXT PRIMARY KEY NOT NULL,
  feed_url TEXT NOT NULL,
  episode_guid TEXT,
  audio_url TEXT NOT NULL,
  current_time REAL NOT NULL,
  duration REAL NOT NULL,
  is_completed INTEGER NOT NULL,
  last_played_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS current_playback (
  id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
  feed_url TEXT NOT NULL,
  episode_guid TEXT,
  audio_url TEXT NOT NULL,
  current_time REAL NOT NULL,
  duration REAL NOT NULL,
  source_device_id TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_preferences (
  id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
  skip_interval INTEGER NOT NULL,
  auto_play INTEGER NOT NULL,
  whats_new_count INTEGER NOT NULL,
  itunes_search_enabled INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS playback_checkpoints_updated_at_idx
  ON playback_checkpoints (updated_at DESC);
