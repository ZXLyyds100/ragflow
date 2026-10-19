import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = "<WORKSPACE>";
const run = path.join(root, "work/20261019-1557");
const repo = path.join(root, "repos/ragflow-21113");
const environmentOut = path.join(root, "evidence/ragflow-21113-static-environment/pdf-shared-adapter");
const attempt = process.argv.find((arg) => arg.startsWith("--attempt="))?.slice("--attempt=".length);
if (attempt && !/^[a-z0-9-]+$/.test(attempt)) throw new Error("Unsafe evidence attempt name");
const out = attempt ? path.join(environmentOut, attempt) : environmentOut;
const source = JSON.parse(await readFile(path.join(out, "execution-manifest.json"), "utf8"));
const fullOnly = process.argv.includes("--full-only-after-fixture");
const fixtureProvenance = fullOnly
  ? JSON.parse(await readFile(path.join(out, "tracked-fixture-provenance.json"), "utf8"))
  : null;
const patterns = [
  "./internal/ingestion/...", "./internal/entity/models", "./internal/parser/...",
  "./internal/dao", "./internal/service", "./internal/service/dataset",
  "./internal/service/document", "./cmd/...",
];
const env = {
  ...process.env,
  CC: path.join(run, "tools/ort-pdf-shared-test-cc.mjs"),
  RAGFLOW_ORT_SHARED_TEST_ONLY: "1",
  RAGFLOW_ORT_ADAPTER_LOG: path.join(out, "compiler-invocations.jsonl"),
  GOFLAGS: `-overlay=${path.join(run, "tools/overlay.json")}`,
};
async function verifySources() {
  for (const [relative, { sha256 }] of Object.entries(source.files)) {
    if (!relative.endsWith(".go") && !["build.sh", "internal/binding/cpp/CMakeLists.txt", "go.mod", "go.sum"].includes(relative)) continue;
    const actual = createHash("sha256").update(await readFile(path.join(repo, relative))).digest("hex");
    if (actual !== sha256) throw new Error(`Current source drifted since focused validation: ${relative}; stop and create a new frozen validation attempt`);
  }
}
await verifySources();
await copyFile(import.meta.filename, path.join(out, fullOnly ? "run-native-related-validation-after-fixture.mjs" : "run-native-related-validation.mjs"));
const listed = execFileSync("go", ["list", "-tags", "cgo,static", ...patterns], { cwd: repo, env, encoding: "utf8" }).trim().split("\n");
const searchProgram = "/Applications/ChatGPT.app/Contents/Resources/codex-cli/codex-path/rg";
const matches = execFileSync(searchProgram, [
  "--files-with-matches", "^func Test[^ (]*(ImageOCR|ResolveModelConfig|Upload)",
  "internal", "cmd", "-g", "*_test.go",
], { cwd: repo, encoding: "utf8" }).trim().split("\n");
const racePackages = [...new Set(matches.map((filename) => `./${path.dirname(filename)}`))].sort();
const plan = {
  at: new Date().toISOString(),
  sourceManifest: path.join(out, "execution-manifest.json"),
  mode: "TEST-only real ORT/PDF shared adapter; other native archives remain static; no source edits",
  relatedPatterns: patterns,
  relatedPackages: listed,
  raceRegex: "ImageOCR|ResolveModelConfig|Upload",
  racePackages,
  raceSourceMatches: matches,
  searchProgram,
  raceScope: "All repository internal/cmd test packages with matching named tests. Default cgo,static tags only; integration/manual/e2e tests remain excluded.",
  nativeTier: "No fetch_testdata: native TestMain skips m.Run; no inference/native unit coverage is claimed even if appended go test prints ok.",
};
if (fullOnly) {
  const fixture = await readFile(path.join(repo, fixtureProvenance.relative));
  if (createHash("sha256").update(fixture).digest("hex") !== fixtureProvenance.sha256) throw new Error("Restored exact Git fixture changed");
  plan.fixtureProvenance = fixtureProvenance;
}
await writeFile(path.join(out, fullOnly ? "related-validation-plan-after-fixture.json" : "related-validation-plan.json"), `${JSON.stringify(plan, null, 2)}\n`);
const results = [];
async function execute(name, extra, packages) {
  await verifySources();
  const args = ["build.sh", "--test", "-json", "-timeout", "8m", ...extra, ...packages];
  const logfile = path.join(out, `${name}${fullOnly ? "-after-fixture" : ""}.log`);
  const log = createWriteStream(logfile, { flags: "wx" });
  const started = new Date().toISOString();
  console.log(JSON.stringify({ phase: name, started, command: ["bash", ...args], relatedPackageCount: listed.length, racePackageCount: racePackages.length, logfile }));
  const child = spawn("bash", args, { cwd: repo, env });
  for (const stream of [child.stdout, child.stderr]) stream.on("data", (bytes) => log.write(bytes));
  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve(signal ? `signal:${signal}` : code));
  });
  await new Promise((resolve) => log.end(resolve));
  const text = await readFile(logfile, "utf8");
  const events = text.split("\n").filter((line) => line.startsWith("{")).flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
  const collect = (action) => events.filter((event) => event.Action === action && event.Test).map(({ Package, Test }) => ({ Package, Test }));
  const result = {
    phase: name, started, finished: new Date().toISOString(), exitCode,
    command: ["bash", ...args], logfile,
    environment: { CC: env.CC, GOFLAGS: env.GOFLAGS, RAGFLOW_ORT_SHARED_TEST_ONLY: "1" },
    testsRun: collect("run"), testsPassed: collect("pass"), testsFailed: collect("fail"), testsSkipped: collect("skip"),
    packagesPassed: events.filter((event) => event.Action === "pass" && !event.Test).map((event) => event.Package),
    packagesFailed: events.filter((event) => event.Action === "fail" && !event.Test).map((event) => event.Package),
    packagesSkipped: events.filter((event) => event.Action === "skip" && !event.Test).map((event) => event.Package),
    raceReported: text.includes("WARNING: DATA RACE"),
    nativePolicy: plan.nativeTier,
    sourceStable: true,
  };
  try { await verifySources(); }
  catch (error) { result.sourceStable = false; result.sourceDrift = error.message; }
  results.push(result);
  await writeFile(path.join(out, fullOnly ? "related-results-after-fixture.json" : "related-results.json"), `${JSON.stringify(results, null, 2)}\n`);
  console.log(JSON.stringify({
    phase: name, exitCode, sourceStable: result.sourceStable,
    runEvents: result.testsRun.length, passedEvents: result.testsPassed.length,
    failedEvents: result.testsFailed.length, skippedEvents: result.testsSkipped.length,
    packagesPassed: result.packagesPassed, packagesFailed: result.packagesFailed,
    raceReported: result.raceReported, failingTests: result.testsFailed,
  }));
  if (!result.sourceStable) throw new Error(result.sourceDrift);
  return result;
}
const full = await execute("adapter-current-full-related", [], patterns);
if (fullOnly) {
  if (full.exitCode !== 0) process.exitCode = 1;
} else {
  const race = await execute("adapter-current-focused-race", ["-race", "-count=1", "-run", plan.raceRegex], racePackages);
  if (full.exitCode !== 0 || race.exitCode !== 0) process.exitCode = 1;
}
