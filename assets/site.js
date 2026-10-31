(function () {
  var B = window.BAKERY;
  var DAY = 86400;

  // ---------- Helpers ----------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function money(n) { return '$' + n.toFixed(2); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key));
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }

  // Current day/time in Central Time, whatever the visitor's own time zone.
  function centralNow() {
    var parts = {};
    new Intl.DateTimeFormat('en-US', {
      timeZone: B.timeZone, weekday: 'short', year: 'numeric', month: 'numeric',
      day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23'
    }).formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return {
      day: days.indexOf(parts.weekday),
      y: +parts.year, m: +parts.month, d: +parts.day,
      secs: (+parts.hour % 24) * 3600 + (+parts.minute) * 60 + (+parts.second)
    };
  }

  function dateLabel(now, addDays) {
    var dt = new Date(Date.UTC(now.y, now.m - 1, now.d + addDays));
    return dt.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' });
  }

  // "Oct 3rd" style date, used in the Venmo note.
  function shortDate(now, addDays) {
    var dt = new Date(Date.UTC(now.y, now.m - 1, now.d + addDays));
    var d = dt.getUTCDate();
    var suffix = (d % 100 >= 11 && d % 100 <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[d % 10] || 'th');
    return dt.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short' }) + ' ' + d + suffix;
  }

  function orderWindow() {
    var now = centralNow();
    var open = now.day < B.closeDay || (now.day === B.closeDay && now.secs < B.closeHour * 3600);
    var untilSunday = ((7 - now.day) % 7 || 7) * DAY - now.secs;
    return {
      open: open,
      deliveryDate: dateLabel(now, 6 - now.day),
      venmoNote: shortDate(now, 6 - now.day) + ' Rolls',
      reopenDate: dateLabel(now, (7 - now.day) % 7 || 7),
      secondsToOpen: untilSunday
    };
  }
  var closeLabel = (B.closeHour > 12 ? B.closeHour - 12 : B.closeHour) + (B.closeHour >= 12 ? ' PM' : ' AM');

  // Sends data to the Google Sheet (see README). Fire-and-forget safe.
  function send(payload) {
    if (!B.ordersEndpoint) {
      console.warn('ordersEndpoint is empty in assets/config.js — nothing was saved.', payload);
      return Promise.resolve(false);
    }
    return fetch(B.ordersEndpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
      keepalive: true
    }).then(function () { return true; }, function () { return false; });
  }

  function venmoLinks(order) {
    var q = 'txn=pay&recipients=' + encodeURIComponent(B.venmoUser) +
      '&amount=' + order.total.toFixed(2) + '&note=' + encodeURIComponent(order.venmoNote);
    return {
      app: 'venmo://paycharge?' + q,
      web: 'https://account.venmo.com/pay?' + q
    };
  }
  function isPhone() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  }
  // Opens Venmo with the amount filled in. Returns true if it tried the app.
  function openVenmo(order) {
    var links = venmoLinks(order);
    if (isPhone()) { window.location.href = links.app; return true; }
    window.open(links.web, '_blank', 'noopener');
    return false;
  }

  // ---------- Email sign-up forms (popup, band, closed page) ----------
  function wireSignup(form, onDone) {
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = form.querySelector('input[type=email]');
      var msg = form.parentNode.querySelector('.form-msg');
      if (!input.checkValidity()) { input.reportValidity(); return; }
      send({ type: 'subscribe', email: input.value.trim() });
      store('bbe-subscribed', true);
      input.value = '';
      if (msg) msg.textContent = "You're on the list! We'll email you when ordering opens.";
      if (onDone) onDone();
    });
  }

  // ---------- Status pills ----------
  function paintStatus(w) {
    document.querySelectorAll('[data-status]').forEach(function (el) {
      el.className = 'pill ' + (w.open ? 'pill-open' : 'pill-closed');
      el.textContent = w.open
        ? 'Ordering is open · closes Thursday at ' + closeLabel
        : 'Ordering is closed · reopens ' + w.reopenDate;
    });
    document.querySelectorAll('[data-close-label]').forEach(function (el) { el.textContent = closeLabel; });
  }

  // ---------- Pop-up week ----------
  function popUpOn() { return !!(B.popUp && B.popUp.enabled); }
  function popUpLine() { var p = B.popUp; return p.place + ' · ' + p.date + ' · ' + p.time; }

  function popUpBanner() {
    var bar = document.createElement('a');
    bar.className = 'popup-banner';
    bar.href = 'index.html#popup';
    bar.innerHTML = '<b>No deliveries this week.</b> Visit me at ' + esc(B.popUp.place) +
      ', ' + esc(B.popUp.date) + ', ' + esc(B.popUp.time);
    document.body.insertBefore(bar, document.body.firstChild);
  }

  function popUpHome() {
    var p = B.popUp;
    $('.hero').id = 'popup';
    $('.hero-text').innerHTML =
      '<span class="pill pill-closed">No deliveries this week</span>' +
      '<h1>Come see me at the <em>' + esc(p.place) + '</em> pop-up.</h1>' +
      '<p>I\'m skipping delivery this week and baking for a pop-up instead. Stop by, say hi, and take rolls home. Online ordering is closed.</p>' +
      '<div class="popup-card"><span class="popup-card-label">Pop-up details</span>' +
      '<div><b>' + esc(p.date) + '</b></div><div>' + esc(p.time) + '</div><div>' + esc(p.place) + '</div></div>' +
      '<div class="hero-buttons"><a class="btn btn-primary" href="#flavors">See this week\'s flavors</a></div>';

    var head = $('.site-header .btn');
    head.textContent = 'Pop-up details';
    head.setAttribute('href', '#popup');
    var how = $('#how'); if (how) how.remove();
    var howLink = $('.nav a[href="#how"]'); if (howLink) howLink.remove();
    $('#flavors .section-head h2').textContent = 'Flavors at the pop-up';

    var faq = $('.faq');
    faq.innerHTML =
      '<div class="faq-item"><h3>Is there delivery this week?</h3><p>No. This week I\'m at the ' + esc(p.place) + ' pop-up instead. Normal Saturday deliveries return soon.</p></div>' +
      '<div class="faq-item"><h3>Where and when is the pop-up?</h3><p>' + esc(p.place) + ', ' + esc(p.date) + ', ' + esc(p.time) + '.</p></div>' +
      '<div class="faq-item"><h3>Can I order online?</h3><p>Not this week. Just come by the pop-up and pick out your rolls.</p></div>' +
      '<div class="faq-item"><h3>How do I keep and reheat them?</h3><p>They stay fresh for up to 2 days. Keep them in the fridge since the icing has cream cheese. Warm one in the microwave for 15–30 seconds.</p></div>';

    $('.footer-info span').textContent = 'Pop-up this week · ' + p.place + ' · ' + p.date + ' · West Fargo, ND';

    // Announcement popup replaces the email sign-up popup.
    var body = $('#signup-modal .modal-body');
    body.innerHTML =
      '<h2 id="popup-title">No deliveries <span class="accent-em">this week</span></h2>' +
      '<p>Find me at <b>' + esc(p.place) + '</b><br>' + esc(p.date) + ' · ' + esc(p.time) + '</p>' +
      '<button type="button" class="btn btn-primary" data-close>Got it</button>';
  }

  // ---------- Homepage ----------
  function initHome(w) {
    if (popUpOn()) popUpHome();
    var list = $('#flavor-list');
    list.innerHTML = B.flavors.map(function (f) {
      return '<article class="flavor' + (f.gourmet ? ' gourmet' : '') + '">' +
        (f.gourmet ? '<span class="badge">Gourmet</span>' : '') +
        (f.img
          ? '<img src="' + esc(f.img) + '" alt="' + esc(f.name) + ' cinnamon rolls" loading="lazy">'
          : '<div class="photo-soon">Photo coming soon</div>') +
        '<span class="eyebrow">' + (f.gourmet ? 'This week only' : 'The original') + '</span>' +
        '<h3>' + esc(f.name) + '</h3>' +
        '<p>' + esc(f.desc) + '</p>' +
        '<div class="flavor-details"><span><b>Ingredients:</b> ' + esc(f.ingredients) + '</span>' +
        '<span><b>Contains:</b> ' + esc(f.allergens) + '</span></div>' +
        '<span class="price">$' + f.price + ' <small>per roll</small></span>' +
        '</article>';
    }).join('');

    $('#gallery').innerHTML = B.pastAndFuture.map(function (f) {
      return '<div class="gallery-card">' +
        (f.img
          ? '<img src="' + esc(f.img) + '" alt="' + esc(f.name) + ' cinnamon rolls" loading="lazy">'
          : '<div class="photo-soon square">Photo coming soon</div>') +
        '<span>' + esc(f.name) + '</span></div>';
    }).join('');

    wireSignup($('#notify-form'));

    // First-visit popup
    var modal = $('#signup-modal');
    var seenKey = popUpOn() ? 'bbe-popup-note-seen' : 'bbe-popup-seen';
    if (!store(seenKey) && (popUpOn() || !store('bbe-subscribed'))) {
      setTimeout(function () {
        modal.classList.remove('hidden');
        var email = $('#popup-email');
        if (email) email.focus();
      }, 1200);
    }
    function closeModal() {
      modal.classList.add('hidden');
      store(seenKey, true);
    }
    modal.addEventListener('click', function (e) {
      if (e.target === modal || e.target.closest('[data-close]')) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
    });
    if (!popUpOn()) wireSignup($('#popup-form'), function () { setTimeout(closeModal, 1400); });
  }

  // ---------- Order page ----------
  function initOrder(w) {
    if (popUpOn()) {
      var p = B.popUp;
      $('#order-open').classList.add('hidden');
      var box = $('#order-closed');
      box.classList.remove('hidden');
      box.innerHTML =
        '<span class="pill pill-closed">No deliveries this week</span>' +
        '<h1>Online ordering is closed. <span class="accent-em">Come see me at ' + esc(p.place) + '!</span></h1>' +
        '<p>This week I\'m at a pop-up instead of delivering: <b>' + esc(p.date) + ', ' + esc(p.time) + '</b> at ' + esc(p.place) + '.</p>' +
        '<div><a class="btn btn-primary" href="index.html#flavors">See this week\'s flavors</a></div>';
      return;
    }
    if (!w.open) {
      $('#order-open').classList.add('hidden');
      $('#order-closed').classList.remove('hidden');
      $('#reopen-date').textContent = w.reopenDate;
      wireSignup($('#closed-form'));
      var left = w.secondsToOpen;
      var tick = function () {
        $('#cd-days').textContent = Math.floor(left / DAY);
        $('#cd-hours').textContent = Math.floor(left % DAY / 3600);
        $('#cd-mins').textContent = Math.floor(left % 3600 / 60);
        left -= 60;
        if (left <= 0) window.location.reload();
      };
      tick();
      setInterval(tick, 60000);
      return;
    }

    $('#delivery-date').textContent = w.deliveryDate;
    var qty = {};
    var menu = $('#menu');
    menu.innerHTML = B.flavors.map(function (f) {
      qty[f.id] = 0;
      return '<div class="menu-item">' +
        (f.img ? '<img src="' + esc(f.img) + '" alt="">' : '<div class="photo-soon small" aria-hidden="true"></div>') +
        '<div class="menu-info"><span class="eyebrow' + (f.gourmet ? ' g' : '') + '">' + (f.gourmet ? 'Gourmet' : 'The original') + '</span>' +
        '<strong>' + esc(f.name) + '</strong><span>' + esc(f.desc) + '</span>' +
        '<span class="each">$' + f.price + ' each</span></div>' +
        '<div class="stepper" data-id="' + f.id + '">' +
        '<button type="button" data-step="-1" aria-label="Remove one ' + esc(f.name) + '">−</button>' +
        '<output aria-live="polite" aria-label="' + esc(f.name) + ' quantity">0</output>' +
        '<button type="button" class="plus" data-step="1" aria-label="Add one ' + esc(f.name) + '">+</button>' +
        '</div></div>';
    }).join('');

    function totals() {
      var total = 0, count = 0, items = [];
      B.flavors.forEach(function (f) {
        var q = qty[f.id];
        if (q > 0) {
          total += q * f.price; count += q;
          items.push({ id: f.id, name: f.name, qty: q, price: f.price });
        }
      });
      return { total: total, count: count, items: items };
    }

    function render() {
      var t = totals();
      $('#summary-lines').innerHTML = t.items.length
        ? t.items.map(function (i) {
            return '<div class="summary-line"><span>' + i.qty + ' × ' + esc(i.name) + '</span><span>' + money(i.qty * i.price) + '</span></div>';
          }).join('')
        : '<p class="muted">Add some rolls to get started.</p>';
      $('#count').textContent = '(' + t.count + (t.count === 1 ? ' roll)' : ' rolls)');
      $('#total').textContent = money(t.total);
      var method = payment();
      var cash = method === 'cash';
      var btn = $('#pay-btn');
      btn.className = 'btn ' + (cash ? 'btn-cash' : 'btn-venmo');
      $('#pay-label').textContent = !method
        ? 'Select a payment type'
        : cash ? 'Place order' : 'Pay ' + money(t.total) + ' with Venmo';
      $('#pay-fine').innerHTML = method === 'venmo'
        ? 'Opens Venmo to <b>@' + esc(B.venmoUser) + '</b> with your total filled in. Just tap Pay.'
        : '';
      $('#cash-note').classList.toggle('hidden', !cash);
      document.querySelectorAll('.cash-amount').forEach(function (el) { el.textContent = money(t.total); });
      document.querySelectorAll('.cash-date').forEach(function (el) { el.textContent = w.deliveryDate; });
      btn.disabled = t.count === 0 || !method;
    }

    function payment() {
      var picked = document.querySelector('input[name=payment]:checked');
      return picked ? picked.value : '';
    }
    document.querySelectorAll('input[name=payment]').forEach(function (r) {
      r.addEventListener('change', render);
    });

    menu.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-step]');
      if (!btn) return;
      var box = btn.parentNode;
      var id = box.getAttribute('data-id');
      qty[id] = Math.max(0, Math.min(99, qty[id] + Number(btn.getAttribute('data-step'))));
      box.querySelector('output').textContent = qty[id];
      render();
    });
    render();

    var form = $('#order-form');

    // Repeat customers: fill in what they used last time on this device.
    // Saved only in their own browser, never on the public site.
    var FIELDS = ['name', 'phone', 'email', 'street', 'apt', 'city', 'zip', 'notes'];
    var saved = store('bbe-customer');
    if (saved && saved.name) {
      FIELDS.forEach(function (k) { if (saved[k]) form.elements[k].value = saved[k]; });
      if (saved.payment) {
        var radio = document.querySelector('input[name=payment][value="' + saved.payment + '"]');
        if (radio) { radio.checked = true; render(); }
      }
      $('#welcome-name').textContent = saved.name.split(' ')[0];
      $('#welcome-back').classList.remove('hidden');
    }
    $('#forget-me').addEventListener('click', function () {
      try { localStorage.removeItem('bbe-customer'); } catch (e) {}
      FIELDS.forEach(function (k) { form.elements[k].value = ''; });
      $('#welcome-back').classList.add('hidden');
      form.elements.name.focus();
    });

    $('#pay-btn').addEventListener('click', function () {
      var err = $('#pay-error');
      err.textContent = '';
      var t = totals();
      if (t.count === 0) { err.textContent = 'Add at least one roll.'; return; }
      if (!payment()) { err.textContent = 'Choose Venmo or cash.'; return; }
      if (!form.reportValidity()) { err.textContent = 'Please fill in your delivery details.'; return; }
      if (!orderWindow().open) { window.location.reload(); return; }

      var data = new FormData(form);
      var order = {
        type: 'order',
        placedAt: new Date().toISOString(),
        name: data.get('name').trim(),
        phone: data.get('phone').trim(),
        email: data.get('email').trim(),
        street: data.get('street').trim(),
        apt: data.get('apt').trim(),
        city: data.get('city').trim(),
        zip: data.get('zip').trim(),
        notes: data.get('notes').trim(),
        items: t.items,
        count: t.count,
        total: t.total,
        deliveryDate: w.deliveryDate,
        venmoNote: w.venmoNote,
        payment: payment()
      };
      store('bbe-last-order', order);
      if ($('#remember-me').checked) {
        var me = { payment: order.payment };
        FIELDS.forEach(function (k) { me[k] = order[k]; });
        store('bbe-customer', me);
      } else {
        try { localStorage.removeItem('bbe-customer'); } catch (e) {}
      }
      send(order);
      if (order.payment === 'cash') {
        // Give the order a moment to send before leaving the page.
        setTimeout(function () { window.location.href = 'confirmation.html'; }, 400);
        return;
      }
      var triedApp = openVenmo(order);
      // Leave time for the Venmo app to open, then show the confirmation
      // page so it's waiting when they come back.
      setTimeout(function () { window.location.href = 'confirmation.html'; }, triedApp ? 1500 : 300);
    });
  }

  // ---------- Confirmation page ----------
  function initConfirmation() {
    var o = store('bbe-last-order');
    if (!o) {
      $('#confirm-found').classList.add('hidden');
      $('#confirm-missing').classList.remove('hidden');
      return;
    }
    $('#c-name').textContent = o.name.split(' ')[0];
    $('#c-note').textContent = o.venmoNote;
    $('#c-email').textContent = o.email;
    $('#c-date').textContent = o.deliveryDate;
    $('#c-address').innerHTML = esc(o.street) + (o.apt ? ', ' + esc(o.apt) : '') + '<br>' + esc(o.city) + ' ' + esc(o.zip);
    document.querySelectorAll('.c-total').forEach(function (el) { el.textContent = money(o.total); });
    $('#c-lines').innerHTML = o.items.map(function (i) {
      return '<div class="summary-line"><span>' + i.qty + ' × ' + esc(i.name) + '</span><span>' + money(i.qty * i.price) + '</span></div>';
    }).join('');
    $('#c-count').textContent = '(' + o.count + (o.count === 1 ? ' roll)' : ' rolls)');
    if (o.payment === 'cash') {
      $('#c-pay-venmo').classList.add('hidden');
      $('#c-pay-cash').classList.remove('hidden');
      $('#c-cash-date').textContent = o.deliveryDate;
    } else {
      $('#venmo-again').addEventListener('click', function () { openVenmo(o); });
    }
  }

  // ---------- Boot ----------
  var w = orderWindow();
  paintStatus(w);
  if (popUpOn() && document.body.getAttribute('data-page') !== 'confirmation') popUpBanner();
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  var page = document.body.getAttribute('data-page');
  if (page === 'home') initHome(w);
  if (page === 'order') initOrder(w);
  if (page === 'confirmation') initConfirmation();
})();
