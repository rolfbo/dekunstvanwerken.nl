#!/usr/bin/env bash
# Notify search engines that content changed. Run after a content deploy.
# IndexNow reaches Bing, Yandex, Seznam and Naver instantly with no account.
# Google ignores IndexNow — it re-reads sitemap.xml on its own schedule, and the
# sitemap is already registered in Search Console.
set -euo pipefail
cd "$(dirname "$0")/.."
KEY=$(ls *.txt | grep -oE '^[a-f0-9]{32}' | head -1)
python3 -c "
import json,re
urls=re.findall(r'<loc>(.*?)</loc>',open('sitemap.xml',encoding='utf-8').read())
json.dump({'host':'dekunstvanwerken.nl','key':'$KEY',
 'keyLocation':'https://dekunstvanwerken.nl/$KEY.txt','urlList':urls},open('/tmp/indexnow-dekunstvanwerken.nl.json','w'))
print(f'  submitting {len(urls)} URLs')
"
# The endpoint 403s intermittently when a host has submitted recently, even with a
# valid key (seen on healthcaredatabase 6 Aug: 403, then 200 on an immediate retry
# with the same payload). Retry before believing it, and exit non-zero if it never
# lands, so a silent no-op cannot look like a successful ping.
for attempt in 1 2 3; do
  body=$(curl -s -m 30 -w '\n%{http_code}' -X POST https://api.indexnow.org/indexnow \
    -H "Content-Type: application/json; charset=utf-8" --data @/tmp/indexnow-dekunstvanwerken.nl.json)
  code=${body##*$'\n'}
  case "$code" in
    200|202)
      echo "  IndexNow: HTTP $code (accepted, attempt $attempt)"
      exit 0
      ;;
  esac
  echo "  IndexNow: HTTP $code (attempt $attempt) ${body%$'\n'*}"
  [ "$attempt" -lt 3 ] && sleep 5
done
echo "  IndexNow: giving up after 3 attempts — check the key file at the keyLocation above."
exit 1
