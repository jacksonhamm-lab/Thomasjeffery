/**
 * Spam guard for the contact and booking forms (any form with data-guard).
 *  - Records time on page and sends it as "_elapsed" (server rejects instant submits).
 *  - Renders Cloudflare Turnstile when /api/turnstile-config returns a site key.
 * Runs in the capture phase so it fills in fields before each page's own submit handler.
 */
(function () {
  var loadedAt = Date.now();
  var forms = document.querySelectorAll('form[data-guard]');
  if (!forms.length) return;

  forms.forEach(function (form) {
    var elapsed = document.createElement('input');
    elapsed.type = 'hidden';
    elapsed.name = '_elapsed';
    form.appendChild(elapsed);
  });

  var widgets = [];

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form.hasAttribute || !form.hasAttribute('data-guard')) return;
    form.querySelector('input[name="_elapsed"]').value = String(Date.now() - loadedAt);

    if (widgets.length && window.turnstile) {
      var token = form.querySelector('input[name="cf-turnstile-response"]');
      if (!token || !token.value) {
        e.preventDefault();
        e.stopImmediatePropagation();
        alert('Just a moment — we are confirming you are not a bot. Please try again in a few seconds.');
        return;
      }
      // Tokens are single-use: grab a fresh one after this submit's FormData is built.
      setTimeout(function () {
        widgets.forEach(function (id) { window.turnstile.reset(id); });
      }, 0);
    }
  }, true);

  fetch('/api/turnstile-config')
    .then(function (res) { return res.ok ? res.json() : {}; })
    .then(function (cfg) {
      if (!cfg || !cfg.siteKey) return;
      window.tjTurnstileReady = function () {
        forms.forEach(function (form) {
          var slot = document.createElement('div');
          slot.className = 'turnstile-slot';
          slot.style.margin = '8px 0 16px';
          var submit = form.querySelector('[type="submit"]');
          submit.parentNode.insertBefore(slot, submit);
          widgets.push(window.turnstile.render(slot, {
            sitekey: cfg.siteKey,
            appearance: 'interaction-only'
          }));
        });
      };
      var s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=tjTurnstileReady';
      s.async = true;
      document.head.appendChild(s);
    })
    .catch(function () {});
})();
