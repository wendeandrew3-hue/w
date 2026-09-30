# GadgetGrub Store

Kitchen gadget store with user accounts.

## Files
1. index.html - store front (home page)
2. checkout.html - blank checkout page (paste your payment code in the marked box)
3. login.html / signup.html / account.html - user accounts
4. server.js - Node backend (accounts, sessions, serves the pages)
5. package.json - dependencies (express only)

## Run locally
1. Install Node.js 18 or newer
2. In this folder run: `npm install`
3. Then: `npm start`
4. Open http://localhost:3000

## Deploy free (Render)
1. Create an account at render.com
2. New + Web Service, connect your repo or upload this folder
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variable SESSION_SECRET (any long random string)
6. Deploy, you get a live https URL

## Notes
1. Passwords are hashed with scrypt, never stored as plain text
2. User database lives in data/users.json (created on first signup)
3. The checkout page is intentionally blank: paste your payment provider's code (e.g. Stripe Payment Link button) inside the marked box
4. Store name is "GadgetGrub" - change it in one place per file if you rename
