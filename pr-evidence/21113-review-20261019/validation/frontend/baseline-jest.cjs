// Paired-source verification only. The repository transformer is unchanged.
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const repo = process.env.RAGFLOW_REPO || path.resolve(__dirname, '../repos/ragflow-21113');
const baseline = 'f66e8362850fd47764d45d8cebfdb3c21ea6fcd2';
const changedFiles = new Set([
  'web/src/pages/agent/form/parser-form/image-form-fields.tsx',
  'web/src/pages/agent/form/parser-form/image-form-fields.test.tsx',
  'web/src/locales/en.ts',
  'web/src/locales/zh.ts',
]);
const transformer = require(path.join(repo, 'web/jest-esbuild-transformer.cjs'));
module.exports = {
  createTransformer(...options) {
    const original = transformer.createTransformer(...options);
    return {
      ...original,
      process(content, filename, ...args) {
        const relative = path.relative(repo, filename).split(path.sep).join('/');
        if (changedFiles.has(relative)) {
          content = execFileSync('git', ['show', `${baseline}:${relative}`], {
            cwd: repo, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
          });
        }
        return original.process(content, filename, ...args);
      },
    };
  },
};
