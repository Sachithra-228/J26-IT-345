"""
Collects public job advertisements into the git-ignored raw folder (C3).

    # Recommended: import ads you saved by hand (one .txt or .html file per ad;
    # the first non-empty line of a .txt file is the title).
    python ml/c3/src/job-ad-nlp/collect_ads.py --from-dir path/to/saved_ads

    # Optional: fetch a list of ad URLs from domains you have reviewed.
    python ml/c3/src/job-ad-nlp/collect_ads.py --urls urls.txt --allow-domain example.lk

Rules this script enforces (it was NOT run against any real site while building C3):
  * nothing is fetched unless its domain is passed with --allow-domain, which you
    should do only after reading that site's terms of use;
  * robots.txt is checked for every URL and a disallowed URL is skipped;
  * one request every --delay seconds (default 10) with an identifying User-Agent,
    capped at --max requests;
  * output goes only to ml/c3/data/raw/ (git-ignored). Raw ads may include recruiter
    names or contacts; the cleaner strips PII before anything else uses them.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
import urllib.parse
import urllib.request
import urllib.robotparser
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
import c3_common  # noqa: E402

USER_AGENT = "UniCareConnect-C3-research/1.0 (SLIIT IT4010 student research; non-commercial)"


class _TextExtractor(HTMLParser):
    SKIP = {"script", "style", "noscript", "nav", "footer", "header"}

    def __init__(self):
        super().__init__()
        self.parts: list[str] = []
        self.title = ""
        self._skip = 0
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self._skip += 1
        if tag == "title":
            self._in_title = True
        if tag in ("br", "p", "li", "div", "h1", "h2", "h3", "tr"):
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in self.SKIP and self._skip:
            self._skip -= 1
        if tag == "title":
            self._in_title = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        elif not self._skip:
            self.parts.append(data)


def html_to_text(html: str) -> tuple[str, str]:
    p = _TextExtractor()
    p.feed(html)
    lines = [" ".join(line.split()) for line in "".join(p.parts).splitlines()]
    return p.title.strip(), "\n".join(line for line in lines if line)


def _record(source_type: str, source: str, title: str, text: str) -> dict:
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    return {
        "raw_id": digest[:16],
        "source_type": source_type,
        "source": source,
        "collected_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "title": title,
        "text": text,
        "sha256": digest,
    }


def from_dir(folder: Path) -> list[dict]:
    rows = []
    for path in sorted(folder.iterdir()):
        content = path.read_text(encoding="utf-8", errors="replace")
        if path.suffix.lower() in (".html", ".htm"):
            title, text = html_to_text(content)
        elif path.suffix.lower() == ".txt":
            lines = [line for line in content.splitlines() if line.strip()]
            title, text = (lines[0].strip(), "\n".join(lines[1:])) if lines else ("", "")
        else:
            continue
        rows.append(_record("public_web", f"manual-save:{path.name}", title, text))
    return rows


def from_urls(urls: list[str], allowed: set[str], delay: float, max_requests: int) -> list[dict]:
    robots: dict[str, urllib.robotparser.RobotFileParser] = {}
    rows = []
    for url in urls[:max_requests]:
        host = urllib.parse.urlparse(url).netloc.lower()
        if host not in allowed:
            print(f"skip (domain not allowed): {url}")
            continue
        if host not in robots:
            rp = urllib.robotparser.RobotFileParser(f"https://{host}/robots.txt")
            try:
                rp.read()
            except OSError:
                print(f"skip host (robots.txt unreadable): {host}")
                robots[host] = None  # type: ignore[assignment]
                continue
            robots[host] = rp
        rp = robots[host]
        if rp is None or not rp.can_fetch(USER_AGENT, url):
            print(f"skip (robots.txt disallows): {url}")
            continue
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=20) as resp:  # noqa: S310 - allow-listed https URL
            html = resp.read().decode("utf-8", errors="replace")
        title, text = html_to_text(html)
        rows.append(_record("public_web", url, title, text))
        time.sleep(delay)
    return rows


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--from-dir", type=Path)
    ap.add_argument("--urls", type=Path, help="text file, one URL per line")
    ap.add_argument("--allow-domain", action="append", default=[], help="domain whose terms you have reviewed")
    ap.add_argument("--delay", type=float, default=10.0)
    ap.add_argument("--max", type=int, default=50)
    args = ap.parse_args()

    rows: list[dict] = []
    if args.from_dir:
        rows += from_dir(args.from_dir)
    if args.urls:
        if not args.allow_domain:
            sys.exit("Refusing to fetch: pass --allow-domain for each site whose terms you have reviewed.")
        if args.delay < 5:
            sys.exit("Refusing to fetch faster than one request per 5 seconds.")
        urls = [u.strip() for u in args.urls.read_text(encoding="utf-8").splitlines() if u.strip()]
        rows += from_urls(urls, {d.lower() for d in args.allow_domain}, args.delay, args.max)

    out = c3_common.RAW_DIR / f"ads-{datetime.now(timezone.utc):%Y%m%dT%H%M%S}.jsonl"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), encoding="utf-8")
    print(f"wrote {len(rows)} raw ads to {out} (git-ignored)")


if __name__ == "__main__":
    main()
