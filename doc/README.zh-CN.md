# Zotero MCP Tags

[![Zotero 7](https://img.shields.io/badge/Zotero-7-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Built with zotero-plugin-template](https://img.shields.io/badge/Built%20with-zotero--plugin--template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)

`Zotero MCP Tags` 是一个轻量的 Zotero 7 插件，提供一个专门用于批量打标签的 MCP 服务。

[English](../README.md) | [简体中文](README.zh-CN.md)

它被设计成与 [`zotero-mcp`](https://github.com/cookjohn/zotero-mcp) 配合使用：

- 用 `zotero-mcp` 搜索、查看和筛选条目
- 把返回的 `itemKey` 传给这个插件
- 调用 `write_tag` 批量添加、移除或替换标签

这个项目明确参考并补充了以下工作：

- [`cookjohn/zotero-mcp`](https://github.com/cookjohn/zotero-mcp)，用于 Zotero 检索、读取与 MCP 集成思路
- [`windingwind/zotero-actions-tags`](https://github.com/windingwind/zotero-actions-tags)，用于 Zotero 标签操作思路

## 为什么要做这个插件

`zotero-mcp` 功能很强也很全面，但这个项目只专注一件事：在检索之后，安全而高效地批量打标签。

这样的拆分有几个好处：

- 把检索和写入分开
- 给 Agent 更小、更聚焦的写操作面
- 返回每个条目的打标前后结果，便于校验
- 用一个本地 MCP endpoint 专门处理标签写入

## 功能特性

- 基于 `streamable_http` 的本地 MCP 服务
- 一个聚焦工具：`write_tag`
- 支持 `add`、`remove`、`set`
- 支持 `itemKey` 和 `itemKeys`
- 支持可选 `libraryID`
- 支持可选 `tagType`（`0` 普通标签，`1` 自动标签）
- 返回每个条目的 `beforeTags` 和 `afterTags`
- 提供 Zotero 偏好页用于配置启停、端口和远程访问

## 推荐工作流

1. 用 `zotero-mcp` 搜索你的文献库。
2. 收集搜索结果中的 `itemKey`。
3. 把这些 key 传给 `Zotero MCP Tags` 的 `write_tag`。
4. 检查返回的逐条结果。

一个典型 Agent 工作流：

- 用 `zotero-mcp` 搜索 `transformer interpretability` 相关文献
- 收集匹配条目的 `itemKey`
- 用 `write_tag` 调用 `action: "add"`，并添加 `tags: ["to-read", "interpretability"]`

## MCP 地址

默认本地 endpoint：

```text
http://127.0.0.1:23124/mcp
```

状态检查 endpoint：

```text
http://127.0.0.1:23124/mcp/status
```

## 工具

### `write_tag`

用于对 Zotero 条目进行批量添加、移除或替换标签。

输入示例：

```json
{
  "action": "add",
  "itemKeys": ["ABCD1234", "EFGH5678"],
  "tags": ["to-read", "llm"],
  "libraryID": 1,
  "tagType": 0
}
```

支持字段：

- `action`: `add` | `remove` | `set`
- `itemKey`: 单个条目 key
- `itemKeys`: 多个条目 key
- `tags`: 标签数组
- `libraryID`: 可选的 Zotero 文库 ID
- `tagType`: 可选，`0` 普通标签，`1` 自动标签

典型返回结构：

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

## OpenCode 配置示例

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

## 安装

### 用户安装

1. 从 GitHub Releases 下载最新的 `.xpi`。
2. 在 Zotero 中通过 `Tools -> Plugins` 安装。
3. 重启 Zotero。
4. 打开插件偏好页，确认标签服务已经启用。

### 开发环境

```bash
npm install
npm run build
```

构建产物位置：

```text
.scaffold/build/zotero-mcp-tags.xpi
```

热重载开发：

```bash
npm run start
```

## 偏好设置

当前偏好页支持：

- 启用或禁用本地 MCP 标签服务
- 修改监听端口
- 可选开启远程访问
- 显示当前 endpoint 和 MCP 客户端配置示例

默认值定义在 `addon/prefs.js`。

## 项目结构

- `src/modules/tagService.ts` - 标签写入逻辑
- `src/modules/streamableMCPServer.ts` - MCP 协议处理
- `src/modules/httpServer.ts` - 本地 HTTP 服务
- `src/hooks.ts` - 插件生命周期与服务启停
- `addon/content/preferences.xhtml` - 偏好页 UI

## 开发说明

- 基于 Zotero 7 bootstrapped plugin 架构
- 使用 `zotero-plugin-scaffold` 进行构建与打包
- 使用 `zotero-plugin-toolkit` 与 `zotero-types`

## 致谢

- 作者：ryougi
- 开发与实现支持：OpenCode
- 设计思路参考：cookjohn 的 `zotero-mcp`
- 插件模板来源：windingwind 的 `zotero-plugin-template`

## 许可证

当前仓库沿用了模板的 `AGPL-3.0-or-later` 许可证。

如果你准备在发布前改成别的许可证，需要同时更新 `package.json` 和 `LICENSE`，并确认与模板来源的许可证兼容性。
