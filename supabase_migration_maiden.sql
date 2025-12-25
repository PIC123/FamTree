-- Add maiden_name to family_members
alter table family_members 
add column if not exists maiden_name text;

