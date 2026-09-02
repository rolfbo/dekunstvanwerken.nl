#!/usr/bin/env python3
"""Turn nginx access-log lines on stdin into a traffic report for dekunstvanwerken.nl.

Ported from investordatabase's scripts/stats.py (classifier 2) on 2 sep 2026. Same rules
for telling humans from bots — declared bots by User-Agent, Google's undeclared renderer
by IP range, volumetric scrapers by pages-per-asset ratio, and the "one-shot no-asset"
wave rule per (IP, day). See the healthcaredatabase original for the reasoning behind
each rule; the comments here are kept to what differs.

What differs: a small static company site, so the numbers that matter are the visits to
the pages that ask for something — /whitelabel.html and the three tools — and the lead
form. The form posts to mcp.dekunstvanwerken.nl (a separate vhost logging to nginx's
default log), so leads are read from the service's own JSONL store instead: stats.sh
appends its lines to the stream, and this script only keeps the timestamp and lead type.
Our own IP is left out of every figure — during build days it dominates a site this small.

argv is parsed as data and never becomes code; stats.sh passes the day count through.
"""
import argparse
import datetime
import json
import re
import sys
from collections import Counter

# combined log format:
# ip - - [10/Oct/2026:13:55:36 +0000] "GET /path HTTP/1.1" 200 1234 "ref" "ua"
LINE = re.compile(
    r'^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) [^"]*" (\d{3}) (\d+) "([^"]*)" "([^"]*)"'
)
BOT = re.compile(
    r"bot|crawl|spider|slurp|curl|wget|python-requests|headless|monitor|uptime|appengine-google", re.I
)
ASSET = re.compile(r"\.(css|js|png|jpg|jpeg|svg|ico|woff2?|xml|txt|json|csv|webp)$", re.I)
OK_STATUS = {"200", "304"}
ENGINE_PREFIXES = ("66.249.",)
SCRAPER_MIN_PAGES = 100
SCRAPER_PAGES_PER_ASSET = 20
ONESHOT_MAX_PAGES = 2
SEARCH_REFERRER = re.compile(
    r"^https?://([a-z0-9-]+\.)*"
    r"(google\.[a-z.]+|bing\.com|duckduckgo\.com|yandex\.(com|ru)|baidu\.com"
    r"|ecosia\.org|startpage\.com|qwant\.com|search\.brave\.com)/",
    re.I,
)

SITE = "dekunstvanwerken.nl"
# Our own connection; kept out of every figure (a curl smoke test after each deploy,
# checking the site on the phone, …). Counted apart so the exclusion stays visible.
OWN_IPS = {"84.85.56.148"}
# The pages that ask the visitor to do something. Always reported, even at zero.
CONVERSION_PAGES = ("/whitelabel.html", "/opbouwschema.html", "/fml.html", "/izp.html")
LEAD_TYPES = ("werkgever", "whitelabel", "anders")
# Our own URL patterns — a 404 here is a broken link (or a stale sitemap), not a scanner.
# Flat .html files at the root plus the diensten/ and kennisbank/ folders; the .php and
# .env waves stay out.
OURS = re.compile(r"^/(diensten/|kennisbank/|[a-z0-9-]+\.html$|$)")


def parse(stream, cutoff, leads):
    """Yield (ip, when, bare_path, status, referrer, ua, is_asset) within window.

    Lines that are JSON objects are lead-form records (aanmeldingen.jsonl); those are
    reduced to (day, type) and appended to `leads` instead of being yielded.
    """
    for line in stream:
        if line.startswith("{"):
            try:
                d = json.loads(line)
                when = datetime.datetime.fromisoformat(str(d["ontvangen"]).replace("Z", "+00:00"))
            except (ValueError, KeyError, TypeError):
                continue
            if when.tzinfo is None:
                when = when.replace(tzinfo=datetime.timezone.utc)
            if when >= cutoff:
                t = str(d.get("type") or "anders")
                leads.append((when.strftime("%Y-%m-%d"), t if t in LEAD_TYPES else "anders"))
            continue
        m = LINE.match(line)
        if not m:
            continue
        ip, ts, _method, path, status, _size, ref, ua = m.groups()
        try:
            when = datetime.datetime.strptime(ts, "%d/%b/%Y:%H:%M:%S %z")
        except ValueError:
            continue
        if when < cutoff:
            continue
        bare, _, _query = path.partition("?")
        yield ip, when, bare, status, ref, ua, bool(ASSET.search(bare))


