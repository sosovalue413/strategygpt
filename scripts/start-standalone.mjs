import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");
const serverPath = path.join(standaloneDir, "server.js");

if (!fs.existsSync(serverPath)) {
  console.error("Standalone server not found. Run `npm run build` before `npm run start`.");
  process.exit(1);
}

await fs.promises.mkdir(path.join(standaloneDir, ".next"), { recursive: true });
await copyIfExists(path.join(root, ".next", "static"), path.join(standaloneDir, ".next", "static"));
await copyIfExists(path.join(root, "public"), path.join(standaloneDir, "public"));

await import(pathToFileURL(serverPath).href);

async function copyIfExists(source, target) {
  if (!fs.existsSync(source)) return;
  await fs.promises.cp(source, target, { recursive: true, force: true });
}
