const http = require('http');
const fs = require('fs');
const path = require('path');

const host = '127.0.0.1';
const port = 4173;
const rootDir = path.resolve(__dirname, '..');
const defaultFile = 'Cutscene Editor.html';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.fnt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8'
};

function send(res, statusCode, headers, body) {
  res.writeHead(statusCode, headers);
  res.end(body);
}

function resolveRequestPath(urlPath) {
  const cleanPath = decodeURIComponent((urlPath || '/').split('?')[0]);
  const normalized = cleanPath === '/' ? `/${defaultFile}` : cleanPath;
  const resolved = path.resolve(rootDir, `.${normalized}`);
  if (!resolved.startsWith(rootDir)) return null;
  return resolved;
}

const server = http.createServer((req, res) => {
  const targetPath = resolveRequestPath(req.url || '/');
  if (!targetPath) {
    send(res, 403, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Forbidden');
    return;
  }

  let filePath = targetPath;
  try {
    const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
    if (stat && stat.isDirectory()) {
      filePath = path.join(filePath, defaultFile);
    }
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    send(res, 500, { 'Content-Type': 'text/plain; charset=utf-8' }, `Server Error: ${err.message}`);
  }
});

server.listen(port, host, () => {
  console.log(`Cutscene Editor server running at http://${host}:${port}/${encodeURIComponent(defaultFile)}`);
  console.log('Keep this window open while using MP4 export.');
});
