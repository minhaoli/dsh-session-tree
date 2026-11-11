/**
 * dsh-session-tree — host 侧入口。
 *
 * 本插件同时承载两端能力：
 *   - 浏览器端（lib/client.js）：接管 sidebar.workspaces 插槽，提供会话树增强
 *     （按标签分组、归档独立文件夹、工作区排序、收藏会话）。
 *   - host 端（lib/host.js）：session-manager 的 host 半，提供 agent 工具
 *     （session_list / session_move / session_delete / session_tag /
 *     session_archive / session_unarchive）与浏览器 REST 路由
 *     （/api/dsh-session-manager/*）。
 *
 * host 半以内联副本随包发布（来源与 digest 见 lib/host.js 头部）。因此安装本包
 * 不需要在 profile 的 plugins/ 目录里另放文件，也不依赖 dsh-session-manager 是否
 * 装在同一台机器上。反过来，本副本已经注册了这些工具与路由，所以不要同时挂载
 * dsh-session-manager —— 两者只能存在一个。
 *
 * 更新内联副本：node scripts/sync-host.mjs <dsh-session-manager 检出目录>
 */
import applySessionManager from "./host.js";

/**
 * Plug the session-manager host half into this plugin's scope.
 * @param ctx - cordis context provided by the loader.
 */
function apply(ctx) {
  applySessionManager(ctx);
}

/** Host-side service dependencies, mirroring the vendored host half exactly. */
apply.inject = ["tools", "workspaceRegistry", "storageDomain", "sessionPersistence", "systemPrompt", "webServer"];

export default apply;
export { apply };
