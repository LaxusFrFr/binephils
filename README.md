# Bine Philippines Incorporated - Main Website

This folder contains the source for the main public website for **binephils.com**.

## Files

- `index.html` – entry HTML file for the website.
- `styles.css` – global stylesheet, linked from `index.html`.
- `script.js` – global JavaScript file, linked from `index.html`.

## Run locally with professional form email API

This project now includes backend API endpoints for:

- `POST /api/contact`
- `POST /api/quote`

Both endpoints send:

- Internal notification email to your team inbox.
- Professional acknowledgment email to the customer.

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create `.env` from `.env.example` and set:

- `RESEND_API_KEY`
- `FROM_EMAIL` (must be a verified sender/domain in your provider)
- `CONTACT_TO_EMAIL`
- `QUOTE_TO_EMAIL`

### 3) Start the app

```bash
npm start
```

Open `http://localhost:3000`.

## Production requirements (for inbox delivery and professionalism)

To reduce spam placement and avoid "untrusted" emails:

- Configure domain DNS authentication: SPF, DKIM, and DMARC.
- Use a real monitored sender (example `contact@yourdomain.com`) instead of `no-reply`.
- Keep `Reply-To` pointed correctly so your team can reply directly to the customer.

