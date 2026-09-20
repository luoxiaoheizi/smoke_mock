export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS smoke_players (
    id text PRIMARY KEY, identity text NOT NULL UNIQUE, state jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK ((state->>'coins')::integer >= 0)
  )`,
  `CREATE TABLE IF NOT EXISTS smoke_tokens (
    id text PRIMARY KEY, player_id text NOT NULL REFERENCES smoke_players(id),
    access_hash text NOT NULL UNIQUE, refresh_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL, refresh_expires_at timestamptz NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS smoke_tokens_player ON smoke_tokens(player_id)',
  `CREATE TABLE IF NOT EXISTS smoke_wallet_ledger (
    player_id text NOT NULL REFERENCES smoke_players(id), operation_id text NOT NULL,
    amount integer NOT NULL, balance integer NOT NULL CHECK (balance >= 0),
    kind text NOT NULL, title text NOT NULL, created_at timestamptz NOT NULL,
    PRIMARY KEY(player_id, operation_id)
  )`,
  `CREATE TABLE IF NOT EXISTS smoke_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
  'INSERT INTO smoke_migrations(version) VALUES (1) ON CONFLICT DO NOTHING',
];

