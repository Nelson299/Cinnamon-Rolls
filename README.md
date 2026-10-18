# Bakes by El

Cinnamon roll ordering site: weekly order window (Sunday to Thursday 8 PM Central), Saturday 7–11 AM delivery within 20 miles of West Fargo, ND, and payment through Venmo.

It's a plain HTML/CSS/JS site hosted free on GitHub Pages. Orders and email sign-ups go to a Google Sheet through a small Google Apps Script, which also sends the confirmation emails.

## Files

| File | What it is |
|---|---|
| `index.html` | Homepage, including the first-visit email popup |
| `order.html` | Order page. After Thursday 8 PM it switches to "ordering closed" with a countdown |
| `confirmation.html` | Shown after someone taps **Pay with Venmo** |
| `assets/config.js` | **Edit this each week:** flavors, prices, photos, Venmo name, sheet link |
| `assets/style.css`, `assets/site.js` | Look and behavior |
| `images/` | Roll photos |
| `apps-script/Code.gs` | The Google Sheet script (orders, emails) |

## 1. Turn on the website (GitHub Pages)

1. On GitHub, open the repo → **Settings** → **Pages**.
2. Under **Build and deployment**, set **Source: Deploy from a branch**, **Branch: `main`**, folder **`/ (root)`**, then **Save**.
3. After a minute or two the site is live at **https://nelson299.github.io/Cinnamon-Rolls/**

## 2. Connect the order sheet (so orders and emails work)

1. Go to [sheets.new](https://sheets.new) and name the sheet "Bakes by El Orders".
2. Click **Extensions → Apps Script**. Delete what's there, paste in everything from `apps-script/Code.gs`, and click **Save**.
3. Click **Deploy → New deployment**. Click the gear and choose **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy** and allow the permissions it asks for. Google warns that the app isn't verified, because you wrote it yourself: click **Advanced → Go to (project)**.
5. Copy the **Web app URL** (it ends in `/exec`).
6. In `assets/config.js`, paste it between the quotes on the `ordersEndpoint: ''` line, then commit and push.

"Orders" and "Subscribers" tabs appear in the sheet automatically. Each order also emails you and the customer.

**Weekly "ordering is open" email:** in Apps Script, click the clock icon (**Triggers**) → **Add Trigger** → function `sendOrderingOpenEmails`, event source **Time-driven**, **Week timer**, **Every Sunday**, **8am to 9am**.

A regular Gmail account can send about 100 emails a day from a script.

**If you change `Code.gs` later:** **Deploy → Manage deployments → pencil icon → Version: New version → Deploy**. The URL stays the same.

## 3. Each week

In `assets/config.js`:
- Update `flavors`. The Original stays first; gourmet flavors get `price: 4` and `gourmet: true`.
- Put new photos in `images/` and point `img` at them.
- Move old flavors into `pastAndFuture`.

Then commit and push. The site updates in about a minute.

## Payment: Venmo or cash

Customers pick **Venmo** or **Cash** at checkout. Cash orders skip Venmo; the customer is told the full amount is due at delivery, and the sheet's **Payment** column says "Cash at delivery".

On a phone, **Pay with Venmo** opens the Venmo app to @ellinelson1 with the amount and a note like "Oct 3rd Rolls" (that week's delivery date). On a computer, it opens Venmo's website. The site can't see whether someone actually paid: match Venmo payments to the **Name** column and mark **Paid?** in the sheet.
