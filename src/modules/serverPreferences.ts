import { config } from "../../package.json";

export interface ServerConfig {
  enable: boolean;
  port: number;
  allowRemote: boolean;
}

const OBSERVED_PREFS = ["enable", "port", "allowRemote"] as const;

function sanitizePort(rawValue: unknown): number {
  const port = Number(rawValue);

  if (!Number.isFinite(port)) {
    return 23124;
  }

  return Math.max(1, Math.min(65535, Math.round(port)));
}

export function getServerConfig(): ServerConfig {
  return {
    enable: Boolean(Zotero.Prefs.get(`${config.prefsPrefix}.enable`, true)),
    port: sanitizePort(Zotero.Prefs.get(`${config.prefsPrefix}.port`, true)),
    allowRemote: Boolean(
      Zotero.Prefs.get(`${config.prefsPrefix}.allowRemote`, true),
    ),
  };
}

export function getMcpEndpoint(serverConfig = getServerConfig()): string {
  const host = serverConfig.allowRemote ? "0.0.0.0" : "127.0.0.1";
  return `http://${host}:${serverConfig.port}/mcp`;
}

export function registerServerPrefObservers(
  observer: (name: string) => void,
): symbol[] {
  return OBSERVED_PREFS.map((key) =>
    Zotero.Prefs.registerObserver(
      `${config.prefsPrefix}.${key}`,
      () => observer(key),
      true,
    ),
  );
}

export function unregisterServerPrefObservers(observerIDs: symbol[]) {
  for (const observerID of observerIDs) {
    Zotero.Prefs.unregisterObserver(observerID);
  }
}
