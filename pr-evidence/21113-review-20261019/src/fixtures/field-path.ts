// Exact helper excerpt from parser-form/utils.ts; no canvas app bootstrapping.
export function buildFieldNameWithPrefix(name: string, prefix: string) {
  return `${prefix}.${name}`;
}
