#!/usr/bin/env python3
"""Tests for scripts/stats.py. Stdlib only, like the site itself.

    python3 -m unittest scripts/test_stats.py -v

Feeds synthetic nginx lines to the script over stdin and reads its --json output, so what is
tested is the real command the archive runs — not an import of its internals.

Ported from verzuimdatabase's scripts/test_stats.py on 12 sep 2026 together with the
hosting-ASN rule, plus a case for this site's OWN_IPS exclusion, which must keep running
ahead of the new rule.
"""
import datetime
import json
import os
import subprocess
import sys
import tempfile
import unittest

SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "stats.py")
CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0 Safari/537.36"


def line(ip, path, ua=CHROME, status="200", ref="-", day_offset=0):
    when = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=day_offset)
    stamp = when.strftime("%d/%b/%Y:%H:%M:%S +0000")
    return f'{ip} - - [{stamp}] "GET {path} HTTP/1.1" {status} 512 "{ref}" "{ua}"\n'


def run(lines, days=7, asn_dir=None, hosting_asns=None):
    """Run the real script. Without asn_dir it points at an empty directory, so tests never
    depend on the 32 MB ASN tables that happen to be on this machine."""
    with tempfile.TemporaryDirectory() as empty:
        out = subprocess.run(
            [sys.executable, SCRIPT, "--days", str(days), "--json",
             "--asn-dir", str(asn_dir or empty),
             "--hosting-asns", str(hosting_asns or os.path.join(empty, "hosting-asns.json"))],
            input="".join(lines), capture_output=True, text=True, check=True,
        )
    return json.loads(out.stdout)


# 47.79.0.0/16 as integers: the Alibaba Cloud pool (AS45102) seen on 10 and 11 sep 2026.
ALIBABA_ROW = '793706496,793772031,45102,"Alibaba (US) Technology Co., Ltd."\n'
CLOUDFLARE_ROW = '16777216,16777471,13335,"Cloudflare, Inc."\n'
# 84.85.56.0/24 — the block our own address (OWN_IPS) sits in, deliberately given a listed
# ASN so the OWN_IPS test proves the exclusion runs first rather than passing by accident.
OWN_ROW = '1414871040,1414871295,45102,"pretend our own ISP were a listed cloud"\n'
# Hosting.asn() bisects, so the table it reads must be sorted by start address — as the real
# @ip-location-db CSVs are. Written out of order, every lookup silently returns None and the
# rule looks like it is off.
ASN_ROWS = "".join(sorted((CLOUDFLARE_ROW, ALIBABA_ROW, OWN_ROW), key=lambda r: int(r.split(",")[0])))


class HostingAsnRule(unittest.TestCase):
    """Addresses inside a listed hosting ASN are 'datacenter' at any volume (classifier 3).

    The wave this rule exists for, seen on investordatabase 11 sep 2026: 413 Alibaba IPs,
    2-9 pages each with referer google.com, no CSS/JS. Under every per-IP threshold, and the
    search referer also exempts it from the one-shot rule — so classifier 2 counted all of it
    as human page views.
    """

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        d = self.tmp.name
        with open(os.path.join(d, "asn-ipv4-num.csv"), "w") as fh:
            fh.write(ASN_ROWS)
        self.listing = os.path.join(d, "hosting-asns.json")
        with open(self.listing, "w") as fh:
            json.dump({"_comment": "ignored", "45102": "Alibaba"}, fh)
        self.dir = d

    def tearDown(self):
        self.tmp.cleanup()

    def wave(self, ip):
        # Three pages from a "search click", no assets: the 11 sep shape.
        return [line(ip, p, ref="https://www.google.com/")
                for p in ("/index.html", "/fml.html", "/izp.html")]

    def test_listed_asn_goes_to_datacenter_at_low_volume(self):
        r = run(self.wave("47.79.202.10"), asn_dir=self.dir, hosting_asns=self.listing)
        self.assertEqual(r["mix"]["datacenter"], 3)
        self.assertEqual(r["mix"]["human"], 0)
        self.assertEqual(r["views"], 0)
        self.assertEqual(r["ips"], 0)
        self.assertEqual(r["classifier"], 3)
        self.assertIs(r["hosting_asn_rule"], True)

    def test_unlisted_ip_is_unaffected(self):
        # One address in a mapped but unlisted ASN (Cloudflare), one in no range at all.
        r = run(self.wave("1.0.0.5") + self.wave("73.10.5.1"), asn_dir=self.dir, hosting_asns=self.listing)
        self.assertEqual(r["mix"]["datacenter"], 0)
        self.assertEqual(r["views"], 6)
        self.assertEqual(r["ips"], 2)
        self.assertEqual(r["classifier"], 3)

    def test_volumetric_scraper_is_still_a_scraper(self):
        lines = [line("47.79.202.11", f"/kennisbank/a-{n}.html") for n in range(150)]
        r = run(lines, asn_dir=self.dir, hosting_asns=self.listing)
        self.assertEqual(r["mix"]["scraper"], 150)
        self.assertEqual(r["mix"]["datacenter"], 0)

    def test_own_ip_still_excluded_before_the_hosting_rule(self):
        # OWN_IPS runs first: our own address is dropped, never re-labelled "datacenter",
        # and never counted in the mix — even when its range is in the hosting table.
        r = run(self.wave("84.85.56.148") + self.wave("73.10.5.1"),
                asn_dir=self.dir, hosting_asns=self.listing)
        self.assertEqual(r["own_hits"], 3)
        self.assertEqual(r["mix"]["datacenter"], 0)
        self.assertEqual(r["views"], 3)
        self.assertEqual(r["ips"], 1)

    def test_missing_table_turns_rule_off_without_error(self):
        r = run(self.wave("47.79.202.10"), asn_dir=os.path.join(self.dir, "nope"), hosting_asns=self.listing)
        self.assertEqual(r["classifier"], 2)
        self.assertIs(r["hosting_asn_rule"], False)
        self.assertEqual(r["mix"]["datacenter"], 0)
        self.assertEqual(r["views"], 3)

    def test_missing_listing_turns_rule_off_without_error(self):
        r = run(self.wave("47.79.202.10"), asn_dir=self.dir, hosting_asns=os.path.join(self.dir, "nope.json"))
        self.assertEqual(r["classifier"], 2)
        self.assertIs(r["hosting_asn_rule"], False)
        self.assertEqual(r["views"], 3)

    def test_missing_table_text_report_says_rule_off(self):
        out = subprocess.run(
            [sys.executable, SCRIPT, "--days", "7",
             "--asn-dir", os.path.join(self.dir, "nope"), "--hosting-asns", self.listing],
            input="".join(self.wave("47.79.202.10")), capture_output=True, text=True, check=True,
        ).stdout
        self.assertIn("table missing, rule OFF", out)


if __name__ == "__main__":
    unittest.main()
