-- Add position columns to family_members table
alter table family_members 
add column if not exists position_x double precision,
add column if not exists position_y double precision;

-- Enable Realtime for this table (if not already enabled)
alter publication supabase_realtime add table family_members;

