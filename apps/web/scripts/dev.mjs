// Next.js CLI compatibility with supervisors forwarding Vite-style arguments.
// Next already fails when the requested port is occupied (strict-port semantics).
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../../../", import.meta.url));
const isolated = join(
  root,
  ".venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
);
// A prepared monorepo starts the complete free stack. An explicit API URL keeps
// externally managed backends (including scripts/dev.py) in control.
let api;
if (!process.env.FRP_API_URL && existsSync(isolated)) {
  api = spawn(
    isolated,
    [
      "-m",
      "uvicorn",
      "apps.api.app.main:app",
      "--host",
      "127.0.0.1",
      "--port",
      "8000",
    ],
    { cwd: root, stdio: "inherit", env: process.env },
  );
  api.on("error", () =>
    console.error(
      "Analysis server could not start. Saved research analysis remains available.",
    ),
  );
}
const args = process.argv
  .slice(2)
  .filter((arg) => arg !== "--strictPort")
  .map((arg) => (arg === "--host" ? "--hostname" : arg));
const child = spawn(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "dev", ...args],
  { cwd: join(root, "apps/web"), stdio: "inherit" },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    child.kill(signal);
    api?.kill(signal);
  });
child.on("exit", (code) => {
  api?.kill();
  process.exit(code ?? 1);
});
child.on("error", () => {
  api?.kill();
  process.exit(1);
});
