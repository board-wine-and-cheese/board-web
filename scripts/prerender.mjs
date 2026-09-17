import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.cwd());
const templatePath = resolve(root, 'dist/index.html');
const serverPath = resolve(root, 'dist-ssr/entry-server.js');
const template = await readFile(templatePath, 'utf8');
const { render } = await import(pathToFileURL(serverPath).href);
const appHtml = render();

if (!template.includes('<div id="root"></div>')) {
  throw new Error('Prerender could not find the root placeholder.');
}

const homeHtml = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
await writeFile(templatePath, homeHtml);

const notFoundDir = resolve(root, 'dist/404');
await mkdir(notFoundDir, { recursive: true });
const notFoundHtml = template
  .replace('<title>Board Wine &amp; Cheese | Wine Bar, Charcuterie &amp; Events in Kittery Maine</title>', '<title>Page Not Found | Board Wine &amp; Cheese</title>')
  .replace('<link rel="canonical" href="https://boardwineandcheese.com/" />', '<meta name="robots" content="noindex,follow" />')
  .replace('<div id="root"></div>', '<main style="font-family:system-ui;padding:4rem 1.5rem;text-align:center"><h1>Page not found</h1><p>The page you requested does not exist.</p><p><a href="/">Return to Board Wine &amp; Cheese</a></p></main>');
await writeFile(resolve(notFoundDir, 'index.html'), notFoundHtml);

await writeFile(resolve(root, 'dist/_redirects'), '/404 /404/index.html 200\n/* /404/index.html 404\n');
console.log('Prerendered the homepage and generated a crawl-safe 404 page.');
