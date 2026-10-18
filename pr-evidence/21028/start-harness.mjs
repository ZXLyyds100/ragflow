import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const root = import.meta.dirname;
const web = process.env.RAGFLOW_WEB_DIR
  ? path.resolve(process.env.RAGFLOW_WEB_DIR)
  : fs.existsSync(path.resolve(root, '../../web/package.json'))
    ? path.resolve(root, '../../web')
    : path.resolve(root, '../repos/ragflow/web');
const { createServer } = await import(pathToFileURL(path.join(web, 'node_modules/vite/dist/node/index.js')));
const { default: react } = await import(pathToFileURL(path.join(web, 'node_modules/@vitejs/plugin-react/dist/index.js')));
const require = createRequire(path.join(web, 'package.json'));
fs.mkdirSync(path.join(root, 'logs'), { recursive: true });
if (!fs.existsSync(path.join(root, 'harness/node_modules'))) {
  fs.symlinkSync(path.join(web, 'node_modules'), path.join(root, 'harness/node_modules'), 'dir');
}
const initial = () => ({
  pdf: { parse_method: '00000000-0000-4000-8000-000000000028', output_format: 'json', suffix: ['pdf'],
    mineru_parse_method: 'ocr', mineru_lang: 'Japanese', mineru_formula_enable: false, mineru_table_enable: false },
});
let stored = initial();
const server = await createServer({
  configFile: false, root: path.join(root, 'harness'), publicDir: path.join(web, 'public'),
  plugins: [
    {
      name: 'mineru-local-fixtures',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          let body;
          const url = new URL(req.url, 'http://localhost');
          if (url.pathname === '/api/v1/models') {
            body = { code: 0, data: [{
              model_id: '00000000-0000-4000-8000-000000000028', model_type: ['ocr'],
              name: 'MinerU', provider_id: 'fixture-provider', provider_name: 'MinerU',
              instance_id: 'fixture-instance', instance_name: 'local-fixture', tenant_id: 'fixture-tenant',
            }] };
          } else if (url.pathname === '/fixture/reset') {
            stored = initial(); body = stored;
          } else if (url.pathname === '/fixture/config') {
            if (req.method === 'PUT') {
              const chunks = [];
              for await (const chunk of req) chunks.push(chunk);
              stored = JSON.parse(Buffer.concat(chunks).toString());
              fs.writeFileSync(path.join(root, 'logs', 'browser-last-saved.json'), JSON.stringify(stored, null, 2) + '\n');
            }
            body = stored;
          } else { next(); return; }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(body));
        });
      },
    },
    react(),
  ],
  resolve: {
    alias: { '@': path.join(web, 'src'), '@parent': path.dirname(web) },
    dedupe: ['react', 'react-dom', 'react-hook-form'],
  },
  css: {
    postcss: { plugins: [require('tailwindcss')({ ...require('tailwindcss/loadConfig')(path.join(web, 'tailwind.config.js')),
      content: [path.join(web, 'src/**/*.{ts,tsx}'), path.join(root, 'harness/*.tsx')] }), require('autoprefixer')()] },
    modules: { localsConvention: 'camelCase' },
    preprocessorOptions: { less: { javascriptEnabled: true, additionalData: `
      @import "@/less/variable.less";
      @import "@/less/mixins.less";
    `, modifyVars: { hack: 'true; @import "@/less/index.less";' } } },
  },
  server: { host: '127.0.0.1', port: 51829, strictPort: true, fs: { allow: [path.dirname(web), root] } },
});
await server.listen();
server.printUrls();
