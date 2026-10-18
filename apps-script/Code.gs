/**
 * Bakes by El — order + email sign-up backend.
 *
 * Paste this whole file into Extensions → Apps Script of a Google Sheet,
 * then Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 * Full steps are in README.md.
 */

var SITE_URL = 'https://nelson299.github.io/Cinnamon-Rolls/';
var BAKERY = 'Bakes by El';
var VENMO = 'ellinelson1';
var TEXT_NUMBER = '(701) 306-9643';
var TZ = 'America/Chicago';
var CLOSE_DAY = 4;   // 0 = Sunday ... 4 = Thursday
var CLOSE_HOUR = 20; // 8 PM
var DISCLAIMER = 'This product is made in a home kitchen that is not inspected by the state or local health department. ' +
  BAKERY + ' products are not certified, labeled, licensed, packaged, regulated, or inspected.';

// Prices are checked here too, so nobody can change them in their browser.
function priceFor_(id) { return id === 'original' ? 3 : 4; }

function doPost(e) {
  var data;
  try { data = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad request' }); }
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (data.type === 'subscribe') return json_(subscribe_(data));
    if (data.type === 'order') return json_(order_(data));
    return json_({ ok: false, error: 'unknown type' });
  } finally {
    lock.releaseLock();
  }
}

// Unsubscribe links in reminder emails land here.
function doGet(e) {
  var email = (e.parameter.unsubscribe || '').toLowerCase();
  if (email) {
    var sh = sheet_('Subscribers', ['Signed up', 'Email', 'Status']);
    var rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][1]).toLowerCase() === email) sh.getRange(i + 1, 3).setValue('unsubscribed');
    }
    return HtmlService.createHtmlOutput('<p style="font-family:sans-serif">You\'re unsubscribed from ' + BAKERY + ' emails.</p>');
  }
  return HtmlService.createHtmlOutput('<p style="font-family:sans-serif">' + BAKERY + ' order system is running.</p>');
}

function subscribe_(d) {
  var email = String(d.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'bad email' };
  var sh = sheet_('Subscribers', ['Signed up', 'Email', 'Status']);
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).toLowerCase() === email) {
      sh.getRange(i + 1, 3).setValue('subscribed');
      return { ok: true };
    }
  }
  sh.appendRow([new Date(), email, 'subscribed']);
  return { ok: true };
}

function isOpen_() {
  var now = new Date();
  var day = Number(Utilities.formatDate(now, TZ, 'u')) % 7; // 0 = Sunday
  var hour = Number(Utilities.formatDate(now, TZ, 'H'));
  return day < CLOSE_DAY || (day === CLOSE_DAY && hour < CLOSE_HOUR);
}

