#!/usr/bin/env bash
# Snapshot the traffic numbers into data/history/ so we keep a permanent series.
#
# nginx logrotate discards old logs, so stats.sh can only look back a few weeks. This
# writes one JSON snapshot per run. Snapshots deliberately OVERLAP (30-day window, run
# weekly): the series is keyed on calendar date, so a missed week self-heals as long as
# the gap is shorter than the window. Same pattern as the database projects; the weekly
# run is _dashboards/archive-all.sh.
#
# Usage:
#   ./scripts/archive-stats.sh        # 30-day window, stamped today
#   ./scripts/archive-stats.sh 7      # narrower window
set -euo pipefail

DAYS="${1:-30}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/data/history"
mkdir -p "$OUT"

STAMP="$(date -u +%Y-%m-%d)"
DEST="$OUT/stats-$STAMP.json"

echo "→ collecting $DAYS days …" >&2
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

# Temp file first: a failed ssh mid-stream must not leave a truncated snapshot behind.
"$ROOT/scripts/stats.sh" "$DAYS" --json > "$TMP"
python3 -c "import json,sys; d=json.load(open(sys.argv[1])); assert d.get('by_day'), 'no by_day in snapshot'" "$TMP"

mv "$TMP" "$DEST"
trap - EXIT

DAYS_IN="$(python3 -c "import json,sys; print(len(json.load(open(sys.argv[1]))['by_day']))" "$DEST")"
echo "✓ $DEST  ($DAYS_IN days captured)" >&2
echo "  commit it — this is the only copy once logrotate runs." >&2
