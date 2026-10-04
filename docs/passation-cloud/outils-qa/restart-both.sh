#!/bin/bash
# Reconstruit puis relance : 3100 (météo réelle) et 3110 (météo réelle + faux stockage de messages parlés pour les sous-titres).
cd "$(git rev-parse --show-toplevel)"
S="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$S/logs"
kill_tree() { for c in $(pgrep -P "$1"); do kill_tree "$c"; done; kill "$1" 2>/dev/null; }
for pid in $(pgrep -f "next start -p 3100") $(pgrep -f "next start -p 3110"); do kill_tree "$pid"; done
sleep 1
npx next typegen > /dev/null 2>&1
npx next build > $S/logs/build.log 2>&1 || { echo "BUILD ÉCHEC"; tail -25 $S/logs/build.log; exit 1; }
(NODE_USE_ENV_PROXY=1 NEXT_TELEMETRY_DISABLED=1 nohup npx next start -p 3100 > $S/logs/server-3100.log 2>&1 &)
(MOCK_CLIP="${MOCK_CLIP:-$S/clip22.mp3}" SUPABASE_URL=http://supabase.mock SUPABASE_SERVICE_ROLE_KEY=dummy NODE_OPTIONS="--require $S/mock-voice-store.cjs" NODE_USE_ENV_PROXY=1 NEXT_TELEMETRY_DISABLED=1 nohup npx next start -p 3110 > $S/logs/server-3110.log 2>&1 &)
sleep 6
curl -s -m 10 -o /dev/null -w "3100 : HTTP %{http_code}\n" localhost:3100/api/catalog
curl -s -m 10 -o /dev/null -w "3110 : HTTP %{http_code}\n" localhost:3110/api/catalog
