# Board Web Cleanup Report

## Removed from cleaned ZIP

- .netlify/ local Netlify state/cache and embedded local database files
- .env containing local/private environment values
- all .DS_Store and __MACOSX metadata
- deno.lock, which is not used by this Vite/Netlify project
- netlify/functions/chownow-proxy.js stub
- netlify/functions/wineview-proxy.js stub
- legacy CSV parser functions and parser test block in App.jsx
- stale old resOS test/comment block in App.jsx

## Kept

- src/App.jsx with Google Sheets + Cloudinary integration
- src/config.js with the nine Google Sheets table URLs
- src/lib/googleSheets.js generic CSV table loader
- netlify/functions/send-inquiry.js Resend email function
- public/sitemap.xml and public/robots.txt
- public/icons/favicon.svg and public/icons/icons.svg; index.html now points to /icons/favicon.svg
- public/pdf/current-menu.pdf as temporary PDF fallback while Cloudinary PDF delivery is unresolved

## Important security note

- The uploaded ZIP contained a real Resend API key in `.env`. I removed `.env` from the cleaned ZIP and replaced `.env.example` with placeholders. You should revoke that exposed Resend key and create a new one in Resend/Netlify.

## Suggested next cleanup pass

- Move App.jsx sections into smaller components after the data migration settles.
- Resolve Cloudinary PDF public delivery or choose a separate PDF host.
- Update social preview image paths in index.html if /images/social/share-image.jpg is no longer present.
- Run npm run build locally before deploying.
## Notes

- `App.jsx` still contains local fallback paths for `/images/...` and `/videos/board-hero.mp4`. Because the live content is now coming from Google Sheets/Cloudinary, those are only fallbacks. If you want completely clean fallbacks, either add minimal placeholder files back into `public/` or replace those fallback constants with Cloudinary URLs.
- `index.html` social preview image was updated to a Cloudinary URL because `/images/social/share-image.jpg` was no longer present.
