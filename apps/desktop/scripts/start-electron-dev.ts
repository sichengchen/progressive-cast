import { spawn } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";

const rendererUrl = "http://127.0.0.1:5173";

async function waitForRenderer(): Promise<void> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(rendererUrl);
      if (response.ok) {
        return;
      }
    } catch {
      await wait(250);
    }
  }

  throw new Error(`Renderer dev server did not start at ${rendererUrl}`);
}

await waitForRenderer();

const child = spawn("electron", ["."], {
  env: {
    ...process.env,
    NEWCASTLE_RENDERER_URL: rendererUrl,
  },
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
