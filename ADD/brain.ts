/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

// -------------------- Types --------------------
type FileNode = { file: string; mtimeIso?: string };
type FolderNode = { folder: string; children: TreeNode[] };
type TreeNode = FileNode | FolderNode;

type VueSummary = {
  file: string;
  templateTags: string[];
  imports: string[];
  emits: string[];
  props: string[];
  vueScriptSetupTs: boolean;
  definePropsTyped: boolean;       // defineProps<T>() detected
  definePropsRuntime: boolean;     // defineProps({...}) detected
};

type TSSignals = {
  anyCount: number;
  tsIgnoreCount: number;
  tsExpectErrorCount: number;
  nonNullAssertionCount: number;   // !!
  asConstCount: number;
  satisfiesCount: number;
  readonlyCount: number;
  enumCount: number;
  interfaceCount: number;
  typeAliasCount: number;
  genericAnglesCount: number;      // rough <T> heuristic
  unionCount: number;              // |
  intersectionCount: number;       // &
};

type PerfSignals = {
  performanceNow: boolean;
  requestIdleCallback: boolean;
  intersectionObserver: boolean;
  consoleTime: boolean;
  dynamicImport: boolean;
};

type CodeSummary = {
  file: string;
  imports: string[];
  exportCount: number;
  vuetifyCreate: boolean;
  tsSignals: TSSignals;
  perfSignals: PerfSignals;
};

type TsconfigFlags = {
  path: string;
  extends?: string;
  strict?: boolean;
  noUnusedLocals?: boolean;
  noUnusedParameters?: boolean;
  noFallthroughCasesInSwitch?: boolean;
  noUncheckedSideEffectImports?: boolean;
  skipLibCheck?: boolean;
  useDefineForClassFields?: boolean;
  moduleResolution?: string;
  types?: string[];
};

type SelfStats = {
  path: string;
  bytes: number;
  lines: number;
  maxLineLen: number;
  functionLikeCount: number;
  todoCount: number;
  fixmeCount: number;
  tsSignals: TSSignals;
};

// -------------------- Paths --------------------
const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");
const ADD_DIR = path.join(ROOT, "ADD");
const BRAIN_PATH = path.join(ADD_DIR, "brain.ts");
const PLUGINS_DIR = path.join(SRC_DIR, "plugins");
const VUETIFY_PLUGIN_CANDIDATES = (["vuetify.ts", "vuetify.js"] as const).map((f) =>
  path.join(PLUGINS_DIR, f)
);

const MEM_DIR = path.join(ADD_DIR, "memory");
const FRONTEND_MEMORY = path.join(MEM_DIR, "frontendMemory.json");
const STRUCTURE_FILE = path.join(MEM_DIR, "structure.json");
const STRUCTURE_TXT = path.join(MEM_DIR, "structure.txt");

fs.mkdirSync(MEM_DIR, { recursive: true });

// Accumulators
const vueFiles: string[] = [];
const codeFiles: string[] = [];

// -------------------- Helpers --------------------
function readText(p: string): string {
  return fs.readFileSync(p, "utf8");
}
function readJsonSafe<T = any>(p: string): T | null {
  try {
    return JSON.parse(readText(p)) as T;
  } catch {
    return null;
  }
}
function isFolderNode(n: TreeNode): n is FolderNode {
  return (n as FolderNode).children !== undefined;
}
function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0);
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// -------------------- FS Walk & Tree --------------------
function walk(dir: string, tree: TreeNode[] = []): TreeNode[] {
  const SKIP = new Set(["node_modules", ".git", "dist", "coverage"]);

  for (const entry of fs.readdirSync(dir)) {
    if (SKIP.has(entry)) continue;

    const full = path.join(dir, entry);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      const node: FolderNode = { folder: path.relative(ROOT, full), children: [] };
      tree.push(node);
      walk(full, node.children);
    } else {
      const rel = path.relative(ROOT, full);
      const mtimeIso = new Date(stat.mtimeMs).toISOString();
      tree.push({ file: rel, mtimeIso });
      if (entry.endsWith(".vue")) vueFiles.push(full);
      if (/\.(?:m?js|tsx?|vue)$/.test(entry)) codeFiles.push(full);
    }
  }
  return tree;
}

