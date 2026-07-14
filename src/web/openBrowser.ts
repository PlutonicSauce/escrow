import { spawn } from "node:child_process";

export function openBrowser(url: string, platform = process.platform): void {
  const command = platform === "darwin" ? "open" : platform === "linux" ? "xdg-open" : undefined;
  if (command === undefined) {
    return;
  }

  const child = spawn(command, [url], {
    detached: true,
    shell: false,
    stdio: "ignore",
  });
  child.on("error", () => {
    // Browser launch is best-effort; the printed URL remains usable.
  });
  child.unref();
}
