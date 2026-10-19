#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";

const tools = "<CONTRIBUTION_WORKSPACE>/work/20261019-1807/tools";
const config = JSON.parse(readFileSync(`${tools}/ort-pdf-shared-test-config.json`, "utf8"));
if (process.env.RAGFLOW_ORT_SHARED_TEST_ONLY !== "1") {
  console.error("Refusing: TEST-only ORT/PDF shared-library adapter requires explicit opt-in; never production/static.");
  process.exit(78);
}
const original = process.argv.slice(2);
const removedORT = [];
const removedPDF = [];
const args = original.filter((arg) => {
  if (arg === config.pdf.removedArchive) {
    removedPDF.push(arg);
    return false;
  }
  if (arg.startsWith("-Wl,-force_load,") && arg.includes("onnxruntime")) {
    if (arg !== `-Wl,-force_load,${config.removedArchive}`) {
      console.error(`Refusing unexpected ORT archive: ${arg}`);
      process.exit(78);
    }
    removedORT.push(arg);
    return false;
  }
  if (arg.includes("pdf_oxide") && arg.endsWith(".a")) {
    console.error(`Refusing unexpected PDF static archive: ${arg}`);
    process.exit(78);
  }
  return true;
});
const added = [
  ...(removedORT.length ? config.flagsAdded : []),
  ...(removedPDF.length ? config.pdf.flagsAdded : []),
];
if (added.length) {
  if (original.some((arg) => ["-c", "-E", "-S", "-M", "-MM"].includes(arg))) {
    console.error("Refusing unexpected native link flags in compile-only mode");
    process.exit(78);
  }
  const index = original.indexOf("-o");
  const output = index < 0 ? "" : original[index + 1];
  if (/ragflow_server|ragflow-cli/.test(output ?? "")) {
    console.error("Refusing production/server output");
    process.exit(78);
  }
  args.push(...added);
}
const log = process.env.RAGFLOW_ORT_ADAPTER_LOG;
if (!log?.startsWith("<CONTRIBUTION_WORKSPACE>/evidence/ragflow-21109-migration-environment/")) {
  console.error("Refusing to run without protected compiler-argument provenance");
  process.exit(78);
}
appendFileSync(log, `${JSON.stringify({
  at: new Date().toISOString(),
  mode: "TEST-only real ORT 1.29.0 + PDF_oxide 0.3.73 shared; office/PDFium/tokenizer/PCRE remain real static",
  compiler: config.compiler, original,
  removed: [...removedORT, ...removedPDF], added, effective: args,
})}\n`);
const result = spawnSync(config.compiler, args, { stdio: "inherit" });
if (result.error) {
  console.error(result.error.message);
  process.exit(127);
}
if (result.signal) process.kill(process.pid, result.signal);
else process.exit(result.status ?? 1);
