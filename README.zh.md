# dsh-session-tree

DSH 侧栏的增强会话树：官方 `ui-workspace` 的树，加上标签、按标签分组、跨工作区拖拽移动、可先备份再删的删除动作，以及工作区排序、收藏会话与四态筛选。

fork 自 `@deepseek-ai/dsh-client-ui-workspace`（0.2.1 的树），独立成包发布，官方包原样不动。

## 适用版本

| | |
|---|---|
| DSH | `0.2.2-rc.1`（验证所用版本），`0.2.1-rc.2` 亦可用 |
| `@deepseek-ai/cordis` | `~4.0.5` |
| React | 18.2+ |
| 运行模式 | Web UI（`web` 或 `desktop` profile） |
| 配套 | [`dsh-session-manager`](https://github.com/minhaoli/dsh-session-manager) —— 标签、移动、删除、REST 路由都来自它 |

更早的 DSH 版本未验证。

## 安装

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

## host 侧转发到 session-manager

`lib/index.js` 不再是无行为的占位，而是转发到 `../../session-manager.js`：

```js
import applySessionManager from "../../session-manager.js";
```

它同时用 `apply.inject` 声明了 6 个 host 服务依赖（`tools`、`workspaceRegistry`、`storageDomain`、`sessionPersistence`、`systemPrompt`、`webServer`），与 `session-manager.js` 自身完全一致。这样就可以在配置层只注册一个插件条目，`session-manager.js` 保持单一实现、原文件不动。

因此这个转发**要求该文件真实存在**：`<profile>/plugins/session-manager.js`（即 `dsh-session-manager` 的 host 文件放在 profile 的 `plugins/` 目录下）。文件不在位时 host 半导入失败，插件不会被组合。这是当前版本的一个硬约束，不是可选项。

## 对 session-manager 的 REST 依赖

浏览器侧不走 IPC 桥，直接调同源 REST：

| 用途 | 端点 |
|---|---|
| 读全部标签 | `GET /api/dsh-session-manager/tags` |
| 写某个会话的标签 | `PUT /api/dsh-session-manager/tags` |
| 删除会话 | `POST /api/dsh-session-manager/sessions/delete` |
| 移动会话 | `POST /api/dsh-session-manager/sessions/move` |

缺了 host 半，`tagRead()` 会吞掉异常返回 `{}` —— 树照常渲染，但标签全空、写入静默无效、拖拽移动和删除失败。标签看起来不对劲时，先确认 REST 路由注册成功（需要 `webServer`）。

## 相对官方树多出来的东西

| 功能 | 位置 |
|---|---|
| 会话行上的标签 chip | `sidebar.workspaces.session.row.action` |
| 标签 / 移动 / 删除 / 收藏菜单项 | `sidebar.workspaces.session.menu.item` |
| 按标签分组 | 树的头部 |
| 把会话拖到别的工作区 | 会话行 |
| 归档与取消归档 | 行菜单（取消归档是 GUI 原本缺的方向） |
| 工作区排序 | 视图选项 |
| 收藏文件夹 | 树的底部 |
| 四态筛选 | 视图选项 |

标签与收藏的数据都写在 `~/.dsh/session-tags.json`，所以重启后还在，会话跨工作区移动时也跟着走。客户端每 20 秒轮询一次标签刷新。

## 工作区排序

视图选项里的「工作区排序」三选一：

| 选项 | 行为 |
|---|---|
| 默认顺序 | host 给的原始顺序 |
| 最近编辑时间 | 按该工作区最近更新的会话时间倒序 |
| 工作区名称 | 按标题中文排序 |

实现是 `orderWorkspaces()`，接入 `orderedWorkspaces`，只调整工作区实体顺序，不影响组内会话排序。选择存进 view store 的 `workspaceOrderBy`，重启后保持。

## 收藏会话

- 右键菜单顶部有「收藏会话 / 取消收藏」。
- 收藏后在树底部出现独立的「收藏」文件夹，结构与「已归档」同构：按原工作区分桶、每个桶可折叠、带折叠箭头。
- 与归档的关键差异：收藏夹**不过滤归档状态**，已归档与未归档的收藏都会显示。
- 存储复用 `session-tags.json`，用保留键 `__fav__`。该键在标签编辑器、行内标签、标签选择列表里都会被过滤，不会污染既有标签。
- 标签编辑器的 `commit` 会保留收藏标记，改标签不会丢收藏。

## 筛选会话

「筛选会话」是四个互斥选项：

| 选项 | 归档会话 | 收藏夹 |
|---|---|---|
| 全部对话 | 显示 | 显示 |
| 隐藏已归档 | 隐藏 | 显示 |
| 隐藏已收藏 | 显示 | 隐藏 |
| 全部隐藏 | 隐藏 | 隐藏 |

内部仍由 `archivedFilter` + `favoriteFilter` 两个状态表示，但四个选项覆盖了全部有意义组合，体验等同于单选。同时修掉了高亮映射错误（原先 `filter-show-show` 对不上任何菜单 id，导致一个都不打勾）。

## 实现说明

- `lib/index.js` 是 host 侧转发入口，见上文。
- `lib/client.js`（269814 字节、6225 行）是构建出来的 fork 产物，基线为官方 `dsh-client-ui-workspace` bundle，在其上叠加注入与增强块。它的 `sourceMappingURL` 仍指向上游包、CSS 标签的 `dataset.plugin` 也还是上游名 —— 这是来源标记，不是 bug。
- `client.js` 里定义了 `class UiWorkspaceService extends Service` 并调用 `super(ctx, "uiWorkspace")`。这就是必须停掉官方那行的原因：同一个 `uiWorkspace` 注册不了两次。
- 本包挂到 `sidebar.workspaces.session.menu.item`、`sidebar.workspaces.session.row.action` 和 `shell.overlay`，并注入它构建所依赖的官方客户端包（`dsh-api-remotes`、`dsh-api-session-controller`、`dsh-api-workspace-controller`、`dsh-client-connection`、`dsh-client-locale`、`dsh-client-shortcuts`、`dsh-client-ui-conversation`、`dsh-client-ui-layout`、`dsh-client-ui-renderer`、`dsh-client-ui-session`、`dsh-client-ui-sidebar`）。

## 更新日志

### 0.3.0

架构

- `lib/index.js` 从空占位改为转发到 `../../session-manager.js`，并由 `apply.inject` 声明 6 个 host 服务依赖
- 配置层移除 session-manager 的独立注册行，只保留一个插件条目
- `session-manager.js` 原文件不动，代码不重复，可随时回退

新增

- 工作区排序：默认顺序 / 最近编辑时间 / 工作区名称，状态持久化
- 收藏会话：右键收藏、底部收藏夹（不过滤归档）、`__fav__` 保留键与各处过滤
- 筛选会话重构为四态单选

迭代中修正

| 问题 | 修正 |
|---|---|
| 收藏筛选最初只有文件夹、没有筛选 | 补上筛选开关 |
| 三选一开关语义不清 | 改为单一「隐藏收藏」开关 |
| 开关独立成栏，突兀 | 并入筛选会话栏 |
| 「全部对话」不重置收藏，收藏看不见 | 点击时同时复位收藏状态 |
| 两个维度平铺在一组，勾选逻辑怪异 | 拆成两个子组，各自三态 |
| 子组仍不直观 | 最终扁平为四态单选 |
| `filter-show-show` 对不上任何菜单 id，一个都不打勾 | 修正高亮映射 |

### 0.2.0

标签 chip、按标签分组、拖拽移动、归档与取消归档、先备份再删除。

## 验证状态

0.3.0 的三项功能与 host 合并都只做过静态检查（`node --check`），**尚未完成运行时验证**。启用前建议重启 DSH 后刷新页面，确认三件事：工作区排序三项生效且重启保持、收藏夹与四态筛选正确、标签菜单不显示 `__fav__` 且 session-manager 的 agent 工具仍可用。

## 配套插件

- [`dsh-session-manager`](https://github.com/minhaoli/dsh-session-manager) —— **必需**：host 半与 REST API 都来自它。
- [`dsh-session-query-vector`](https://github.com/minhaoli/dsh-session-query-vector) —— 会话语义搜索后端。
- [`dsh-session-search`](https://github.com/minhaoli/dsh-session-search) —— 对话内查找栏。
- [`dsh-ui-reload`](https://github.com/minhaoli/dsh-ui-reload) —— 一键重载前端按钮。

## 许可

MIT —— 见 [LICENSE](./LICENSE)。打包进来的客户端代码派生自 `@deepseek-ai/dsh-client-ui-workspace`，再分发时留意上游许可条款。
