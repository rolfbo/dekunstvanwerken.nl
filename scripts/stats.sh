#!/usr/bin/env bash
# Traffic numbers for dekunstvanwerken.nl, read straight from the nginx access log over
# SSH. Ported from investordatabase (classifier 2). No analytics script on the site; this
# groups requests by IP address, which is personal data under GDPR regardless of cookies —
# worth saying. The lead form on the homepage posts to mcp.dekunstvanwerken.nl, which logs
# to nginx's default log, so form submissions are counted from the service's own JSONL
# store (/var/lib/dkvw-mcp/aanmeldingen.jsonl) instead — only the timestamp and lead type
# leave the server, never the contact details.
#
# Usage:
#   ./scripts/stats.sh            # last 7 days
#   ./scripts/stats.sh 30         # last 30 days (limited by logrotate retention: 14 days
#                                 #   after the first rotation on 2 sep 2026)
#   ./scripts/stats.sh 7 --json   # machine-readable, for archive-stats.sh
set -euo pipefail

DAYS="${1:-7}"
shift || true   # anything after the day count is passed through to stats.py
[[ "$DAYS" =~ ^[0-9]+$ ]] || { echo "usage: $(basename "$0") <days> [--json]" >&2; exit 1; }
(( DAYS > 0 )) || { echo "days must be greater than 0" >&2; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Coarse day-level prefilter on the server so a 7-day report doesn't stream the whole
# retained history; stats.py still applies the exact cutoff. DAYS goes in as argv. The
# filter runs remotely so the JSONL lead records appended after it pass through untouched.
DATE_RE="$(python3 -c "
import datetime, sys
now = datetime.datetime.now(datetime.timezone.utc)
print('|'.join((now - datetime.timedelta(days=i)).strftime('%d/%b/%Y')
                for i in range(int(sys.argv[1]) + 1)))
" "$DAYS")"

ssh dkvw "d=dekunstvanwerken.nl; \
          { sudo cat /var/log/nginx/\$d.access.log 2>/dev/null || true; \
            sudo cat /var/log/nginx/\$d.access.log.1 2>/dev/null || true; \
            sudo find /var/log/nginx -maxdepth 1 -name \"\$d.access.log.*.gz\" \
                 -mtime -$((DAYS + 1)) -exec zcat -f {} + 2>/dev/null || true; } \
          | grep -E '\[($DATE_RE):'; \
          sudo cat /var/lib/dkvw-mcp/aanmeldingen.jsonl 2>/dev/null || true" \
| python3 "$ROOT/scripts/stats.py" --days "$DAYS" "$@"
