CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name TEXT NOT NULL DEFAULT 'Anonymous',
  wave INTEGER NOT NULL,
  kills INTEGER NOT NULL DEFAULT 0,
  damage_dealt INTEGER NOT NULL DEFAULT 0,
  towers_placed INTEGER NOT NULL DEFAULT 0,
  governor TEXT,
  victory BOOLEAN NOT NULL DEFAULT false,
  difficulty TEXT NOT NULL DEFAULT 'normal',
  map_size TEXT NOT NULL DEFAULT 'medium',
  player_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scores_ranking ON scores (wave DESC, kills DESC);
CREATE INDEX idx_scores_created_at ON scores (created_at DESC);

ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_scores" ON scores FOR SELECT USING (true);
CREATE POLICY "insert_scores" ON scores FOR INSERT WITH CHECK (true);
