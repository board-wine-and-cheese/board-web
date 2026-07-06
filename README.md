# Board Wine & Cheese Website

React + Vite + Tailwind site deployed on Netlify.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
netlify deploy --prod
```

## Content model

Editable website content is loaded from published Google Sheets CSV endpoints in:

```text
src/config.js
src/lib/googleSheets.js
```

Media is managed primarily through Cloudinary. Local static files that remain in `public/` are copied into the Vite build unchanged.

## Netlify Functions

The contact, catering, private events, and jobs forms post to:

```text
netlify/functions/send-inquiry.js
```

Required Netlify environment variables:

```text
RESEND_API_KEY
INQUIRY_TO_EMAIL
INQUIRY_FROM_EMAIL
```
