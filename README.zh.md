# dsh-session-tree

DSH 侧栏的增强会话树：官方 `ui-workspace` 的树，加上标签、按标签分组、跨工作区拖拽移动，以及可先备份再删的删除动作。

fork 自 `@deepseek-ai/dsh-client-ui-workspace`（0.1.7 的树），独立成包发布，官方包原样不动。

## 适用版本

| | |
|---|---|
| DSH | `0.2.1-rc.2`（开发与验证所用版本） |
| `@deepseek-ai/cordis` | `~4.0.5` |
| React | 18.2+ |
| 运行模式 | Web UI（`web` 或 `desktop` profile） |
| **配套** | **[`dsh-session-manager`](https://github.com/minhaoli/dsh-session-manager) —— 标签、移动、删除都依赖它** |

更早的 DSH 版本未验证。

## 安装

两个包，按顺序装：

```bash
dsh plugin --profile <你的 profile> add github:minhaoli/dsh-session-manager
dsh plugin --profile <你的 profile> add github:minhaoli/dsh-session-tree
```

然后**把官方的 `ui-workspace` 行停掉**，因为本包注册的是同一个 `uiWorkspace` 服务：

```yaml
# ~/.dsh/profiles/<profile>/cordis.patch.yml
- id: ui-workspace
  disabled: true
```

装完刷新一次页面 —— 浏览器侧是作为独立模块提供的。

## 对 session-manager 的依赖

浏览器侧不走 IPC 桥，直接调同源 REST：

| 用途 | 端点 |
|---|---|
| 读全部标签 | `GET /api/dsh-session-manager/tags` |
| 写某个会话的标签 | `PUT /api/dsh-session-manager/tags` |
| 删除会话 | `POST /api/dsh-session-manager/sessions/delete` |
| 移动会话 | `POST /api/dsh-session-manager/sessions/move` |

这四个端点由 **`dsh-session-manager`** 提供。缺了它，`tagRead()` 会吞掉异常返回 `{}` —— 树照常渲染，但标签全空、写入静默无效、拖拽移动和删除失败。标签看起来不对劲时，先确认 `dsh-session-manager` 装了、并且它的 REST 路由注册成功（需要 `webServer`）。

## 相对官方树多出来的东西

| 功能 | 位置 |
|---|---|
| 会话行上的标签 chip | `sidebar.workspaces.session.row.action` |
| 标签 / 移动 / 删除菜单项 | `sidebar.workspaces.session.menu.item` |
| 按标签分组 | 树的头部 |
| 把会话拖到别的工作区 | 会话行 |
| 归档与取消归档 | 行菜单（取消归档是 GUI 原本缺的方向） |

标签数据存在 `~/.dsh/session-tags.json`，由 `dsh-session-manager` 写入，所以重启后还在，会话跨工作区移动时也跟着走。

客户端每 20 秒轮询一次标签刷新。在另一个窗口写的标签，最多 20 秒后出现在这个窗口。

## 实现说明

- `lib/index.js` 是 host 侧占位 —— `export default function apply() {}`。bundle patch 用一行同时挂两端，所以 host 侧必须存在，否则整个包组不起来。
- `lib/client.js`（约 260 KB、6015 行）是构建出来的 fork 产物。它的 `sourceMappingURL` 仍指向 `@deepseek-ai/dsh-client-ui-workspace`，CSS 标签的 `dataset.plugin` 也还是 `@deepseek-ai/dsh-client-ui-workspace` —— 这是上游来源标记，不是 bug。
- `client.js` 里定义了 `class UiWorkspaceService extends Service` 并调用 `super(ctx, "uiWorkspace")`。这就是必须停掉官方那行的原因：同一个 `uiWorkspace` 注册不了两次。
- 本包挂到 `sidebar.workspaces.session.menu.item`、`sidebar.workspaces.session.row.action` 和 `shell.overlay`，并注入它构建所依赖的官方客户端包（`dsh-api-remotes`、`dsh-api-session-controller`、`dsh-api-workspace-controller`、`dsh-client-connection`、`dsh-client-locale`、`dsh-client-shortcuts`、`dsh-client-ui-conversation`、`dsh-client-ui-layout`、`dsh-client-ui-renderer`、`dsh-client-ui-session`、`dsh-client-ui-sidebar`）。

## 配套插件

- [`dsh-session-manager`](https://github.com/minhaoli/dsh-session-manager) —— **必需**：这棵树读写的就是它的 REST API。
- [`dsh-session-query-vector`](https://github.com/minhaoli/dsh-session-query-vector) —— 会话语义搜索后端。
- [`dsh-session-search`](https://github.com/minhaoli/dsh-session-search) —— 对话内查找栏。
- [`dsh-ui-reload`](https://github.com/minhaoli/dsh-ui-reload) —— 一键重载前端按钮。

## 许可

MIT —— 见 [LICENSE](./LICENSE)。打包进来的客户端代码派生自 `@deepseek-ai/dsh-client-ui-workspace`，再分发时留意上游许可条款。
