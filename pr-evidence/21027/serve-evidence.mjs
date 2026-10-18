import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
const root = import.meta.dirname;
const outputs = path.resolve(process.env.TENANT_PARSER_CAPTURES ?? path.join(root, '../../outputs/RAGFlow-21027'));
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  const file = pathname === '/' ? path.join(root, 'evidence.html')
    : pathname === '/verified.webm' ? path.join(outputs, 'tenant-parser-verified.webm')
    : /^\/captures\/(?:before|after)-(?:somark|opendataloader)-(?:id|composite)\.json$/.test(pathname)
      ? path.join(outputs, path.basename(pathname)) : null;
  if (!file || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', file.endsWith('.json') ? 'application/json'
    : file.endsWith('.webm') ? 'video/webm' : 'text/html;charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(fs.readFileSync(file));
});
server.listen(Number(process.env.TENANT_PARSER_PORT ?? 51847), '127.0.0.1', () => console.log('Evidence page: http://127.0.0.1:51847'));
