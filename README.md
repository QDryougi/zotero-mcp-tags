# Zotero MCP Tags

[![Zotero 7](https://img.shields.io/badge/Zotero-7-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Built with zotero-plugin-template](https://img.shields.io/badge/Built%20with-zotero--plugin--template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)

`Zotero MCP Tags` is a lightweight Zotero 7 plugin that exposes a dedicated MCP server for batch tagging.

[English](README.md) | [简体中文](doc/README.zh-CN.md)

It is designed to work alongside [`zotero-mcp`](https://github.com/cookjohn/zotero-mcp):

- use `zotero-mcp` to search, inspect, and filter items
- pass the returned `itemKey` values to this plugin
- call `write_tag` to batch add, remove, or replace tags

This project is explicitly inspired by and intended to complement:

- [`cookjohn/zotero-mcp`](https://github.com/cookjohn/zotero-mcp) for Zotero search, retrieval, and MCP integration patterns
- [`windingwind/zotero-actions-tags`](https://github.com/windingwind/zotero-actions-tags) for Zotero tag operation ideas

## Why this plugin exists

`zotero-mcp` is powerful and broad. This project focuses on one narrow workflow: safe, fast batch tagging after search.

That split makes it easier to:

- keep retrieval and mutation separate
- give agents a smaller write surface
- return per-item before/after tag results for verification
- run a simple local MCP endpoint just for tag operations

## Features

- local MCP server using `streamable_http`
- one focused tool: `write_tag`
- supports `add`, `remove`, and `set`
- supports `itemKey` and `itemKeys`
- optional `libraryID`
- optional `tagType` (`0` regular, `1` automatic)
- per-item result reporting with `beforeTags` and `afterTags`
- Zotero preference pane for enable/port/remote-access settings

## Recommended workflow

1. Use `zotero-mcp` to search your library.
2. Collect the resulting `itemKey` values.
3. Send those keys to `Zotero MCP Tags` via `write_tag`.
4. Inspect the returned per-item results.

Example agent workflow:

- search papers about `transformer interpretability` using `zotero-mcp`
- collect matching `itemKey`s
- call `write_tag` with `action: "add"` and `tags: ["to-read", "interpretability"]`

## MCP endpoint

Default local endpoint:

```text
http://127.0.0.1:23124/mcp
```

Status endpoint:

```text
http://127.0.0.1:23124/mcp/status
```

## Tool

### `write_tag`

Batch add, remove, or replace tags on Zotero items.

Input:

```json
{
  "action": "add",
  "itemKeys": ["ABCD1234", "EFGH5678"],
  "tags": ["to-read", "llm"],
  "libraryID": 1,
  "tagType": 0
}
```

Supported fields:

- `action`: `add` | `remove` | `set`
- `itemKey`: single item key
- `itemKeys`: multiple item keys
- `tags`: tag list
- `libraryID`: optional Zotero library ID
- `tagType`: optional, `0` regular tag or `1` automatic tag

Typical response shape:

```json
{
  "success": true,
  "action": "add",
  "tagsRequested": ["to-read", "llm"],
  "itemCount": 2,
  "successCount": 2,
  "failureCount": 0,
  "results": [
    {
      "success": true,
      "itemKey": "ABCD1234",
      "beforeTags": ["paper"],
      "afterTags": ["paper", "to-read", "llm"]
    }
  ]
}
```

## OpenCode example

```json
{
  "mcp": {
    "zotero": {
      "type": "remote",
      "url": "http://127.0.0.1:23120/mcp",
      "enabled": true,
      "timeout": 10000
    },
    "zotero_tags": {
      "type": "remote",
      "url": "http://127.0.0.1:23124/mcp",
      "enabled": true,
      "timeout": 10000
    }
  }
}
```

## Install

### For users

1. Download the latest `.xpi` from GitHub Releases.
2. Install it in Zotero via `Tools -> Plugins`.
3. Restart Zotero.
4. Open the plugin preferences and confirm the tagging server is enabled.

### For development

```bash
npm install
npm run build
```

Build output:

```text
.scaffold/build/zotero-mcp-tags.xpi
```

For hot reload development:

```bash
npm run start
```

## Preferences

The plugin preference pane currently exposes:

- enable or disable the local MCP tagging server
- change the listening port
- optionally allow remote access
- show the current endpoint and a sample MCP client config

Default values are defined in `addon/prefs.js`.

## Project structure

- `src/modules/tagService.ts` - tag mutation logic
- `src/modules/streamableMCPServer.ts` - MCP protocol handling
- `src/modules/httpServer.ts` - local HTTP server
- `src/hooks.ts` - plugin lifecycle and server startup/shutdown
- `addon/content/preferences.xhtml` - preferences UI

## Development notes

- built for Zotero 7 bootstrapped plugin architecture
- uses `zotero-plugin-scaffold` for build and packaging
- uses `zotero-plugin-toolkit` and `zotero-types`

## Credits

- Author: ryougi
- Development and implementation support: OpenCode
- Inspired by `zotero-mcp` by cookjohn
- Built from `zotero-plugin-template` by windingwind

## License

This repository currently inherits the template's `AGPL-3.0-or-later` license.

If you want to switch to a different license before publishing, update both `package.json` and `LICENSE`.
