import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const variant = process.argv[2] ?? 'after';
if (!['before', 'after'].includes(variant)) throw Error('Pass before or after');
const root = import.meta.dirname;
const repo = process.env.RAGFLOW_SOURCE_DIR
  ? path.resolve(process.env.RAGFLOW_SOURCE_DIR)
  : path.resolve(root, '../repos', variant === 'before' ? 'ragflow-21029-before' : 'ragflow-21029');
const web = path.join(repo, 'web');
const require = createRequire(path.join(web, 'package.json'));
const { createServer } = await import(pathToFileURL(path.join(web, 'node_modules/vite/dist/node/index.js')));
const { default: react } = await import(pathToFileURL(path.join(web, 'node_modules/@vitejs/plugin-react/dist/index.js')));
const modules = path.join(root, 'harness/node_modules');
if (!fs.existsSync(modules)) fs.symlinkSync(path.join(web, 'node_modules'), modules);
const output = path.resolve(process.env.RAGFLOW_EVIDENCE_DIR ?? path.join(root, '../../outputs/RAGFlow-21029'));
fs.mkdirSync(output, { recursive: true });
const runtimeHome = path.join(root, 'tmp/home');
fs.mkdirSync(runtimeHome, { recursive: true });
const defaults = {};
for (const ref of ['book', 'paper', 'manual']) {
  const tpl = JSON.parse(fs.readFileSync(path.join(repo, `internal/ingestion/pipeline/template/ingestion_pipeline_${ref}.json`), 'utf8'));
  const component = Object.values(tpl.dsl.components).find(c => ['TitleChunker', 'ManualChunker'].includes(c.obj?.component_name));
  defaults[ref] = { ...component.obj.params, table_context_size: 32, image_context_size: 64 };
}
const stored = structuredClone(defaults);
function runGo(template) {
  const binary = process.env.RAGFLOW_EVIDENCE_BIN ?? path.join(root, 'tmp', `${variant}.test`);
  const result = spawnSync(binary, ['-test.run=^TestCaptureTitleContext$'], {
    cwd: repo, encoding: 'utf8', timeout: 20000,
    env: { PATH: process.env.PATH, HOME: runtimeHome, LANG: 'en_US.UTF-8', TZ: 'UTC',
      MEDIA_CONTEXT_JSON: JSON.stringify({ template, params: stored[template] }) },
  });
  if (result.status !== 0) throw Error(result.stderr + result.stdout);
  const line = result.stdout.split('\n').find(line => line.startsWith('EVIDENCE_JSON:'));
  if (!line) throw Error('Missing actual Go result');
  const run = JSON.parse(line.slice('EVIDENCE_JSON:'.length));
  fs.writeFileSync(path.join(output, `${variant}-${template}-last-run.json`), JSON.stringify(run, null, 2) + '\n');
  const suffix = key => Number.isInteger(stored[template][key]) && stored[template][key] >= 0
    ? String(stored[template][key]) : 'omitted';
  fs.writeFileSync(path.join(output, `${variant}-${template}-table${suffix('table_context_size')}-image${suffix('image_context_size')}.json`),
    JSON.stringify(run, null, 2) + '\n');
  return run;
}
const server = await createServer({
  configFile: false, root: path.join(root, 'harness'), publicDir: path.join(web, 'public'),
  plugins: [{
    name: 'title-context-local-fixture',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        if (!url.pathname.startsWith('/fixture/')) return next();
        try {
          const template = url.searchParams.get('template') ?? 'book';
          if (!Object.hasOwn(stored, template)) throw Error('Unknown template');
          if (url.pathname === '/fixture/reset') stored[template] = structuredClone(defaults[template]);
          if (req.method === 'PUT') {
            const pieces = [];
            for await (const part of req) pieces.push(part);
            stored[template] = JSON.parse(Buffer.concat(pieces).toString());
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ variant, config: stored[template], run: runGo(template) }));
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(error) }));
        }
      });
    },
  }, react()],
  resolve: { alias: { '@': path.join(web, 'src'), '@parent': path.dirname(web) }, dedupe: ['react', 'react-dom', 'react-hook-form'] },
  css: {
    postcss: { plugins: [require('tailwindcss')({ ...require('tailwindcss/loadConfig')(path.join(web, 'tailwind.config.js')),
      content: [path.join(web, 'src/**/*.{ts,tsx}'), path.join(root, 'harness/*.tsx')] }), require('autoprefixer')()] },
    modules: { localsConvention: 'camelCase' },
    preprocessorOptions: { less: { javascriptEnabled: true,
      additionalData: '@import "@/less/variable.less"; @import "@/less/mixins.less";',
      modifyVars: { hack: 'true; @import "@/less/index.less";' } } },
  },
  server: { host: '127.0.0.1', port: Number(process.env.RAGFLOW_EVIDENCE_PORT ?? (variant === 'before' ? 51838 : 51839)),
    strictPort: true, fs: { allow: [repo, root, fs.realpathSync(path.join(web, 'node_modules'))] } },
});
await server.listen();
server.printUrls();