def classify(rows):
    """Split traffic into declared bots, search engines, scrapers and humans.

    Returns (bucket_of_ip, scrapers, oneshot, pages_by_ip, assets_by_ip).
    """
    pages_by_ip, assets_by_ip = Counter(), Counter()
    day_pages, day_assets, day_search = Counter(), Counter(), set()
    for ip, when, bare, status, ref, ua, is_asset in rows:
        if status not in OK_STATUS or BOT.search(ua):
            continue
        key = (ip, when.strftime("%Y-%m-%d"))
        if is_asset:
            assets_by_ip[ip] += 1
            day_assets[key] += 1
        else:
            pages_by_ip[ip] += 1
            day_pages[key] += 1
            if SEARCH_REFERRER.match(ref):
                day_search.add(key)

    scrapers = {
        ip
        for ip, n in pages_by_ip.items()
        if n >= SCRAPER_MIN_PAGES
        and assets_by_ip[ip] * SCRAPER_PAGES_PER_ASSET < n
        and not ip.startswith(ENGINE_PREFIXES)
    }
    oneshot = {
        key
        for key, n in day_pages.items()
        if n <= ONESHOT_MAX_PAGES
        and not day_assets[key]
        and key not in day_search
        and key[0] not in scrapers
        and not key[0].startswith(ENGINE_PREFIXES)
    }
    bucket = {}
    for ip in set(pages_by_ip) | set(assets_by_ip):
        if ip.startswith(ENGINE_PREFIXES):
            bucket[ip] = "engine"
        elif ip in scrapers:
            bucket[ip] = "scraper"
        else:
            bucket[ip] = "human"
    return bucket, scrapers, oneshot, pages_by_ip, assets_by_ip


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=7)
    ap.add_argument("--site", default=SITE)
    ap.add_argument("--json", action="store_true", help="emit the same figures as JSON (archive-stats.sh)")
    args = ap.parse_args()

    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=args.days)
    leads = []
    rows, own_hits = [], 0
    for row in parse(sys.stdin, cutoff, leads):
        if row[0] in OWN_IPS:
            own_hits += 1
            continue
        rows.append(row)
    bucket, scrapers, oneshot, pages_by_ip, assets_by_ip = classify(rows)

    mix = Counter()
    days, uniq_by_day, pages, refs, bots = Counter(), {}, Counter(), Counter(), Counter()
    human_ips = set()
    notfound, badstatus, statuses = Counter(), Counter(), Counter()

    for ip, when, bare, status, ref, ua, is_asset in rows:
        statuses[status] += 1
        kind = "bot" if BOT.search(ua) else bucket.get(ip, "human")
        if kind == "human" and (ip, when.strftime("%Y-%m-%d")) in oneshot:
            kind = "oneshot"
        mix[kind] += 1
        if kind == "bot":
            bots[ua[:60]] += 1

        if status not in OK_STATUS and OURS.match(bare):
            if status == "404":
                notfound[bare] += 1
            elif status[0] in "45":
                badstatus[(status, bare)] += 1

        if kind != "human" or is_asset or status not in OK_STATUS:
            continue
        d = when.strftime("%Y-%m-%d")
        days[d] += 1
        uniq_by_day.setdefault(d, set()).add(ip)
        human_ips.add(ip)
        pages[bare] += 1
        if ref and ref != "-" and args.site not in ref:
            refs[ref[:70]] += 1

    browsers = {ip for ip in human_ips if assets_by_ip[ip]}
    errs = {k: v for k, v in statuses.items() if k.startswith("5")}
    lead_type = Counter(t for _, t in leads)
    lead_day = Counter(d for d, _ in leads)

    if args.json:
        json.dump(
            {
                "site": args.site,
                "days": args.days,
                # Same numbering as healthcaredatabase: 2 = the one-shot no-asset rule.
                "classifier": 2,
                "generated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
                "requests": sum(mix.values()),
                "own_hits": own_hits,
                "mix": {k: mix[k] for k in ("bot", "engine", "scraper", "oneshot", "human")},
                "views": sum(days.values()),
                "ips": len(human_ips),
                "browsers": len(browsers),
                "oneshot_ip_days": len(oneshot),
                "leads": {
                    "total": len(leads),
                    "by_type": {t: lead_type[t] for t in LEAD_TYPES},
                    "by_day": [{"date": d, "n": lead_day[d]} for d in sorted(lead_day)],
                },
                "by_day": [{"date": d, "views": days[d], "ips": len(uniq_by_day[d])} for d in sorted(days)],
                "pages": [{"path": p, "n": n} for p, n in pages.most_common(15)],
                "conversion": [{"path": p, "n": pages.get(p, 0)} for p in CONVERSION_PAGES],
                "referrers": [{"ref": r, "n": n} for r, n in refs.most_common(10)],
                "crawlers": [{"ua": b, "n": n} for b, n in bots.most_common(6)],
                "scrapers": [{"ip": ip, "pages": pages_by_ip[ip]} for ip in sorted(scrapers, key=lambda i: -pages_by_ip[i])[:8]],
                "notfound": [{"path": p, "n": n} for p, n in notfound.most_common(10)],
                "errors": [{"status": s, "path": p, "n": n} for (s, p), n in badstatus.most_common(10)],
                "server_errors": dict(sorted(errs.items())),
            },
            sys.stdout,
            indent=2,
        )
        print()
        return

    out = print
    out(f"\n  {args.site} — last {args.days} days")
    out("  " + "─" * 54)
    out(f"  {sum(mix.values()):>6}  requests in window (own IP excluded: {own_hits})")
    out(f"  {mix['bot']:>6}  declared bots (User-Agent)")
    out(f"  {mix['engine']:>6}  search engines not declaring in UA")
    out(f"  {mix['scraper']:>6}  datacenter scrapers ({len(scrapers)} IPs, browser UA, near-zero assets)")
    out(f"  {mix['oneshot']:>6}  one-shot no-asset hits ({len(oneshot)} IP-days, <=2 pages, no assets, not from search)")
    out("")
    out(f"  {sum(days.values()):>6}  page views (human, assets excluded)")
    out(f"  {len(human_ips):>6}  distinct IPs")
    out(f"  {len(browsers):>6}  of those also loaded CSS/JS (real browsers)")
    out(f"  {len(leads):>6}  lead-form submissions"
        + (" (" + ", ".join(f"{t} {lead_type[t]}" for t in LEAD_TYPES if lead_type[t]) + ")" if leads else "")
        + " — read them per instructions/aanmeldingen.md")

    if days:
        out("\n  Page views by day")
        peak = max(days.values())
        for d in sorted(days):
            bar = "█" * max(1, round(days[d] / peak * 28))
            out(f"    {d}  {days[d]:>5}  {len(uniq_by_day[d]):>4} IPs  {bar}")

    if pages:
        out("\n  Top pages")
        for p, n in pages.most_common(12):
            out(f"    {n:>5}  {p[:62]}")

    out("\n  Conversion pages (human views)")
    for p in CONVERSION_PAGES:
        out(f"    {pages.get(p, 0):>5}  {p}")

    if refs:
        out("\n  Referrers (external)")
        for r, n in refs.most_common(8):
            out(f"    {n:>5}  {r}")
    else:
        out("\n  Referrers: none logged.")

    if bots:
        out("\n  Crawlers seen")
        for b, n in bots.most_common(5):
            out(f"    {n:>5}  {b}")

    if scrapers:
        out("\n  Scraper IPs excluded from the human numbers")
        for ip in sorted(scrapers, key=lambda i: -pages_by_ip[i])[:8]:
            out(f"    {pages_by_ip[ip]:>5}  {ip}")

    if notfound:
        out("\n  ⚠ 404s on our own URL patterns (possible broken links)")
        for p, n in notfound.most_common(8):
            out(f"    {n:>5}  {p[:62]}")

    if badstatus:
        out("\n  ⚠ Other errors on our own URLs")
        for (status, p), n in badstatus.most_common(8):
            out(f"    {n:>5}  {status}  {p[:56]}")

    if errs:
        out("\n  ⚠ Server errors (all URLs): " + ", ".join(f"{k}={v}" for k, v in sorted(errs.items())))
    out()


if __name__ == "__main__":
    main()
