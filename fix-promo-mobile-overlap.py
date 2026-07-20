"""Fix mobile overlap between the site-wide promo bar and the nav (logo + hamburger).

Root cause: promo CSS hardcoded mobile push-down at 54px, but when the promo copy
wraps to two lines on narrow phones the actual promo height is 66-83px. Body
padding, nav top, and mobile-collapsed hamburger top were all short by 12-30px,
so the logo and floating hamburger got covered.

Fix: replace hardcoded pixel positions with a CSS variable `--promo-h`, and add
a small measurement script that sets the variable to the promo's actual height
on load + resize. The nav and hamburger positions self-correct if the copy is
ever changed.

Applies to all 10 pages that carry the promo bar. book-{casual,office,wedding}
and find-us don't have it — skipped.
"""

from pathlib import Path

ROOT = Path(__file__).parent

PAGES = [
    "about.html", "book.html", "brands.html", "casual.html", "contact.html",
    "index.html", "office.html", "privacy.html", "subscribe.html", "wedding.html",
]

OLD_CSS = """  /* ══ SITE-WIDE PROMO BAR (swap copy for next month's offer) ══ */
  .tj-promo { position: fixed; top: 0; left: 0; right: 0; background: #1C2B39; color: #F5F0EB; border-bottom: 1px solid rgba(245,240,235,0.12); z-index: 101; }
  /* Push everything else down by promo height so nav + hero don't hide behind it */
  body:not(.tj-promo-dismissed) { padding-top: 42px; }
  body:not(.tj-promo-dismissed) .nav { top: 42px; }
  body:not(.tj-promo-dismissed) .nav-menu { top: 134px; }
  @media (max-width: 699px) {
    body:not(.tj-promo-dismissed) { padding-top: 54px; }
    body:not(.tj-promo-dismissed) .nav { top: 54px; }
    body:not(.tj-promo-dismissed) .nav-menu { top: 146px; }
    /* When nav is collapsed to floating hamburger, open menu right below promo */
    .nav.mobile-collapsed ~ .nav-menu,
    body:not(.tj-promo-dismissed) .nav.mobile-collapsed ~ .nav-menu { top: 54px; }
    body.tj-promo-dismissed .nav.mobile-collapsed ~ .nav-menu { top: 0; }
  }
  .tj-promo__inner { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 11px 44px; text-decoration: none; color: inherit; font-family: 'Lato', Arial, sans-serif; transition: padding 0.24s cubic-bezier(0.4, 0, 0.2, 1); }
  .tj-promo.scrolled .tj-promo__inner { padding: 15px 44px; }
  .tj-promo__eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.34em; text-transform: uppercase; color: rgba(245,240,235,0.6); }
  .tj-promo__text { font-size: 13px; font-weight: 400; letter-spacing: 0.02em; color: rgba(245,240,235,0.96); }
  .tj-promo__cta { font-size: 11px; font-weight: 700; letter-spacing: 0.28em; text-transform: uppercase; border-bottom: 1px solid rgba(245,240,235,0.45); padding-bottom: 1px; }
  .tj-promo__close { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: rgba(245,240,235,0.55); font-size: 20px; line-height: 1; cursor: pointer; padding: 4px 10px; transition: color 0.15s; }
  .tj-promo__close:hover { color: #F5F0EB; }
  .tj-promo--hidden { display: none; }
  @media (max-width: 699px) {
    .tj-promo__inner { flex-direction: column; gap: 4px; padding: 9px 38px; text-align: center; }
    /* Keep the promo's mobile padding constant even when .scrolled */
    .tj-promo.scrolled .tj-promo__inner { padding: 9px 38px; }
    .tj-promo__eyebrow { font-size: 9px; letter-spacing: 0.3em; }
    .tj-promo__text { font-size: 12px; }
    .tj-promo__cta { font-size: 10px; }
    /* Push the collapsed hamburger container down so it clears the promo */
    body:not(.tj-promo-dismissed) .nav.mobile-collapsed { top: 68px; }
  }"""

