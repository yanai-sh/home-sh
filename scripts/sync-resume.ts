import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseToml } from "smol-toml";
import { normalizeToml } from "./lib/sync-resume-normalize.js";
import {
  ResumeSnapshotSchema,
  type ResumeSnapshot,
} from "../apps/site/src/content/resume-schema.js";

const OWNER = "yanai-sh";
const REPO = "resume";
const REPO_URL = `https://github.com/${OWNER}/${REPO}`;
const RESUME_SOURCE_PATH = "resume.toml";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SUBMODULE_DIR = join(REPO_ROOT, "resume");
const TOML_PATH = join(SUBMODULE_DIR, RESUME_SOURCE_PATH);

const SNAPSHOT_PATH = join(REPO_ROOT, "content", "resume.snapshot.json");
const GENERATED_PATH = join(REPO_ROOT, "content", "resume.generated.json");

function submoduleGitHead(): string | null {
  const result = spawnSync("git", ["-C", SUBMODULE_DIR, "rev-parse", "HEAD"], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return null;
  }
  return result.stdout.trim() || null;
}

function readTomlFromSubmodule(): ResumeSnapshot {
  if (!existsSync(TOML_PATH)) {
    console.error(
      `resume sync: missing ${TOML_PATH}\n` +
        "Initialize the submodule:  git submodule update --init --recursive",
    );
    process.exit(1);
  }

  const commitSha = submoduleGitHead();
  const text = readFileSync(TOML_PATH, "utf8");
  const rawTables = parseToml(text) as Record<string, unknown>;
  const data = normalizeToml(rawTables);

  const snapshot = ResumeSnapshotSchema.parse({
    source: {
      owner: OWNER,
      repo: REPO,
      path: RESUME_SOURCE_PATH,
      url:
        commitSha != null
          ? `${REPO_URL}/blob/${commitSha}/${RESUME_SOURCE_PATH}`
          : `${REPO_URL}/blob/main/${RESUME_SOURCE_PATH}`,
      fetchedAt: new Date().toISOString(),
      commitSha,
      fallback: false,
    },
    format: "home-sh-resume-v1",
    data,
  });

  return snapshot;
}

async function writeSnapshot(snapshot: ResumeSnapshot): Promise<void> {
  await mkdir(join(REPO_ROOT, "content"), { recursive: true });
  const generatedText = `${JSON.stringify(snapshot, null, 2)}\n`;
  const fallbackText = `${JSON.stringify(
    {
      ...snapshot,
      source: {
        ...snapshot.source,
        url: REPO_URL,
        fetchedAt: null,
        commitSha: null,
        fallback: true,
      },
    },
    null,
    2,
  )}\n`;

  writeFileSync(SNAPSHOT_PATH, fallbackText);
  writeFileSync(GENERATED_PATH, generatedText);
}

async function main(): Promise<void> {
  const snapshot = readTomlFromSubmodule();
  await writeSnapshot(snapshot);
  const sha = snapshot.source.commitSha?.slice(0, 7) ?? "unknown";
  console.log(`resume sync: submodule ${OWNER}/${REPO} @ ${sha} → content/resume.generated.json`);
}

await main();
