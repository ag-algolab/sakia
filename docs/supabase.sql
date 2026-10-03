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

-- ------------------------------------------------------------------------------
-- Rapports de pluie des agriculteurs (solidarité locale). À coller UNE FOIS dans le même éditeur SQL.
-- Aucun nom, aucune adresse IP : seulement une empreinte anonyme par appareil ou canal.
-- Aucune politique d'accès : lisible et modifiable seulement avec la clé secrète (côté serveur).

create table if not exists rain_reports (
  id bigint generated always as identity primary key,
  region_id text not null,
  day date not null,
  mm numeric(5,1) not null check (mm >= 0 and mm <= 150),
  level text check (level in ('none','very_light','light','heavy','very_heavy')),
  reporter_hash text not null,
  created_at timestamptz not null default now(),
  unique (region_id, day, reporter_hash)
);

alter table rain_reports enable row level security;

-- Si la table existait déjà sans la colonne « level » (échelle qualitative), cette ligne la rajoute sans rien casser :
alter table rain_reports add column if not exists level text check (level in ('none','very_light','light','heavy','very_heavy'));

-- ------------------------------------------------------------------------------
-- Plafonds de consommation persistants (protègent les crédits ElevenLabs contre les appels abusifs).
-- À coller UNE FOIS dans le même éditeur SQL. Aucune politique d'accès : serveur seulement.

create table if not exists usage_counters (
  counter text not null,
  day date not null,
  amount bigint not null default 0,
  primary key (counter, day)
);

alter table usage_counters enable row level security;
