CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  host_id TEXT NOT NULL,
  map_size TEXT DEFAULT 'medium',
  difficulty TEXT DEFAULT 'normal',
  player_count INTEGER DEFAULT 0,
  max_players INTEGER DEFAULT 16,
  phase TEXT DEFAULT 'lobby',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for listing active rooms
CREATE INDEX idx_rooms_phase ON rooms (phase) WHERE phase = 'lobby';

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read/write for rooms
CREATE POLICY "Anyone can read rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Anyone can create rooms" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update rooms" ON rooms FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete rooms" ON rooms FOR DELETE USING (true);