NEW_CSS = """  /* ══ SITE-WIDE PROMO BAR (swap copy for next month's offer) ══ */
  /* --promo-h holds the promo bar's rendered height. JS measures on load/resize
     and updates this so nav positions self-correct when copy wraps taller. */
  :root { --promo-h: 42px; }
  @media (max-width: 699px) { :root { --promo-h: 66px; } }

  .tj-promo { position: fixed; top: 0; left: 0; right: 0; background: #1C2B39; color: #F5F0EB; border-bottom: 1px solid rgba(245,240,235,0.12); z-index: 101; }
  /* Push everything else down by promo height so nav + hero don't hide behind it */
  body:not(.tj-promo-dismissed) { padding-top: var(--promo-h); }
  body:not(.tj-promo-dismissed) .nav { top: var(--promo-h); }
  body:not(.tj-promo-dismissed) .nav-menu { top: calc(var(--promo-h) + 92px); }
  @media (max-width: 699px) {
    /* When nav is collapsed to floating hamburger, open menu right below promo */
    .nav.mobile-collapsed ~ .nav-menu,
    body:not(.tj-promo-dismissed) .nav.mobile-collapsed ~ .nav-menu { top: var(--promo-h); }
    body.tj-promo-dismissed .nav.mobile-collapsed ~ .nav-menu { top: 0; }
  }
  .tj-promo__inner { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 11px 44px; text-decoration: none; color: inherit; font-family: 'Lato', Arial, sans-serif; transition: padding 0.24s cubic-bezier(0.4, 0, 0.2, 1); }
  .tj-promo.scrolled .tj-promo__inner { padding: 15px 44px; }
  .tj-promo__eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.34em; text-transform: uppercase; color: rgba(245,240,235,0.6); }
  .tj-promo__text { font-size: 13px; font-weight: 400; letter-spacing: 0.02em; color: rgba(245,240,235,0.96); }
  .tj-promo__cta { font-size: 11px; font-weight: 700; letter-spacing: 0.28em; text-transform: uppercase; border-bottom: 1px solid rgba(245,240,235,0.45); padding-bottom: 1px; }
  .tj-promo__close { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: rgba(245,240,235,0.55); font-size: 20px; line-height: 1; cursor: pointer; padding: 4px 10px; transition: color 0.15s; }
  .tj-promo__close:hover { color: #F5F0EB; }
  .tj-promo--hidden { display: none; }
  @media (max-width: 699px) {
    .tj-promo__inner { flex-direction: column; gap: 4px; padding: 9px 38px; text-align: center; }
    /* Keep the promo's mobile padding constant even when .scrolled */
    .tj-promo.scrolled .tj-promo__inner { padding: 9px 38px; }
    .tj-promo__eyebrow { font-size: 9px; letter-spacing: 0.3em; }
    .tj-promo__text { font-size: 12px; }
    .tj-promo__cta { font-size: 10px; }
    /* Push the collapsed hamburger container down so it clears the promo */
    body:not(.tj-promo-dismissed) .nav.mobile-collapsed { top: calc(var(--promo-h) + 14px); }
  }"""

OLD_JS = """<script>
(function(){
  var KEY = 'tj_promo_2026_07_coppley';
  var promo = document.getElementById('tj-promo');
  if (!promo) return;
  try {
    if (localStorage.getItem(KEY) === '1') {
      promo.classList.add('tj-promo--hidden');
      document.body.classList.add('tj-promo-dismissed');
    }
  } catch (e) {}
  var close = promo.querySelector('[data-tj-promo-close]');
  if (close) close.addEventListener('click', function(e){
    e.stopPropagation(); e.preventDefault();
    promo.classList.add('tj-promo--hidden');
    document.body.classList.add('tj-promo-dismissed');
    try { localStorage.setItem(KEY, '1'); } catch (err) {}
  });
})();
</script>"""

NEW_JS = """<script>
(function(){
  var KEY = 'tj_promo_2026_07_coppley';
  var promo = document.getElementById('tj-promo');
  if (!promo) return;
  try {
    if (localStorage.getItem(KEY) === '1') {
      promo.classList.add('tj-promo--hidden');
      document.body.classList.add('tj-promo-dismissed');
    }
  } catch (e) {}
  var close = promo.querySelector('[data-tj-promo-close]');
  if (close) close.addEventListener('click', function(e){
    e.stopPropagation(); e.preventDefault();
    promo.classList.add('tj-promo--hidden');
    document.body.classList.add('tj-promo-dismissed');
    try { localStorage.setItem(KEY, '1'); } catch (err) {}
    document.documentElement.style.setProperty('--promo-h', '0px');
  });
  // Measure the promo's actual rendered height and expose as --promo-h.
  // Runs on load + resize so wrapping copy on narrow phones doesn't hide
  // the logo or floating hamburger behind the promo.
  function measurePromo(){
    if (document.body.classList.contains('tj-promo-dismissed')) return;
    var h = promo.offsetHeight;
    if (h > 0) document.documentElement.style.setProperty('--promo-h', h + 'px');
  }
  window.addEventListener('load', measurePromo);
  window.addEventListener('resize', measurePromo);
  if (document.readyState !== 'loading') requestAnimationFrame(measurePromo);
})();
</script>"""


def main():
    fails = []
    for name in PAGES:
        path = ROOT / name
        text = path.read_text(encoding="utf-8")
        css_hits = text.count(OLD_CSS)
        js_hits = text.count(OLD_JS)
        if css_hits != 1 or js_hits != 1:
            fails.append((name, css_hits, js_hits))
            continue
        text = text.replace(OLD_CSS, NEW_CSS)
        text = text.replace(OLD_JS, NEW_JS)
        path.write_text(text, encoding="utf-8")
        print(f"OK  {name}")
    if fails:
        print("\n--- FAILED (unexpected match count) ---")
        for name, c, j in fails:
            print(f"  {name}  css={c}  js={j}")
        raise SystemExit(1)
    print(f"\nDone. Patched {len(PAGES)} pages.")


if __name__ == "__main__":
    main()
