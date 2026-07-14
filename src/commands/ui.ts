import { openBrowser } from "../web/openBrowser.js";
import { startUiServer, type RunningUiServer } from "../web/server.js";

export interface UiCommandOptions {
  target?: string | undefined;
  port?: number | undefined;
  model?: string | undefined;
  open?: boolean | undefined;
  execute?: boolean | undefined;
  allowNetwork?: boolean | undefined;
  timeout?: number | undefined;
}

export interface UiCommandDependencies {
  startServer: typeof startUiServer;
  openBrowser: (url: string) => void;
  writeConsole: (message: string) => void;
  process: Pick<NodeJS.Process, "once" | "off">;
}

const defaultDependencies: UiCommandDependencies = {
  startServer: startUiServer,
  openBrowser,
  writeConsole: (message) => process.stdout.write(message),
  process,
};

export type UiCommandHandler = (
  repository: string,
  options: UiCommandOptions,
) => Promise<void> | void;

function waitForShutdown(
  server: RunningUiServer,
  processEvents: Pick<NodeJS.Process, "once" | "off">,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let closing = false;
    const removeListeners = (): void => {
      processEvents.off("SIGINT", shutdown);
      processEvents.off("SIGTERM", shutdown);
    };
    const shutdown = (): void => {
      if (closing) return;
      closing = true;
      void server.close().then(
        () => {
          removeListeners();
          resolve();
        },
        (error: unknown) => {
          removeListeners();
          reject(error);
        },
      );
    };
    processEvents.once("SIGINT", shutdown);
    processEvents.once("SIGTERM", shutdown);
  });
}

export async function uiRepository(
  repository: string,
  options: UiCommandOptions,
  dependencies: UiCommandDependencies = defaultDependencies,
): Promise<void> {
  const server = await dependencies.startServer({
    repository,
    target: options.target,
    port: options.port,
    model: options.model,
    execute: options.execute,
    allowNetwork: options.allowNetwork,
    timeout: options.timeout,
  });
  dependencies.writeConsole(
    `Escrow UI running at ${server.url}\nRepository: ${server.config.repository}\nPress Ctrl+C to stop.\n`,
  );
  if (options.open !== false) {
    dependencies.openBrowser(server.url);
  }
  await waitForShutdown(server, dependencies.process);
}
