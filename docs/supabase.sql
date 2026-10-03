-- À coller UNE FOIS dans Supabase > SQL Editor > Run.
-- Table des abonnés du bot Telegram (une ligne par conversation).
-- Aucune politique d'accès : la table n'est lisible et modifiable qu'avec la clé secrète (côté serveur).

create table if not exists subscribers (
  chat_id bigint primary key,
  lang text not null default 'fr',
  region_id text not null default 'kairouan',
  crop_id text not null default 'olivier',
  soil text not null default 'limoneux',
  system text not null default 'goutte',
  last_irrigation date,
  daily_bulletin boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table subscribers enable row level security;
