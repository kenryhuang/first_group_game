import { spawn } from "node:child_process";
import http from "node:http";

const port = 5317;
const baseUrl = `http://127.0.0.1:${port}`;
const npmCommand = process.platform === "win32" ? "npx.cmd" : "npx";

let server;

try {
  const alreadyRunning = await isServerAvailable(baseUrl);
  if (!alreadyRunning) {
    server = spawn(
      npmCommand,
      ["vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
      {
        stdio: "inherit",
        shell: true,
      },
    );
    await waitForServer(baseUrl);
  }
  const exitCode = await runPlaywright();
  process.exitCode = exitCode;
} finally {
  if (server?.pid) {
    await stopProcessTree(server.pid);
  }
}

async function isServerAvailable(url) {
  try {
    await requestUrl(url, 500);
    return true;
  } catch {
    return false;
  }
}

function waitForServer(url) {
  const deadline = Date.now() + 30_000;

  return new Promise((resolve, reject) => {
    const poll = () => {
      requestUrl(url, 1000).then(resolve).catch(retry);
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

function requestUrl(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      response.resume();
      if (response.statusCode && response.statusCode < 500) {
        resolve();
        return;
      }
      reject(new Error(`Unexpected status ${response.statusCode}`));
    });

    request.on("error", reject);
    request.setTimeout(timeoutMs, () => {
      request.destroy();
      reject(new Error(`Timed out requesting ${url}`));
    });
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
