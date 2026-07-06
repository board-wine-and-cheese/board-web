# Integration Notes

## Hosting

- Netlify hosts the Vite build from `dist/`.
- Netlify Functions live in `netlify/functions`.

## Editable content

The site now uses published Google Sheets CSV feeds instead of local CSV files. Table URLs are centralized in:

```text
src/config.js
```

Generic table loading/parsing is handled by:

```text
src/lib/googleSheets.js
```

## Media

- Images: Cloudinary, with automatic `f_auto,q_auto` insertion through `CloudImage`.
- Video: Cloudinary is supported through `cloudinaryVideoUrl`.
- PDFs: Cloudinary PDF delivery is still under review because the account currently blocks PDF public delivery. Until resolved, a local `/pdf/current-menu.pdf` file can remain as a fallback.

## Email

Forms use Resend through:

```text
netlify/functions/send-inquiry.js
```

Required Netlify variables:

```text
RESEND_API_KEY
INQUIRY_TO_EMAIL
INQUIRY_FROM_EMAIL
```

## Reservations

Reservations use the resOS widget in `App.jsx`.

## Commerce

- Ordering / pickup: external Toast or ordering URL.
- Gift cards: Toast eGift card URL.
- Wine club: WineView URL.
- Shopping table separates Wine, Cheese, and SWAG. Only SWAG should be treated as purchasable online unless the business changes that policy.
