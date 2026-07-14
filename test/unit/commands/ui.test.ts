import { EventEmitter } from "node:events";

import { describe, expect, it, vi } from "vitest";

import { uiRepository } from "../../../src/commands/ui.js";
import type { RunningUiServer } from "../../../src/web/server.js";

function fakeServer(close = vi.fn().mockResolvedValue(undefined)): RunningUiServer {
  return {
    host: "127.0.0.1",
    port: 4173,
    url: "http://127.0.0.1:4173",
    config: {
      repository: "/repo",
      target: "/repo",
      model: "gpt-5.6",
      execute: false,
      allowNetwork: false,
      timeout: 120,
      version: "0.1.0",
    },
    close,
  };
}

describe("uiRepository", () => {
  it("opens the browser by default and closes cleanly on SIGINT", async () => {
    const events = new EventEmitter();
    const close = vi.fn().mockResolvedValue(undefined);
    const open = vi.fn();
    const output: string[] = [];
    const startServer = vi.fn().mockResolvedValue(fakeServer(close));

    const running = uiRepository(".", {}, {
      startServer,
      openBrowser: open,
      writeConsole: (message) => output.push(message),
      process: events as unknown as Pick<NodeJS.Process, "once" | "off">,
    });
    await vi.waitFor(() => expect(open).toHaveBeenCalledOnce());
    events.emit("SIGINT");
    await running;

    expect(startServer).toHaveBeenCalledWith({ repository: "." });
    expect(open).toHaveBeenCalledWith("http://127.0.0.1:4173");
    expect(close).toHaveBeenCalledOnce();
    expect(output.join("")).toContain("Press Ctrl+C to stop.");
    expect(events.listenerCount("SIGINT")).toBe(0);
    expect(events.listenerCount("SIGTERM")).toBe(0);
  });

  it("honors --no-open and closes cleanly on SIGTERM", async () => {
    const events = new EventEmitter();
    const close = vi.fn().mockResolvedValue(undefined);
    const open = vi.fn();
    const running = uiRepository(".", { open: false, port: 4173 }, {
      startServer: vi.fn().mockResolvedValue(fakeServer(close)),
      openBrowser: open,
      writeConsole: () => {},
      process: events as unknown as Pick<NodeJS.Process, "once" | "off">,
    });
    await vi.waitFor(() => expect(events.listenerCount("SIGTERM")).toBe(1));
    events.emit("SIGTERM");
    await running;

    expect(open).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
  });
});
