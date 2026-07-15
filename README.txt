Replace these exact files:
  src/App.jsx
  src/config.js
  src/lib/googleSheets.js

This build restores:
- Hero title/subtitle/media loading
- Home table: HappyHour, PrivateParties, Catering
- mediaURL, mediaURL2, mediaURL3 carousels
- FullMenu button text and PDF URL
- LiveArtists Website + Spotify links
- View Full Calendar under Featured Seasonal Events

Then run:
  rm -rf dist
  npm run build
  netlify deploy --prod --dir=dist
