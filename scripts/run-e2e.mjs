import { spawn } from "node:child_process";
import http from "node:http";

const port = 5317;
const baseUrl = `http://127.0.0.1:${port}`;
const npmCommand = process.platform === "win32" ? "npx.cmd" : "npx";

const server = spawn(
  npmCommand,
  ["vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  {
    stdio: "inherit",
    shell: true,
  },
);

try {
  await waitForServer(baseUrl);
  const exitCode = await runPlaywright();
  process.exitCode = exitCode;
} finally {
  await stopProcessTree(server.pid);
}

function waitForServer(url) {
  const deadline = Date.now() + 30_000;

  return new Promise((resolve, reject) => {
    const poll = () => {
      const request = http.get(url, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) {
          resolve();
          return;
        }
        retry();
      });

      request.on("error", retry);
      request.setTimeout(1000, () => {
        request.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() > deadline) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }
      setTimeout(poll, 250);
    };

    poll();
  });
}

function runPlaywright() {
  return new Promise((resolve) => {
    const child = spawn(npmCommand, ["playwright", "test"], {
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
        PLAYWRIGHT_BASE_URL: baseUrl,
      },
    });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

function stopProcessTree(pid) {
  if (!pid) return Promise.resolve();
  if (process.platform !== "win32") {
    server.kill("SIGTERM");
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const killer = spawn("taskkill", ["/pid", String(pid), "/T", "/F"], {
      stdio: "ignore",
      shell: false,
    });
    killer.on("exit", () => resolve());
  });
}
