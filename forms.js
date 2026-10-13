/* ============================================================
   FHSN — lead forms (enquiry + shelf-company order)
   Submits <form data-lead="enquiry|shelf"> to /api/lead, shows the
   result in place, and preselects the department from ?dept=…
   ============================================================ */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ?dept=corporate|litigation|property|estates|notarial */
  var want = new URLSearchParams(location.search).get('dept'), sel = document.getElementById('f-dept');
  if (sel && want) {
    Array.prototype.forEach.call(sel.options, function (o) { if (o.value === want) sel.value = want; });
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }

  Array.prototype.forEach.call(document.querySelectorAll('form[data-lead]'), function (form) {
    var btn = $('.submit', form), label = btn && btn.querySelector('span:not(.fill):not(.arrow):not(.plane)');
    var idle = label ? label.textContent : '';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var old = $('.form-err', form); if (old) old.remove();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var fd = new FormData(form), type = form.getAttribute('data-lead');
      var data = { type: type, name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'), message: fd.get('message'),
        dept: fd.get('department'), company: fd.get('company'), hp: fd.get('website') };
      btn.disabled = true; if (label) label.textContent = 'Sending…';
      fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.ok) throw new Error(j.error || 'Something went wrong.'); });
        })
        .then(function () {
          var first = String(data.name || '').trim().split(' ')[0];
          form.innerHTML = '<div class="form-done" role="status"><div class="tick" aria-hidden="true">✓</div><h2>' +
            (type === 'shelf' ? 'Order received' : 'Enquiry sent') + '</h2><p>Thank you' + (first ? ', ' + esc(first) : '') +
            '. We will respond to your ' + (type === 'shelf' ? 'request' : 'enquiry') + ' by email or phone.<br>Need us sooner? Call <a href="tel:+27124240200">+27 12 424 0200</a>.</p></div>';
          form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        })
        .catch(function (err) {
          btn.disabled = false; if (label) label.textContent = idle;
          var box = document.createElement('p'); box.className = 'form-err'; box.setAttribute('role', 'alert');
          box.textContent = err instanceof TypeError ? 'No connection — please check your internet and try again.' : err.message;
          form.appendChild(box);
        });
    });
  });
})();
