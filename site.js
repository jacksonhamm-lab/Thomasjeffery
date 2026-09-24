/**
 * Shared site behaviour. One copy instead of one per page.
 *
 * Every block guards on its own elements, so a page without the consent bar,
 * the popup or a nav simply skips that block. Loaded with defer from every
 * page, after that page's own inline scripts.
 *
 * Deliberately NOT moved here:
 *   - the Consent Mode + GA bootstrap, which must run before GA loads
 *   - the promo bar, which reads localStorage and sets --promo-h before paint;
 *     deferring it would flash the bar at people who already dismissed it
 *   - the reveal animation, which adds .tj-reveal (opacity 0) to elements that
 *     have already painted; deferring it risks a visible flicker
 */

/* ── Cookie consent bar ─────────────────────────────────────────────── */
  (function(){
    var banner = document.getElementById('tj-consent');
    if(!banner) return;
    function show(){
      banner.classList.add('tj-consent--show');
      // Reserve room for the bar, or it overlaps whatever sits at the bottom of
      // the viewport (it was covering the Subscribe button on /subscribe, where
      // the in-store QR code sends people).
      document.documentElement.style.setProperty('--tj-consent-h', (banner.offsetHeight + 32) + 'px');
      document.body.classList.add('tj-consent-open');
    }
    function hide(){
      banner.classList.remove('tj-consent--show');
      document.body.classList.remove('tj-consent-open');
    }
    banner.addEventListener('click', function(e){
      var btn = e.target.closest('[data-tj-consent]');
      if(!btn) return;
      if(window.tjConsent) window.tjConsent.set(btn.getAttribute('data-tj-consent'));
      hide();
    });
    if(!window.tjConsent || !window.tjConsent.get()) show();
    window.tjConsentOpen = show;
  })();

/* ── Subscribe popup ────────────────────────────────────────────────── */
(function () {
  var STORAGE_KEY = 'tj_subscribe_seen';
  var SUBSCRIBED_KEY = 'tj_subscribed';
  var DELAY_MS = 3000;
  function getFlag(k){ try { return localStorage.getItem(k); } catch (e) { return null; } }
  function setFlag(k){ try { localStorage.setItem(k, '1'); } catch (e) {} }
  var subscribed = getFlag(SUBSCRIBED_KEY);
  var seen = getFlag(STORAGE_KEY);
  var popup = document.getElementById('tj-popup');
  if (!popup) return;
  function show(){ popup.classList.add('tj-popup--show'); }
  function dismiss(){ setFlag(STORAGE_KEY); popup.classList.remove('tj-popup--show'); }
  window.tjShowPopup = show;
  if (!subscribed && !seen) {
    setTimeout(show, DELAY_MS);
  }
  popup.addEventListener('click', function (e) {
    if (e.target.closest('[data-tj-popup-close]')) dismiss();
    if (e.target.closest('[data-tj-popup-cta]')) setFlag(STORAGE_KEY);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && popup.classList.contains('tj-popup--show')) dismiss();
  });
  document.querySelectorAll('[data-tj-subscribe]').forEach(function (t) {
    if (subscribed) {
      var hideTarget = t.closest('li') || t;
      hideTarget.style.display = 'none';
    } else {
      t.addEventListener('click', function (e) {
        e.preventDefault();
        show();
      });
    }
  });
})();

/* ── Mobile nav menu ────────────────────────────────────────────────── */
(function () {
    /* ── Mobile hamburger menu ── */
    var hamburger = document.getElementById('nav-hamburger');
    var navMenu = document.getElementById('nav-menu');
    if (hamburger && navMenu) {
      // The menu is a fixed overlay, so the page behind it must stop scrolling.
      // overflow:hidden alone does not hold on iOS Safari, so the body gets
      // pinned and the scroll position is restored on close. The menu itself
      // keeps its own overflow-y, so a long menu still scrolls.
      var lockedY = 0;
      var prevPadRight = '';

      function setOpen(open) {
        var wasOpen = navMenu.classList.contains('open');
        if (open === wasOpen) return;
        navMenu.classList.toggle('open', open);
        hamburger.classList.toggle('open', open);
        hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) {
          lockedY = window.scrollY || window.pageYOffset || 0;
          prevPadRight = document.body.style.paddingRight;
          // Compensate for the scrollbar so the page does not jump sideways.
          var sbw = window.innerWidth - document.documentElement.clientWidth;
          if (sbw > 0) document.body.style.paddingRight = sbw + 'px';
          document.body.style.top = (-lockedY) + 'px';
          document.body.classList.add('nav-open');
        } else {
          document.body.classList.remove('nav-open');
          document.body.style.top = '';
          document.body.style.paddingRight = prevPadRight;
          // html has scroll-behavior: smooth, which would animate the restore and
          // make the page visibly slide back after the menu closes. Jump instead.
          var prevBehavior = document.documentElement.style.scrollBehavior;
          document.documentElement.style.scrollBehavior = 'auto';
          window.scrollTo(0, lockedY);
          document.documentElement.style.scrollBehavior = prevBehavior;
        }
      }

      hamburger.addEventListener('click', function (e) {
        e.stopPropagation();
        setOpen(!navMenu.classList.contains('open'));
      });
      // Tapping a destination should not leave the menu open behind it.
      navMenu.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('a')) setOpen(false);
      });
      document.addEventListener('click', function (e) {
        if (!navMenu.classList.contains('open')) return;
        if (navMenu.contains(e.target) || hamburger.contains(e.target)) return;
        setOpen(false);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' || e.key === 'Esc') setOpen(false);
      });
      // Rotating the phone re-lays the menu out against a different viewport.
      window.addEventListener('resize', function () { setOpen(false); });
    }
})();

/* ── Collapse the nav to a floating hamburger after scrolling ───────── */
(function(){
  var nav = document.querySelector('.nav');
  if (!nav) return;
  var mql = window.matchMedia('(max-width: 699px)');
  var threshold = 400;
  function onScroll(){
    if (!mql.matches) { nav.classList.remove('mobile-collapsed'); return; }
    var y = window.scrollY || window.pageYOffset;
    if (y > threshold) nav.classList.add('mobile-collapsed');
    else nav.classList.remove('mobile-collapsed');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  mql.addEventListener ? mql.addEventListener('change', onScroll) : mql.addListener(onScroll);
  onScroll();
})();
