/**
 * dsh-session-tree — host 侧入口。
 *
 * 本插件同时承载两端能力：
 *   - 浏览器端（lib/client.js）：接管 sidebar.workspaces 插槽，提供会话树增强
 *     （按标签分组、归档独立文件夹、工作区排序、收藏会话）。
 *   - host 端（本文件）：转发到 plugins/session-manager.js，提供 agent 工具
 *     （session_list / session_move / session_delete / session_tag /
 *     session_archive / session_unarchive）与浏览器 REST 路由
 *     （/api/dsh-session-manager/*）。
 *
 * 采用转发而非搬运：session-manager.js 保持单一实现，本文件只负责把它挂进
 * 本插件的 host 侧，从而在配置层只注册一个插件条目。
 */
import applySessionManager from "../../session-manager.js";

/**
 * Plug the session-manager host half into this plugin's scope.
 * @param ctx - cordis context provided by the loader.
 */
function apply(ctx) {
  applySessionManager(ctx);
}

/** Host-side service dependencies, mirroring session-manager.js exactly. */
apply.inject = ["tools", "workspaceRegistry", "storageDomain", "sessionPersistence", "systemPrompt", "webServer"];

export default apply;
export { apply };