function renderTreeView(tree: TreeNode[], depth = 0): string[] {
  const lines: string[] = [];
  const prefix = (d: number) => "│   ".repeat(d);

  for (let i = 0; i < tree.length; i++) {
    const node = tree[i];
    const isLast = i === tree.length - 1;
    const elbow = isLast ? "└── " : "├── ";

    if (isFolderNode(node)) {
      const folderName = node.folder.split(path.sep).pop() ?? node.folder;
      lines.push(`${prefix(depth)}${elbow}${folderName}/`);
      lines.push(...renderTreeView(node.children ?? [], depth + 1));
    } else {
      const fileName = node.file.split(path.sep).pop() ?? node.file;
      lines.push(`${prefix(depth)}${elbow}${fileName}`);
    }
  }
  return lines;
}

// -------------------- Scanners --------------------
function scanPerfSignals(src: string): PerfSignals {
  return {
    performanceNow: /\bperformance\.now\s*\(/.test(src),
    requestIdleCallback: /\brequestIdleCallback\s*\(/.test(src),
    intersectionObserver: /\bIntersectionObserver\b/.test(src),
    consoleTime: /\bconsole\.(time|timeEnd)\s*\(/.test(src),
    dynamicImport: /\bimport\s*\(\s*['"].*?['"]\s*\)/.test(src),
  };
}
function scanTSSignals(src: string): TSSignals {
  const anyCount = (src.match(/\bany\b/g) || []).length;
  const tsIgnoreCount = (src.match(/\/\/\s*@ts-ignore\b/g) || []).length;
  const tsExpectErrorCount = (src.match(/\/\/\s*@ts-expect-error\b/g) || []).length;
  const nonNullAssertionCount = (src.match(/!!/g) || []).length;
  const asConstCount = (src.match(/\bas\s+const\b/g) || []).length;
  const satisfiesCount = (src.match(/\bsatisfies\b/g) || []).length;
  const readonlyCount = (src.match(/\breadonly\b/g) || []).length;
  const enumCount = (src.match(/\benum\s+\w+/g) || []).length;
  const interfaceCount = (src.match(/\binterface\s+\w+/g) || []).length;
  const typeAliasCount = (src.match(/\btype\s+\w+\s*=/g) || []).length;
  const genericAnglesCount = (src.match(/<\s*[A-Z][A-Za-z0-9_]*(\s*,\s*[A-Z][A-Za-z0-9_]*)*\s*>/g) || []).length;
  const unionCount = (src.match(/[^|]\s\|\s[^|]/g) || []).length;
  const intersectionCount = (src.match(/\s&\s/g) || []).length;

  return {
    anyCount,
    tsIgnoreCount,
    tsExpectErrorCount,
    nonNullAssertionCount,
    asConstCount,
    satisfiesCount,
    readonlyCount,
    enumCount,
    interfaceCount,
    typeAliasCount,
    genericAnglesCount,
    unionCount,
    intersectionCount,
  };
}

function scanVue(file: string): VueSummary {
  const src = readText(file);

  const templateTags = [...src.matchAll(/<([\w-]+)(\s|>)/g)].map((m) => m[1]);
  const imports = [
    ...src.matchAll(/^\s*import\s+.*?from\s+['"](.*?)['"]/gm),
  ].map((m) => m[1]);
  const emits = [...src.matchAll(/defineEmits\(([^)]*)\)/g)].map((m) => m[1]);
  const props = [...src.matchAll(/defineProps\(([^)]*)\)/g)].map((m) => m[1]);

  const vueScriptSetupTs = /<script[^>]*\blang\s*=\s*["']ts["'][^>]*\bsetup\b/i.test(src);
  const definePropsTyped = /defineProps\s*<[^>]+>\s*\(/.test(src);
  const definePropsRuntime = /defineProps\s*\(\s*{/.test(src);

  return {
    file: path.relative(ROOT, file),
    templateTags,
    imports,
    emits,
    props,
    vueScriptSetupTs,
    definePropsTyped,
    definePropsRuntime,
  };
}

function scanCode(file: string): CodeSummary {
  const src = readText(file);

  const imports = [
    ...src.matchAll(/^\s*import\s+.*?from\s+['"](.*?)['"]/gm),
  ].map((m) => m[1]);
  const exportCount = [
    ...src.matchAll(/^\s*export\s+(?:default|const|function|class)\b/gm),
  ].length;
  const vuetifyCreate = /createVuetify\s*\(/.test(src);

  return {
    file: path.relative(ROOT, file),
    imports,
    exportCount,
    vuetifyCreate,
    tsSignals: scanTSSignals(src),
    perfSignals: scanPerfSignals(src),
  };
}

function readEnvVars(): string[] {
  const envCandidates = fs.readdirSync(ROOT).filter((f) => f.startsWith(".env"));
  const keys = new Set<string>();
  for (const f of envCandidates) {
    const content = readText(path.join(ROOT, f));
    for (const m of content.matchAll(/^\s*([A-Z0-9_]+)\s*=/gm)) {
      keys.add(m[1]);
    }
  }
  return [...keys];
}

function detectVuetify(): string | null {
  for (const p of VUETIFY_PLUGIN_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function computeVuetifyTags(vueSummaries: VueSummary[]): string[] {
  const vuetifyTags = new Set<string>(
    vueSummaries.flatMap((v) => v.templateTags.filter((t) => /^V[A-Z]/.test(t))),
  );
  return [...vuetifyTags];
}

function readTsconfigs(): TsconfigFlags[] {
  const candidates = ["tsconfig.json", "tsconfig.app.json", "tsconfig.add.json"];
  const found: TsconfigFlags[] = [];
  for (const rel of candidates) {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) continue;
    const j = readJsonSafe<any>(p);
    if (!j) continue;
    const c = j.compilerOptions ?? {};
    found.push({
      path: rel,
      extends: j.extends,
      strict: c.strict,
      noUnusedLocals: c.noUnusedLocals,
      noUnusedParameters: c.noUnusedParameters,
      noFallthroughCasesInSwitch: c.noFallthroughCasesInSwitch,
      noUncheckedSideEffectImports: c.noUncheckedSideEffectImports,
      skipLibCheck: c.skipLibCheck,
      useDefineForClassFields: c.useDefineForClassFields,
      moduleResolution: c.moduleResolution,
      types: c.types,
    });
  }
  return found;
}

// -------------------- Self scan (brain.ts) --------------------
function scanSelf(p: string): SelfStats | null {
  if (!fs.existsSync(p)) return null;
  const src = readText(p);
  const bytes = Buffer.byteLength(src);
  const linesArr = src.split(/\r?\n/);
  const lines = linesArr.length;
  const maxLineLen = Math.max(...linesArr.map((l) => l.length));
  const functionLikeCount = (src.match(/\b(function\b|\(\)\s*=>|=>\s*{|function\s*\w+\s*\()/g) || []).length;
  const todoCount = (src.match(/\/\/\s*TODO\b/gi) || []).length;
  const fixmeCount = (src.match(/\/\/\s*FIXME\b/gi) || []).length;
  const tsSignals = scanTSSignals(src);
  return { path: path.relative(ROOT, p), bytes, lines, maxLineLen, functionLikeCount, todoCount, fixmeCount, tsSignals };
}

// -------------------- Main --------------------
function main(): void {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`❌ src/ not found at ${SRC_DIR}`);
    process.exit(1);
  }

  const startedAt = Date.now();
  const startedIso = new Date(startedAt).toISOString();

  // Build file tree and summaries
  const fsTree = walk(SRC_DIR, []);
  const vueSummaries = vueFiles.map(scanVue);
  const codeSummaries = codeFiles.map(scanCode);

  // Environment & configs
  const envVars = readEnvVars();
  const tsconfigs = readTsconfigs();

  // Framework & usage
  const vuetifyPlugin = detectVuetify();
  const vuetifyUsageTags = computeVuetifyTags(vueSummaries);

  // Self-awareness
  const selfStats = scanSelf(BRAIN_PATH);

  // Aggregate TS & Perf signals
  const tsTotals = {
    anyCount: sum(codeSummaries.map((c) => c.tsSignals.anyCount)),
    tsIgnoreCount: sum(codeSummaries.map((c) => c.tsSignals.tsIgnoreCount)),
    tsExpectErrorCount: sum(codeSummaries.map((c) => c.tsSignals.tsExpectErrorCount)),
    nonNullAssertionCount: sum(codeSummaries.map((c) => c.tsSignals.nonNullAssertionCount)),
    asConstCount: sum(codeSummaries.map((c) => c.tsSignals.asConstCount)),
    satisfiesCount: sum(codeSummaries.map((c) => c.tsSignals.satisfiesCount)),
    readonlyCount: sum(codeSummaries.map((c) => c.tsSignals.readonlyCount)),
    enumCount: sum(codeSummaries.map((c) => c.tsSignals.enumCount)),
    interfaceCount: sum(codeSummaries.map((c) => c.tsSignals.interfaceCount)),
    typeAliasCount: sum(codeSummaries.map((c) => c.tsSignals.typeAliasCount)),
    genericAnglesCount: sum(codeSummaries.map((c) => c.tsSignals.genericAnglesCount)),
    unionCount: sum(codeSummaries.map((c) => c.tsSignals.unionCount)),
    intersectionCount: sum(codeSummaries.map((c) => c.tsSignals.intersectionCount)),
  };

  const perfPresence = {
    performanceNow: codeSummaries.some((c) => c.perfSignals.performanceNow),
    requestIdleCallback: codeSummaries.some((c) => c.perfSignals.requestIdleCallback),
    intersectionObserver: codeSummaries.some((c) => c.perfSignals.intersectionObserver),
    consoleTime: codeSummaries.some((c) => c.perfSignals.consoleTime),
    dynamicImport: codeSummaries.some((c) => c.perfSignals.dynamicImport),
  };

  // --- Scoring ---
  const penalties = { any: 8, tsIgnore: 10, tsExpectError: 4, nonNull: 3 };
  const rewards = { definePropsTyped: 2, satisfies: 2, asConst: 1 };

  const negatives =
    tsTotals.anyCount * penalties.any +
    tsTotals.tsIgnoreCount * penalties.tsIgnore +
    tsTotals.tsExpectErrorCount * penalties.tsExpectError +
    tsTotals.nonNullAssertionCount * penalties.nonNull;

  const positives =
    vueSummaries.filter((v) => v.definePropsTyped).length * rewards.definePropsTyped +
    tsTotals.satisfiesCount * rewards.satisfies +
    tsTotals.asConstCount * rewards.asConst;

  const tsHygieneScore = clamp(100 - negatives + positives, 0, 100);

  const suggestions: string[] = [];
  if (tsTotals.anyCount > 0) suggestions.push("Replace `any` with generics or discriminated unions.");
  if (tsTotals.tsIgnoreCount > 0) suggestions.push("Avoid `@ts-ignore`; prefer proper typing or `@ts-expect-error` with rationale.");
  if (tsTotals.nonNullAssertionCount > 0) suggestions.push("Avoid `!!`; narrow types via guards, `in`, or user-defined type predicates.");
  if (vueSummaries.filter((v) => v.definePropsTyped).length === 0)
    suggestions.push("Use `defineProps<T>()` for typed props in SFCs.");
  if (!perfPresence.dynamicImport) suggestions.push("Consider dynamic `import()` for code-splitting large routes/components.");
  if (!perfPresence.intersectionObserver) suggestions.push("Use `IntersectionObserver` for lazy rendering of lists/images when appropriate.");
  if (selfStats && selfStats.lines > 400) suggestions.push("Brain file is getting large—consider modularizing scanners into `ADD/scanners/*`.");

  const endedAt = Date.now();
  const endedIso = new Date(endedAt).toISOString();
  const durationMs = endedAt - startedAt;

  // Payloads
  const memory = {
    summary: {
      componentsScanned: vueSummaries.length,
      filesScanned: codeSummaries.length,
      envVars,
      tsconfigs,
      tsTotals,
      perfPresence,
      vueSfc: {
        scriptSetupTsCount: vueSummaries.filter((v) => v.vueScriptSetupTs).length,
        definePropsTypedCount: vueSummaries.filter((v) => v.definePropsTyped).length,
        definePropsRuntimeCount: vueSummaries.filter((v) => v.definePropsRuntime).length,
      },
      vuetify: {
        pluginPath: vuetifyPlugin,
        usedTags: vuetifyUsageTags,           // if plugin missing but tags found → likely misconfig
        pluginDetected: Boolean(vuetifyPlugin),
      },
      tsHygieneScore,
      suggestions,
      self: selfStats,
    },
    vue: vueSummaries,
    code: codeSummaries,
    scan: { startedIso, endedIso, durationMs },
  };

  const treeViewLines = ["📁 src/", ...renderTreeView(fsTree)];
  const structurePayload = {
    scan: { startedIso, endedIso, durationMs },
    tree: fsTree,
    treeView: treeViewLines.join("\n"),
  };

  // Persist
  fs.writeFileSync(FRONTEND_MEMORY, JSON.stringify(memory, null, 2));
  fs.writeFileSync(STRUCTURE_FILE, JSON.stringify(structurePayload, null, 2));
  fs.writeFileSync(STRUCTURE_TXT, structurePayload.treeView + "\n");

  // -------------------- Rich console output --------------------
  console.log(`🧠 Saved: ${path.relative(ROOT, FRONTEND_MEMORY)}`);
  console.log(`🌳 Saved: ${path.relative(ROOT, STRUCTURE_FILE)}`);
  console.log(`🗺️  Saved: ${path.relative(ROOT, STRUCTURE_TXT)}`);

  console.log("\n======================================");
  console.log("           PROJECT OVERVIEW           ");
  console.log("======================================");
  console.log(treeViewLines.join("\n"));
  console.log(`\nScan: ${startedIso} → ${endedIso}  (${durationMs} ms)`);

  console.log("\n--- TypeScript Hygiene ---");
  console.log(`Score: ${tsHygieneScore}/100`);
  console.log(
    `any:${tsTotals.anyCount}  @ts-ignore:${tsTotals.tsIgnoreCount}  @ts-expect-error:${tsTotals.tsExpectErrorCount}  !!:${tsTotals.nonNullAssertionCount}`
  );
  console.log(
    `as const:${tsTotals.asConstCount}  satisfies:${tsTotals.satisfiesCount}  interfaces:${tsTotals.interfaceCount}  types:${tsTotals.typeAliasCount}`
  );

  console.log("\n--- Vue SFC Typing ---");
  console.log(
    `script setup lang=ts: ${memory.summary.vueSfc.scriptSetupTsCount} | defineProps<T>: ${memory.summary.vueSfc.definePropsTypedCount} | runtime defineProps: ${memory.summary.vueSfc.definePropsRuntimeCount}`
  );

  console.log("\n--- Perf Signals (any present?) ---");
  console.log(
    `performance.now:${memory.summary.perfPresence.performanceNow}  requestIdleCallback:${memory.summary.perfPresence.requestIdleCallback}  IntersectionObserver:${memory.summary.perfPresence.intersectionObserver}  console.time:${memory.summary.perfPresence.consoleTime}  dynamic import():${memory.summary.perfPresence.dynamicImport}`
  );

  if (selfStats) {
    console.log("\n--- Brain (self) ---");
    console.log(
      `${selfStats.path}  lines:${selfStats.lines}  bytes:${selfStats.bytes}  maxLine:${selfStats.maxLineLen}  funcs~:${selfStats.functionLikeCount}  TODO:${selfStats.todoCount}  FIXME:${selfStats.fixmeCount}`
    );
  }

  if (suggestions.length) {
    console.log("\n--- Suggestions ---");
    for (const s of suggestions) console.log(`• ${s}`);
  }

  if (!vuetifyPlugin && vuetifyUsageTags.length) {
    console.log(
      `\n⚠️ Vuetify-like tags detected (${vuetifyUsageTags.join(", ")}) but no vuetify plugin found.`
    );
  } else if (vuetifyPlugin) {
    console.log(`\n✅ Vuetify plugin detected at ${path.relative(ROOT, vuetifyPlugin)}`);
  } else {
    console.log("\nℹ️ No Vuetify usage detected — all good.");
  }
}

main();
