import { getString, initLocale } from "./utils/locale";
import { registerPrefsScripts } from "./modules/preferenceScript";
import { HttpServer } from "./modules/httpServer";
import {
  getMcpEndpoint,
  getServerConfig,
  registerServerPrefObservers,
  unregisterServerPrefObservers,
} from "./modules/serverPreferences";

let httpServer: HttpServer | null = null;
let prefObserverIDs: symbol[] = [];
let restartTimer: ReturnType<typeof setTimeout> | null = null;

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);

  initLocale();
  registerPrefsPane();
  await refreshServer();
  prefObserverIDs = registerServerPrefObservers(scheduleServerRefresh);
  addon.data.initialized = true;
}

function registerPrefsPane() {
  Zotero.PreferencePanes.register({
    pluginID: addon.data.config.addonID,
    src: rootURI + "content/preferences.xhtml",
    label: getString("prefs-title"),
    image: `chrome://${addon.data.config.addonRef}/content/icons/favicon.png`,
    stylesheets: [rootURI + "content/zoteroPane.css"],
  });
}

async function refreshServer() {
  const serverConfig = getServerConfig();

  if (!httpServer) {
    httpServer = new HttpServer();
  }

  httpServer.stop();

  if (!serverConfig.enable) {
    ztoolkit.log("[zotero-mcp-tags] MCP tag server disabled");
    return;
  }

  try {
    httpServer.start(serverConfig.port, serverConfig.allowRemote);
    ztoolkit.log(
      `[zotero-mcp-tags] MCP tag server listening at ${getMcpEndpoint(serverConfig)}`,
    );
  } catch (error) {
    Zotero.logError(error);
    ztoolkit.log(`[zotero-mcp-tags] Failed to start server: ${String(error)}`);
  }
}

function scheduleServerRefresh() {
  if (restartTimer) {
    clearTimeout(restartTimer);
  }

  restartTimer = setTimeout(() => {
    void refreshServer();
  }, 200);
}

async function onMainWindowLoad(_win: Window): Promise<void> {}

async function onMainWindowUnload(_win: Window): Promise<void> {}

function onShutdown(): void {
  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }

  unregisterServerPrefObservers(prefObserverIDs);
  prefObserverIDs = [];

  httpServer?.stop();
  httpServer = null;

  addon.data.alive = false;
  delete Zotero[addon.data.config.addonInstance];
}

async function onNotify(
  _event: string,
  _type: string,
  _ids: Array<string | number>,
  _extraData: { [key: string]: any },
) {
  return;
}

async function onPrefsEvent(type: string, data: { [key: string]: any }) {
  switch (type) {
    case "load":
      registerPrefsScripts(data.window);
      break;
    default:
      return;
  }
}

function onShortcuts(_type: string) {}

function onDialogEvents(_type: string) {}

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
  onNotify,
  onPrefsEvent,
  onShortcuts,
  onDialogEvents,
};
