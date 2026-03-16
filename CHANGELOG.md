# Changelog

All notable changes to this project will be documented in this file.

## 0.1.1 - 2026-03-16

- fixed OpenCode MCP schema compatibility by removing top-level `anyOf` usage
- replaced `write_tag` with three explicit tools: `add_tag`, `remove_tag`, and `set_tag`
- made destructive tag operations easier to protect with client-side permission prompts
- updated English and Chinese documentation with new tool names and OpenCode permission examples

## 0.1.0 - 2026-03-16

- initial release of `Zotero MCP Tags`
- added a lightweight Zotero 7 MCP server for batch tag operations
- supported batch tag add, remove, and replace workflows for items returned by `zotero-mcp`
- added a preference pane for local server enablement and endpoint configuration
