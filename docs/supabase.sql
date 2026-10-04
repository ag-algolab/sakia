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
-- Les signalements de pluie des agriculteurs ont été retirés du produit (décision du 4 octobre 2026) : plus aucune table à créer.
-- Si vous aviez déjà créé la table « rain_reports », elle n'est plus lue ni écrite par personne ; vous pouvez la supprimer
-- (décommentez la ligne suivante, puis Run) :
-- drop table if exists rain_reports;

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
