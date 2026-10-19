// Compile original/fixed source with the same installed TypeScript and config.
// Only compiler reads are overlaid; no working-tree file is replaced.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = process.env.RAGFLOW_REPO ||
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../repos/ragflow-21113');
const require = createRequire(path.join(repo, 'web/package.json'));
const ts = require('typescript');
// Type-library resolution follows the compiler host's current directory.
// Match `cd web && npm run type-check`, not the contribution workspace root.
process.chdir(path.join(repo, 'web'));
const baseline = 'f66e8362850fd47764d45d8cebfdb3c21ea6fcd2';
const baselineFiles = new Map([
  'web/src/pages/agent/form/parser-form/image-form-fields.tsx',
  'web/src/pages/agent/form/parser-form/image-form-fields.test.tsx',
  'web/src/locales/en.ts',
  'web/src/locales/zh.ts',
].map(relative => [
  path.join(repo, relative),
  execFileSync('git', ['show', `${baseline}:${relative}`], {
    cwd: repo, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
  }),
]));
const configPath = path.join(repo, 'web/tsconfig.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
if (parsed.errors.length) throw new Error('Invalid repository TypeScript configuration');

function diagnose(original) {
  const host = ts.createCompilerHost(parsed.options);
  const read = host.readFile.bind(host);
  host.readFile = filename =>
    original && baselineFiles.has(filename) ? baselineFiles.get(filename) : read(filename);
  const program = ts.createProgram({
    rootNames: parsed.fileNames,
    options: { ...parsed.options, noEmit: true },
    projectReferences: parsed.projectReferences,
    host,
  });
  return ts.getPreEmitDiagnostics(program).map(diagnostic => ({
    file: diagnostic.file ? path.relative(repo, diagnostic.file.fileName).split(path.sep).join('/') : '',
    code: diagnostic.code,
    category: diagnostic.category,
    // Diagnostic identity includes multiplicity, but not local absolute paths.
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n').split(repo).join('$REPO'),
  })).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}
const original = diagnose(true);
const fixed = diagnose(false);
const parity = JSON.stringify(original) === JSON.stringify(fixed);
console.log(JSON.stringify({ baseline, original_count: original.length, fixed_count: fixed.length,
  same_diagnostics_including_multiplicity: parity, original, fixed }, null, 2));
if (!parity) process.exitCode = 1;
