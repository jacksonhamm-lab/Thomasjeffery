"""Add scroll room below the footer on mobile so the sticky Book a Fitting
button doesn't cover the Instagram + Facebook links.

The sticky-book bar sits fixed at the viewport bottom (position: fixed). Without
extra padding, the last elements of the flow (footer's social row) sit right
against the viewport bottom edge and get overlaid by the button — untappable.

Adding `padding-bottom: 60px` on body when mobile viewport (< 700px) gives
the scroll flow enough extra room that the footer content ends above the
sticky button's overlay zone, so Instagram / Facebook are reachable.

Applies to the 7 pages that carry the sticky book bar:
  about, brands, casual, contact, office, subscribe, wedding.
"""

from pathlib import Path

ROOT = Path(__file__).parent

PAGES = [
    "about.html", "brands.html", "casual.html", "contact.html",
    "office.html", "subscribe.html", "wedding.html",
]

OLD = "    .sticky-book:hover { background: #243649; }"
NEW = """    .sticky-book:hover { background: #243649; }
    /* Give the footer room to breathe above the sticky book button on mobile,
       so Instagram / Facebook (last row of the footer) stay tappable. */
    @media (max-width: 699px) { body { padding-bottom: 60px; } }"""


def main():
    fails = []
    for name in PAGES:
        path = ROOT / name
        text = path.read_text(encoding="utf-8")
        n = text.count(OLD)
        if n != 1:
            fails.append((name, n))
            continue
        text = text.replace(OLD, NEW)
        path.write_text(text, encoding="utf-8")
        print(f"OK  {name}")
    if fails:
        print("\n--- FAILED (unexpected match count) ---")
        for name, n in fails:
            print(f"  {name}  matches={n}")
        raise SystemExit(1)
    print(f"\nDone. Patched {len(PAGES)} pages.")


if __name__ == "__main__":
    main()