function order_(d) {
  if (!isOpen_()) return { ok: false, error: 'closed' };
  var items = (d.items || []).filter(function (i) { return i.qty > 0; });
  if (!items.length || !d.email || !d.name) return { ok: false, error: 'missing info' };

  var total = 0, count = 0;
  var lines = items.map(function (i) {
    var qty = Math.min(99, Math.max(0, Math.floor(Number(i.qty))));
    var price = priceFor_(i.id);
    total += qty * price;
    count += qty;
    return { name: String(i.name), qty: qty, price: price };
  });

  var address = [d.street, d.apt].filter(String).join(', ') + ', ' + d.city + ' ' + d.zip;
  var summary = lines.map(function (l) { return l.qty + ' × ' + l.name; }).join(', ');

  var note = String(d.venmoNote || (d.deliveryDate + ' Rolls')).slice(0, 60);
  var cash = d.payment === 'cash';
  var sh = sheet_('Orders', ['Placed', 'Name', 'Phone', 'Email', 'Address', 'Delivery notes',
    'Rolls', 'Count', 'Total', 'Payment', 'Delivery date', 'Paid?', 'Delivered?']);
  appendByHeader_(sh, {
    'Placed': new Date(), 'Name': d.name, 'Phone': d.phone, 'Email': d.email, 'Address': address,
    'Delivery notes': d.notes || '', 'Rolls': summary, 'Count': count, 'Total': total,
    'Payment': cash ? 'Cash at delivery' : 'Venmo', 'Delivery date': d.deliveryDate
  });

  // Email the customer
  MailApp.sendEmail({
    to: d.email,
    subject: 'Your cinnamon rolls are ordered!',
    htmlBody: confirmationEmail_(d, lines, total, count, address, note, cash),
    name: BAKERY
  });

  // Email Elli
  MailApp.sendEmail({
    to: Session.getEffectiveUser().getEmail(),
    subject: 'New order — ' + d.name + ' — $' + total.toFixed(2) + (cash ? ' CASH' : ' Venmo'),
    body: d.name + ' ordered ' + summary + ' ($' + total.toFixed(2) + ').\n\n' +
      'Deliver ' + d.deliveryDate + ' to: ' + address + '\n' +
      'Phone: ' + d.phone + '\nEmail: ' + d.email + '\nNotes: ' + (d.notes || '—') + '\n\n' +
      (cash
        ? 'PAYING CASH: collect $' + total.toFixed(2) + ' at delivery.'
        : 'Check Venmo for a payment from ' + d.name + ' with the note "' + note + '".')
  });

  return { ok: true, total: total };
}

function confirmationEmail_(d, lines, total, count, address, note, cash) {
  var venmoLink = 'https://account.venmo.com/pay?txn=pay&recipients=' + VENMO +
    '&amount=' + total.toFixed(2) + '&note=' + encodeURIComponent(note);
  var rows = lines.map(function (l) {
    return '<tr><td style="padding:4px 0">' + l.qty + ' × ' + esc_(l.name) + '</td>' +
      '<td style="padding:4px 0;text-align:right">$' + (l.qty * l.price).toFixed(2) + '</td></tr>';
  }).join('');
  return '' +
    '<div style="background:#F4EEF3;padding:24px 12px;font-family:Helvetica,Arial,sans-serif;color:#3B2A3F">' +
    '<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden">' +
    '<div style="background:#FCE4EC;padding:22px 28px;font-family:Georgia,serif;font-size:20px;font-weight:bold">' + BAKERY + '</div>' +
    '<div style="padding:28px">' +
    '<h1 style="font-family:Georgia,serif;font-size:26px;margin:0 0 10px">Hi ' + esc_(d.name.split(' ')[0]) + ', your rolls are <i style="color:#C2376A">on the list!</i></h1>' +
    '<p style="color:#6B5570;margin:0 0 20px">Thanks for ordering. Here\'s everything you need to know about your order.</p>' +
    '<div style="background:#E6F3FC;border-radius:14px;padding:16px 18px;margin-bottom:18px">' +
    '<div style="font-size:12px;font-weight:bold;letter-spacing:.06em;text-transform:uppercase;color:#1F4E73">Delivery</div>' +
    '<div style="font-weight:bold;margin:6px 0">' + esc_(d.deliveryDate) + ' · between 7 and 11 AM</div>' +
    '<div>' + esc_(address) + '</div>' +
    (d.notes ? '<div style="color:#6B5570;margin-top:4px">Notes: ' + esc_(d.notes) + '</div>' : '') +
    '<div style="color:#6B5570;margin-top:4px">Not home? We\'ll leave them on your front step.</div>' +
    '</div>' +
    '<table style="width:100%;border-collapse:collapse;font-size:15px">' + rows +
    '<tr><td style="border-top:1px dashed #E3D3E6;padding-top:10px;font-weight:bold">Total (' + count + (count === 1 ? ' roll' : ' rolls') + ')</td>' +
    '<td style="border-top:1px dashed #E3D3E6;padding-top:10px;text-align:right;font-weight:bold;font-size:20px">$' + total.toFixed(2) + '</td></tr></table>' +
    '<div style="background:#FCE4EC;border-radius:14px;padding:16px 18px;margin-top:18px">' +
    '<div style="font-size:12px;font-weight:bold;letter-spacing:.06em;text-transform:uppercase;color:#7A1F44">Payment</div>' +
    (cash
      ? '<p style="margin:6px 0 0"><b>Cash at delivery:</b> your total of <b>$' + total.toFixed(2) + '</b> is due in cash when your rolls arrive on ' + esc_(d.deliveryDate) + '. Please have exact change ready.</p>'
      : '<p style="margin:6px 0 12px">Pay <b>$' + total.toFixed(2) + '</b> on Venmo to <b>@' + VENMO + '</b> with the note "' + esc_(note) + '". If you already paid, you\'re all set!</p>' +
        '<a href="' + venmoLink + '" style="display:inline-block;background:#0074DE;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">Pay with Venmo</a>') +
    '</div>' +
    '<p style="color:#6B5570;margin:18px 0 0">Keep them in the fridge and enjoy within 2 days. Warm one in the microwave for 15–30 seconds.</p>' +
    '<p style="color:#6B5570;margin:10px 0 0">Questions or changes? Text Elli at ' + TEXT_NUMBER + '.</p>' +
    '</div>' +
    '<div style="background:#EAF7F0;padding:16px 28px;font-size:12px;color:#22603F">' + BAKERY + ' · West Fargo, ND<br>' + DISCLAIMER + '</div>' +
    '</div></div>';
}

