/* ============================================================
   FHSN — site configuration
   The one place for values that are still to be confirmed or supplied.
   Read by the pages (this file also applies them) and by api/lead.js.

   NOTE: anything written here is readable in the browser, like any
   address printed on a web page.
   ============================================================ */
(function (root, factory) {
  var CONFIG = factory();
  if (typeof module === 'object' && module.exports) module.exports = CONFIG;   /* api/lead.js */
  else root.CONFIG = CONFIG;                                                    /* browser */
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    /* Enquiry form → head of the relevant department. Fill each in when the
       addresses are confirmed. While one is empty, that department's enquiries
       go to the fallback address set in Vercel (LEAD_FALLBACK_EMAIL). */
    deptEmails: { corporate: '', litigation: '', property: '', estates: '', notarial: '' },

    /* Shelf-company orders (online order form). */
    shelfEmail: 'millie@fhsn.co.za',

    /* Social links. An empty URL hides that icon. */
    social: {
      facebook: '',   /* new business page to be created — add its URL here */
      instagram: 'https://instagram.com/fhsnattorneys',
      linkedin: ''    /* no company page yet — icon stays hidden */
    },

    /* LOGO SLOT — high-res logo (SVG/EPS-derived SVG or transparent PNG) not received yet.
       Put the file in /assets (e.g. assets/logo.svg) and set src: it replaces the "fhsn"
       wordmark in the header on every page. */
    logo: { src: '', alt: 'Friedland Hart Solomon and Nicolson' },

    /* Team profiles: client has NOT confirmed these sections. Built but hidden. */
    showInterests: false,
    showProfessionalBodies: false,

    /* Headshots the client will supply: { slug: 'assets/people/slug.jpg' }.
       Everyone shows the same placeholder until their slug is listed. */
    headshots: {}
  };
});

/* ---------------- browser only: apply the config ---------------- */
(function () {
  if (typeof document === 'undefined' || typeof CONFIG === 'undefined') return;
  var C = CONFIG, R = document.documentElement;
  if (C.showInterests) R.setAttribute('data-show-interests', '');
  if (C.showProfessionalBodies) R.setAttribute('data-show-bodies', '');

  var ICONS = {
    facebook: ['Facebook', '<path fill="currentColor" d="M13.5 21v-8h2.7l.4-3.2h-3.1V7.8c0-.9.3-1.5 1.6-1.5h1.7V3.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.2v2.3H7.7V13h2.7v8h3.1z"/>'],
    instagram: ['Instagram', '<rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/>'],
    linkedin: ['LinkedIn', '<path fill="currentColor" d="M6.9 9.5H3.8V20h3.1V9.5zM5.3 4.4a1.8 1.8 0 100 3.6 1.8 1.8 0 000-3.6zM20.2 20h-3.1v-5.2c0-1.3-.5-2.1-1.6-2.1-.9 0-1.5.6-1.7 1.2-.1.2-.1.5-.1.8V20h-3.1V9.5h3.1v1.3c.4-.6 1.2-1.5 2.8-1.5 2 0 3.7 1.3 3.7 4.1V20z"/>']
  };
  var ok = function (u) { return /^https?:\/\//i.test(u || ''); };

  function apply() {
    /* social icons — any empty URL is simply not drawn */
    var keys = Object.keys(ICONS).filter(function (k) { return ok(C.social && C.social[k]); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-social]'), function (ul) {
      if (!keys.length) { ul.remove(); return; }
      keys.forEach(function (k) {
        var li = document.createElement('li'), a = document.createElement('a');
        a.href = C.social[k]; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.setAttribute('aria-label', 'FHSN on ' + ICONS[k][0]);
        a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[k][1] + '</svg>';
        li.appendChild(a); ul.appendChild(li);
      });
    });
    /* logo slot */
    if (C.logo && C.logo.src) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-logo-slot]'), function (mark) {
        var word = mark.querySelector('.fhsn'); if (!word) return;
        var img = document.createElement('img');
        img.className = 'logo-img'; img.src = C.logo.src; img.alt = C.logo.alt || '';
        word.replaceWith(img);
      });
    }
    /* headshots */
    Array.prototype.forEach.call(document.querySelectorAll('img[data-headshot]'), function (img) {
      var u = C.headshots && C.headshots[img.getAttribute('data-headshot')];
      if (u) { img.src = u; img.closest('.pfphoto').classList.remove('is-placeholder'); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
})();
