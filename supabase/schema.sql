-- Update schema to include Discord integration

-- Add discord_id to users table
ALTER TABLE users ADD COLUMN discord_id TEXT UNIQUE;

-- Create a table for Discord connections
CREATE TABLE discord_connections (
  user_id INTEGER REFERENCES users(id) PRIMARY KEY,
  discord_id TEXT NOT NULL,
  discord_username TEXT NOT NULL,
  discord_avatar TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a view for friends who are connected via Discord
CREATE VIEW discord_friends AS
SELECT 
  u.id AS user_id,
  dc.discord_id,
  dc.discord_username,
  dc.discord_avatar,
  EXISTS (
    SELECT 1 FROM friend_connections fc 
    WHERE fc.user_id = u.id AND fc.friend_id = u.id
  ) AS is_connected
FROM 
  users u
JOIN 
  discord_connections dc ON u.id = dc.user_id;

-- Add RLS policies for Discord connections
ALTER TABLE discord_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own Discord connection"
  ON discord_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own Discord connection"
  ON discord_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Discord connection"
  ON discord_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

