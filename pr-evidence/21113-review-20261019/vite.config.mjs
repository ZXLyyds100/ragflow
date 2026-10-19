import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const Root = path.dirname(fileURLToPath(import.meta.url));
const Repo = process.env.RAGFLOW_REPO;
if (!Repo) throw new Error('RAGFLOW_REPO is required');
const Web = path.join(Repo, 'web');
const Src = path.join(Web, 'src');
const requireWeb = createRequire(path.join(Web, 'package.json'));
const { defineConfig } = requireWeb('vite');
const react = requireWeb('@vitejs/plugin-react').default;
const tailwind = requireWeb('tailwindcss');
const autoprefixer = requireWeb('autoprefixer');
// The repo config is CommonJS in a type:module package; evaluate it in memory
// with its own require, without renaming it or generating a repo cache file.
const TailwindModule = { exports: {} };
new Function('require', 'module', 'exports',
  readFileSync(path.join(Web, 'tailwind.config.js'), 'utf8'),
)(requireWeb, TailwindModule, TailwindModule.exports);
const TailwindConfig = TailwindModule.exports;

const SyntheticModels = [
  {
    model_id: 'synthetic-paddle-ocr',
    name: 'PP-OCRv5',
    model_type: ['ocr'],
    provider_id: 'synthetic-paddle-provider',
    provider_name: 'PaddleOCR',
    instance_id: 'synthetic-cloud',
    instance_name: 'Review cloud',
  },
  {
    model_id: 'synthetic-paddle-local-ocr',
    name: 'PP-OCRv5 local',
    model_type: ['ocr'],
    provider_id: 'synthetic-local-provider',
    provider_name: 'PaddleOCR.local',
    instance_id: 'synthetic-local',
    instance_name: 'Review local',
  },
  {
    model_id: 'synthetic-other-ocr',
    name: 'Other OCR (must be filtered)',
    model_type: ['ocr'],
    provider_id: 'synthetic-other-provider',
    provider_name: 'Other',
    instance_id: 'synthetic-other',
    instance_name: 'Review other',
  },
];

function reviewFixture() {
  let Mode = 'models';
  let Pending = [];
  let Requests = [];
  function reply(res, status, payload) {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify(payload));
  }
  function answer(res, mode) {
    if (mode === 'http-error') {
      reply(res, 503, { code: 100, message: 'Synthetic HTTP model failure' });
    } else if (mode === 'business-error') {
      // Mirrors the real Go API envelope: error code at HTTP 200, no data.
      reply(res, 200, { code: 100, message: 'Synthetic Go business failure' });
    } else {
      reply(res, 200, { code: 0, data: mode === 'empty' ? [] : SyntheticModels });
    }
  }
  return {
    name: 'explicit-synthetic-http-fixture',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url, 'http://127.0.0.1');
        if (url.pathname === '/__fixture/control') {
          const release = url.searchParams.get('release');
          if (release) {
            const held = Pending;
            Pending = [];
            Mode = release;
            for (const response of held) {
              if (!response.destroyed) answer(response, release);
            }
          } else {
            Mode = url.searchParams.get('mode') || 'models';
            Requests = [];
          }
          reply(res, 200, { mode: Mode, pending: Pending.length });
          return;
        }
        if (url.pathname === '/__fixture/requests') {
          reply(res, 200, { mode: Mode, pending: Pending.length, requests: Requests });
          return;
        }
        if (url.pathname === '/api/v1/models') {
          Requests.push({
            path: url.pathname,
            type: url.searchParams.get('type'),
            tenant_id: url.searchParams.get('tenant_id'),
            mode: Mode,
          });
          if (Mode === 'hold') {
            Pending.push(res);
            res.on('close', () => { Pending = Pending.filter((item) => item !== res); });
          } else {
            answer(res, Mode);
          }
          return;
        }
        // No real backend proxy, authentication, remote API, or save endpoint.
        next();
      });
    },
  };
}

function boundaryAliases() {
  const ImageFile = path.join(Src, 'pages/agent/form/parser-form/image-form-fields.tsx');
  const BaselineFile = path.join(Root, 'src/baseline/image-form-fields.tsx');
  return {
    name: 'review-boundaries-only',
    enforce: 'pre',
    resolveId(source, importer) {
      const clean = importer?.split('?')[0];
      if (source === '../../context' && [ImageFile, BaselineFile].includes(clean)) {
        return path.join(Root, 'src/fixtures/owner.tsx');
      }
      if (source === './utils' && [ImageFile, BaselineFile].includes(clean)) {
        return path.join(Root, 'src/fixtures/field-path.ts');
      }
    },
  };
}

export default defineConfig({
  root: Root,
  cacheDir: path.join(Root, '.vite-cache'),
  plugins: [boundaryAliases(), react(), reviewFixture()],
  resolve: {
    alias: [
      { find: '@/hooks/use-llm-request', replacement: path.join(Root, 'src/fixtures/model-query.ts') },
      { find: '@/locales/config', replacement: path.join(Root, 'src/i18n.ts') },
      { find: '@review-tailwind', replacement: path.join(Web, 'tailwind.css') },
      { find: '@', replacement: Src },
      // All packages, including peer dependencies, use the existing exact repo install.
      { find: /^((?!@vite\/)(?:[^./@][^/]*|@[^/]+\/[^/]+))(.*)$/, replacement: `${Web}/node_modules/$1$2` },
    ],
    dedupe: ['react', 'react-dom', 'react-hook-form', '@tanstack/react-query'],
  },
  css: {
    postcss: {
      plugins: [
        tailwind({
          ...TailwindConfig,
          content: [
            path.join(Root, 'src/**/*.{ts,tsx}'),
            path.join(Src, 'components/**/*.{ts,tsx}'),
            path.join(Src, 'pages/agent/form/parser-form/image-form-fields.tsx'),
          ],
        }),
        autoprefixer(),
      ],
    },
  },
  optimizeDeps: {
    entries: [path.join(Root, 'src/main.tsx')],
    include: ['react', 'react-dom/client', 'react/jsx-runtime', '@tanstack/react-query'],
  },
  server: {
    fs: { allow: [Root, Web] },
    watch: { ignored: ['**/media/**', '**/.vite-cache/**'] },
  },
  build: { outDir: path.join(Root, 'dist') },
});
