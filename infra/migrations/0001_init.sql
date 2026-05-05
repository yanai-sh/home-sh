-- Migration: 0001_init
-- Purpose: Initial telemetry schema for live session data in /workspace

CREATE TABLE sessions (
  id            TEXT     PRIMARY KEY,                  -- UUIDv4, client-generated
  started_at    INTEGER  NOT NULL,                     -- Unix epoch ms
  country       TEXT,                                  -- From CF-IPCountry header (no IP stored)
  device_class  TEXT     CHECK(device_class IN ('desktop', 'mobile', 'tablet')),
  ua_family     TEXT,                                  -- Browser family, not full UA string
  lcp_ms        INTEGER,                               -- LCP in milliseconds
  wasm_init_ms  INTEGER                                -- Time to first WASM module ready
);

CREATE TABLE frame_samples (
  session_id  TEXT     NOT NULL REFERENCES sessions(id),
  t           INTEGER  NOT NULL,                       -- Unix epoch ms of sample
  fps         INTEGER,
  tick_rate   INTEGER
);

CREATE INDEX idx_sessions_started  ON sessions(started_at);
CREATE INDEX idx_sessions_country  ON sessions(country);
CREATE INDEX idx_frame_session     ON frame_samples(session_id);
