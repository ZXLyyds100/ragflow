import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { chmod, copyFile, cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = "<WORKSPACE>";
const run = path.join(root, "work/20261019-1557");
const repo = path.join(root, "repos/ragflow-21113");
const pdfMode = process.argv.includes("--pdf-shared");
const environmentOut = path.join(root, "evidence/ragflow-21113-static-environment", pdfMode ? "pdf-shared-adapter" : "shared-adapter");
const attempt = process.argv.find((arg) => arg.startsWith("--attempt="))?.slice("--attempt=".length);
if (attempt && !/^[a-z0-9-]+$/.test(attempt)) throw new Error("Unsafe evidence attempt name");
const out = attempt ? path.join(environmentOut, attempt) : environmentOut;
const tools = path.join(run, "tools");
const configName = pdfMode ? "ort-pdf-shared-test-config.json" : "ort-shared-test-config.json";
const compilerName = pdfMode ? "ort-pdf-shared-test-cc.mjs" : "ort-shared-test-cc.mjs";
const config = JSON.parse(await readFile(path.join(tools, configName), "utf8"));
const compiler = path.join(tools, compilerName);
const base = "f66e8362850fd47764d45d8cebfdb3c21ea6fcd2";
const owners = ["dispatch_model.go", "image_ocr.go", "pdf_vision_dispatch.go", "extractor.go"];
const tests = ["dispatch_model_test.go", "image_ocr_test.go", "image_ocr_resolution_test.go"];
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
await mkdir(out, { recursive: true });
await writeFile(path.join(out, "ATTEMPT-STARTED.json"), `${JSON.stringify({
  at: new Date().toISOString(), attempt: attempt ?? "initial", config: configName,
}, null, 2)}\n`, { flag: "wx" });
await writeFile(path.join(out, "config.json"), `${JSON.stringify(config, null, 2)}\n`);
await chmod(compiler, 0o755);
for (const filename of [compilerName, "ort-shared-api-probe.c", "run-shared-adapter-validation.mjs", ...(pdfMode ? ["pdf-shared-api-probe.c"] : [])]) {
  await copyFile(path.join(tools, filename), path.join(out, filename));
}
await copyFile(path.join(tools, "overlay-red.json"), path.join(out, "overlay-red.json"));
await copyFile(path.join(tools, "overlay.json"), path.join(out, "overlay-green-pcre-only.json"));
await cp(path.join(tools, "red-overlay"), path.join(out, "red-overlay"), { recursive: true });
const manifest = {
  at: new Date().toISOString(),
  mode: pdfMode ? "TEST-only official shared ORT + PDF_oxide; office/PDFium/tokenizer/PCRE remain static" : "TEST-only official shared ORT; other native archives remain static",
  base,
  compilerSHA256: sha256(await readFile(compiler)),
  configSHA256: sha256(await readFile(path.join(tools, configName))),
  files: {},
  restrictions: config.restrictions,
  fixedImplementationOnlyTests: [
    "TestResolveModelConfigChainedDBStatementIsolationFixedOnly is compiled in both snapshots but executed only against the current implementation in focused/full/race green runs.",
  ],
};
for (const filename of [...owners, ...tests]) {
  const relative = `internal/ingestion/component/${filename}`;
  const bytes = await readFile(path.join(repo, relative));
  manifest.files[relative] = { sha256: sha256(bytes) };
  if (owners.includes(filename)) {
    const original = execFileSync("git", ["show", `${base}:${relative}`], { cwd: repo, env: { ...process.env, GIT_NO_LAZY_FETCH: "1" } });
    const frozen = await readFile(path.join(tools, "red-overlay", relative));
    if (!original.equals(frozen)) throw new Error(`Original owner snapshot differs: ${relative}`);
    manifest.files[relative].redSHA256 = sha256(frozen);
  } else {
    const frozen = await readFile(path.join(tools, "red-overlay", relative));
    if (!bytes.equals(frozen)) throw new Error(`Red and green tests differ before execution: ${relative}`);
  }
}
for (const relative of ["build.sh", "internal/binding/cpp/CMakeLists.txt", "go.mod", "go.sum"]) {
  const original = execFileSync("git", ["show", `${base}:${relative}`], { cwd: repo, env: { ...process.env, GIT_NO_LAZY_FETCH: "1" } });
  const current = await readFile(path.join(repo, relative));
  if (!original.equals(current)) throw new Error(`Build invariant changed: ${relative}`);
  manifest.files[relative] = { sha256: sha256(current), byteIdenticalToBase: true };
}
manifest.status = execFileSync("git", ["status", "--short"], { cwd: repo, encoding: "utf8" }).trim();
const changed = execFileSync("git", ["ls-files", "-m", "-o", "--exclude-standard", "-z"], { cwd: repo }).toString().split("\0").filter(Boolean);
for (const relative of changed) {
  const current = await readFile(path.join(repo, relative));
  manifest.files[relative] ??= { sha256: sha256(current) };
  if (relative.endsWith(".go")) {
    const snapshot = path.join(out, "current-source", relative);
    await mkdir(path.dirname(snapshot), { recursive: true });
    await writeFile(snapshot, current);
  }
}
await writeFile(path.join(out, "execution-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
const environment = {
  ...process.env,
  CC: compiler,
  RAGFLOW_ORT_SHARED_TEST_ONLY: "1",
  RAGFLOW_ORT_ADAPTER_LOG: path.join(out, "compiler-invocations.jsonl"),
};
console.log(`TEST-only shared ORT${pdfMode ? " + PDF_oxide" : ""} adapter: this is NOT a static or production build.`);

function capture(program, args, filename, env = environment) {
  const result = execFileSync(program, args, { cwd: repo, env, encoding: "utf8", maxBuffer: 2 ** 24 });
  return writeFile(path.join(out, filename), result);
}
const probe = path.join(tools, "ort-shared-api-probe");
const probeArgs = [
  path.join(tools, "ort-shared-api-probe.c"),
  `-I${path.join(run, "go/pkg/mod/github.com/infiniflow/onnxruntime_go@v1.29.0")}`,
  "-o", probe,
  `-Wl,-force_load,${config.removedArchive}`,
  ...(pdfMode ? [config.pdf.removedArchive] : []),
];
await capture(compiler, probeArgs, "api-probe-compile.log");
await capture("otool", ["-L", probe], "api-probe-linked-libraries.txt");
await capture(probe, [], "api-probe.log");
console.log((await readFile(path.join(out, "api-probe.log"), "utf8")).trim());
if (pdfMode) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const startxref = Buffer.byteLength(pdf);
  pdf += "xref\n0 4\n0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;
  const fixture = path.join(tools, "pdf-shared-api-probe.pdf");
  await writeFile(fixture, pdf);
  const pdfProbe = path.join(tools, "pdf-shared-api-probe");
  await capture(compiler, [
    path.join(tools, "pdf-shared-api-probe.c"),
    `-I${path.join(run, "home/ragflow-native-libs/pdf_oxide/include")}`,
    "-o", pdfProbe,
    `-Wl,-force_load,${config.removedArchive}`,
    config.pdf.removedArchive,
  ], "pdf-api-probe-compile.log");
  await capture("otool", ["-L", pdfProbe], "pdf-api-probe-linked-libraries.txt");
  await capture(pdfProbe, [fixture], "pdf-api-probe.log");
  console.log((await readFile(path.join(out, "pdf-api-probe.log"), "utf8")).trim());
}
const outcomes = [];

async function verifyInputs() {
  for (const [relative, expected] of Object.entries(manifest.files)) {
    if (!relative.endsWith(".go") && !["build.sh", "internal/binding/cpp/CMakeLists.txt", "go.mod", "go.sum"].includes(relative)) continue;
    if (sha256(await readFile(path.join(repo, relative))) !== expected.sha256) {
      throw new Error(`Source changed during validation: ${relative}; do not interpret results as frozen red/green`);
    }
  }
}
async function test(name, overlay, expression, packages) {
  await verifyInputs();
  const args = ["build.sh", "--test", "-json", "-timeout", "8m", ...(expression ? ["-run", expression] : []), ...packages];
  const logPath = path.join(out, `${name}.log`);
  const log = createWriteStream(logPath, { flags: "wx" });
  const started = new Date().toISOString();
  const env = { ...environment, GOFLAGS: `-overlay=${path.join(tools, overlay)}` };
  console.log(JSON.stringify({ phase: name, started, command: ["bash", ...args], env: { CC: env.CC, GOFLAGS: env.GOFLAGS }, log: logPath }));
  const child = spawn("bash", args, { cwd: repo, env });
  for (const stream of [child.stdout, child.stderr]) stream.on("data", (bytes) => log.write(bytes));
  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve(signal ? `signal:${signal}` : code));
  });
  await new Promise((resolve) => log.end(resolve));
  const contents = await readFile(logPath, "utf8");
  const events = contents.split("\n").filter((line) => line.startsWith("{")).flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
  const result = {
    phase: name, started, finished: new Date().toISOString(), exitCode,
    command: ["bash", ...args],
    environment: { CC: env.CC, GOFLAGS: env.GOFLAGS, RAGFLOW_ORT_SHARED_TEST_ONLY: "1" },
    log: logPath,
    testsRun: events.filter((event) => event.Action === "run" && event.Test).map(({ Package, Test }) => ({ Package, Test })),
    testsPassed: events.filter((event) => event.Action === "pass" && event.Test).map(({ Package, Test }) => ({ Package, Test })),
    testsFailed: events.filter((event) => event.Action === "fail" && event.Test).map(({ Package, Test }) => ({ Package, Test })),
    testsSkipped: events.filter((event) => event.Action === "skip" && event.Test).map(({ Package, Test }) => ({ Package, Test })),
    packagesPassed: events.filter((event) => event.Action === "pass" && !event.Test).map((event) => event.Package),
    packagesFailed: events.filter((event) => event.Action === "fail" && !event.Test).map((event) => event.Package),
    nativeSkipMarkerObserved: contents.includes("SKIP: DeepDoc native testdata not fetched"),
    nativeTierPolicy: "No fetch_testdata tag is supplied: native TestMain exits zero before m.Run, regardless of whether Go hides its skip stdout. No native test/inference coverage is claimed.",
    assertionEvidence: events.filter((event) => event.Action === "output" && event.Test && /lookups=|distinguishable|leaked|warnings=|queried before|FAIL:/.test(event.Output)).map(({ Test, Output }) => ({ Test, Output })),
  };
  outcomes.push(result);
  await writeFile(path.join(out, "results.json"), `${JSON.stringify(outcomes, null, 2)}\n`);
  console.log(JSON.stringify({
    phase: name, exitCode, testsRun: result.testsRun.length, passed: result.testsPassed.length,
    failed: result.testsFailed.length, skipped: result.testsSkipped.length,
    packagesPassed: result.packagesPassed, packagesFailed: result.packagesFailed,
    nativeSkipMarkerObserved: result.nativeSkipMarkerObserved, assertionEvidence: result.assertionEvidence,
  }));
  await verifyInputs();
  return result;
}
const smoke = await test("adapter-old-head-smoke", "overlay-red.json", "^TestImageOCRSelectedTenantModel$", ["./internal/ingestion/component"]);
if (smoke.exitCode !== 0 || !smoke.testsPassed.some(({ Test }) => Test === "TestImageOCRSelectedTenantModel")) {
  console.error("Adapter smoke did not pass; no behavior-red/green claimed.");
  process.exitCode = 1;
} else {
  const expression = "TestImageOCRSelectedModelLookupOnce|TestImageOCRInaccessibleSelectionProgressDoesNotRevealModelState|TestImageOCRCloudDefaultEndpointWarning|TestResolveModelConfigInaccessibleIDs";
  const red = await test("adapter-old-head-new-tests-red", "overlay-red.json", expression, ["./internal/ingestion/component"]);
  const expectedNames = ["TestImageOCRSelectedModelLookupOnce", "TestImageOCRInaccessibleSelectionProgressDoesNotRevealModelState", "TestImageOCRCloudDefaultEndpointWarning", "TestResolveModelConfigInaccessibleIDs"];
  if (red.exitCode === 0 || !expectedNames.every((name) => red.testsFailed.some(({ Test }) => Test === name))) {
    console.error("The expected four behavior-red assertions were not all observed; stop and inspect.");
    process.exitCode = 1;
  } else {
    console.log("BEHAVIOR RED confirmed under the transparent shared ORT TEST-only adapter.");
    const green = await test("adapter-current-focused-green", "overlay.json", "ImageOCR|ResolveModelConfig", ["./internal/ingestion/component"]);
    if (green.exitCode !== 0 || !expectedNames.every((name) => green.testsPassed.some(({ Test }) => Test === name))) {
      console.error("Current focused green failed; no source/test changes were made by this validation helper.");
      process.exitCode = 1;
    } else if (!process.argv.includes("--skip-full-ingestion")) {
      const full = await test("adapter-current-full-ingestion", "overlay.json", null, ["./internal/ingestion/..."]);
      if (full.exitCode !== 0 || full.testsRun.length === 0) process.exitCode = 1;
    }
  }
}
