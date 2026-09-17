# Cleanup and SEO report

## Removed

- All sample menu, event, review, FAQ, hours, venue, shopping, hero, happy-hour, catering, and private-event fallback content.
- Row-level substitute images and shopping descriptions.
- Legacy pipe-delimited parsers and their runtime parser tests; the site uses the shared Google Sheets CSV parser.
- The unused embedded resOS widget implementation; reservations continue to use the current resOS booking link and modal.
- Unused shopping-category state and configuration.
- Local Netlify cache/build artifacts, Finder metadata, duplicate/stale notes, an unused diagram, the obsolete Deno lockfile, and the unused local menu PDF.

## Data behavior

- CSV-backed content starts empty, so placeholder material cannot flash before Google Sheets loads.
- A successful empty or fully hidden sheet stays empty/hidden.
- A failed sheet is reported in the site-wide availability notice instead of being replaced by plausible content.
- Existing five-minute refresh behavior remains in place. Successful refreshes replace current data; refresh failures are reported without inventing content.

## SEO and performance

- Added server-side prerendering of the homepage and a real 404 response page.
- Added canonical, robots, Open Graph, Twitter, geographic, and expanded Restaurant/BarOrPub structured data.
- Added verified Board Instagram and Facebook profile links.
- Preserved `robots.txt` and `sitemap.xml` for the canonical domain.
- Split the PDF viewer into a lazy-loaded bundle, reducing the main JavaScript bundle substantially.
- Corrected the telephone link to match the displayed Board phone number.
- Added client-rendered FAQPage structured data, a single-open `+` accordion, and automatic expansion of the first FAQ.
- Restored a generic image only for LiveArtists rows whose `mediaURL` is blank.
- Replaced the inactive Wine Club link with a non-clickable coming-soon label while retaining Gift Card purchasing.

## Verification

Run `npm install`, then `npm run build`. The build creates `dist/`, prerenders the homepage, and generates the 404 routing file for Netlify.
