/**
 * dsh-session-tree — host 侧占位。
 *
 * 本插件替换官方 ui-workspace 的浏览器侧模块（接管 sidebar.workspaces 插槽），
 * 在原生会话树上叠加标签显示。数据经 dsh-session-manager 的 REST 接口获取，
 * host 侧无需注册服务。
 */
export default function apply() {
  // 无 host 侧行为。
}
