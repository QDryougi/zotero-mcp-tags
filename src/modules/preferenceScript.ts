import { config } from "../../package.json";
import { getMcpEndpoint, getServerConfig } from "./serverPreferences";

export async function registerPrefsScripts(_window: Window) {
  if (!addon.data.prefs) {
    addon.data.prefs = {
      window: _window,
    };
  } else {
    addon.data.prefs.window = _window;
  }

  await updatePrefsUI();
  bindPrefEvents();
}

async function updatePrefsUI() {
  if (!addon.data.prefs?.window) {
    return;
  }

  const doc = addon.data.prefs.window.document;
  const serverConfig = getServerConfig();
  const endpoint = getMcpEndpoint(serverConfig);
  const statusText = serverConfig.enable
    ? `Running on ${endpoint}`
    : "Disabled";
  const configExample = {
    mcpServers: {
      zotero_tags: {
        transport: "streamable_http",
        url: endpoint,
      },
    },
  };

  const statusNode = doc.querySelector(
    `#${config.addonRef}-server-status`,
  ) as HTMLElement | null;
  if (statusNode) {
    statusNode.textContent = statusText;
  }

  const endpointNode = doc.querySelector(
    `#${config.addonRef}-endpoint`,
  ) as HTMLElement | null;
  if (endpointNode) {
    endpointNode.textContent = endpoint;
  }

  const configNode = doc.querySelector(
    `#${config.addonRef}-config`,
  ) as HTMLElement | null;
  if (configNode) {
    configNode.textContent = JSON.stringify(configExample, null, 2);
  }
}

function bindPrefEvents() {
  const doc = addon.data.prefs?.window.document;
  const root = doc?.documentElement as HTMLElement | null;

  if (!doc || !root || root.dataset.mcpTagsBound === "true") {
    return;
  }

  root.dataset.mcpTagsBound = "true";

  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-enable`)
    ?.addEventListener("command", () => {
      void updatePrefsUI();
    });

  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-allow-remote`)
    ?.addEventListener("command", () => {
      void updatePrefsUI();
    });

  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-port`)
    ?.addEventListener("change", (event: Event) => {
      const input = event.target as HTMLInputElement;
      const nextPort = sanitizePort(input.value);
      input.value = String(nextPort);
      Zotero.Prefs.set(`${config.prefsPrefix}.port`, nextPort, true);
      void updatePrefsUI();
    });
}

function sanitizePort(rawValue: string): number {
  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed)) {
    return 23124;
  }

  return Math.max(1, Math.min(65535, Math.round(parsed)));
}
