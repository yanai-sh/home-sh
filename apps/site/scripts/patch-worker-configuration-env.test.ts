import { expect, test } from "vitest";
import {
  patchMainModule,
  patchResumeRepoToken,
  patchWorkerConfigurationTypes,
} from "./patch-worker-configuration-env";

const SAMPLE = `declare namespace Cloudflare {
\tinterface GlobalProps {
\t\tmainModule: typeof import("../.svelte-kit/cloudflare/_worker");
\t}
\tinterface Env extends __BaseEnv_Env {}
}
interface __BaseEnv_Env {
\tRESUME_REPO_TOKEN: SecretsStoreSecret;
\tRESUME_REPO_TOKEN: string;
}
`;

test("patchMainModule replaces bundled worker import", () => {
  const patched = patchMainModule(SAMPLE);
  expect(patched).toContain("mainModule: ExportedHandler<Env>");
  expect(patched).not.toContain(".svelte-kit/cloudflare/_worker");
});

test("patchResumeRepoToken collapses duplicate RESUME_REPO_TOKEN", () => {
  const patched = patchResumeRepoToken(SAMPLE);
  expect(patched).toContain("RESUME_REPO_TOKEN: SecretsStoreSecret | string");
  expect(patched.match(/RESUME_REPO_TOKEN/g)?.length).toBe(1);
});

test("patchWorkerConfigurationTypes applies both patches", () => {
  const patched = patchWorkerConfigurationTypes(SAMPLE);
  expect(patched).toContain("mainModule: ExportedHandler<Env>");
  expect(patched).toContain("SecretsStoreSecret | string");
});