/**
 * Emails everyone on the list that ordering is open.
 * Set it to run automatically: Triggers (clock icon) → Add Trigger →
 * sendOrderingOpenEmails → Time-driven → Week timer → Every Sunday → 8am to 9am.
 */
function sendOrderingOpenEmails() {
  var sh = sheet_('Subscribers', ['Signed up', 'Email', 'Status']);
  var rows = sh.getDataRange().getValues();
  var webAppUrl = ScriptApp.getService().getUrl();
  for (var i = 1; i < rows.length; i++) {
    var email = String(rows[i][1]);
    if (!email || rows[i][2] === 'unsubscribed') continue;
    if (MailApp.getRemainingDailyQuota() < 5) break;
    var unsub = webAppUrl + '?unsubscribe=' + encodeURIComponent(email);
    MailApp.sendEmail({
      to: email,
      subject: 'Cinnamon roll ordering is open!',
      name: BAKERY,
      htmlBody:
        '<div style="font-family:Helvetica,Arial,sans-serif;color:#3B2A3F;max-width:520px;margin:0 auto;padding:24px">' +
        '<h1 style="font-family:Georgia,serif;font-size:26px">Ordering is open for this Saturday!</h1>' +
        '<p style="color:#6B5570">Order by Thursday at 8 PM for delivery Saturday between 7 and 11 AM.</p>' +
        '<p><a href="' + SITE_URL + '" style="display:inline-block;background:#C2376A;color:#fff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:999px">See this week\'s flavors</a></p>' +
        '<p style="font-size:12px;color:#6B5570;margin-top:28px">' + DISCLAIMER + '<br>' +
        '<a href="' + unsub + '" style="color:#6B5570">Unsubscribe</a></p></div>'
    });
  }
}

function sheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sh;
}

// Writes a row by column name, so older sheets missing a column (like
// "Payment") get it added at the end instead of shifting everything over.
function appendByHeader_(sh, values) {
  var lastCol = sh.getLastColumn();
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  Object.keys(values).forEach(function (k) {
    if (headers.indexOf(k) === -1) {
      headers.push(k);
      sh.getRange(1, headers.length).setValue(k).setFontWeight('bold');
    }
  });
  sh.appendRow(headers.map(function (h) { return values.hasOwnProperty(h) ? values[h] : ''; }));
}

function esc_(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
