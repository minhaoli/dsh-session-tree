# dsh-session-tree

An enhanced session tree for the DSH sidebar: the official `ui-workspace` tree plus tags, tag grouping, drag-to-move across workspaces, and a delete action that can back sessions up first.

Forked from `@deepseek-ai/dsh-client-ui-workspace` (0.1.7 tree) and shipped as a separate bundle so the official package stays untouched.

## Requirements

| | |
|---|---|
| DSH | `0.2.1-rc.2` (developed and tested against it) |
| `@deepseek-ai/cordis` | `~4.0.5` |
| React | 18.2+ |
| Mode | Web UI (`web` or `desktop` profile) |
| **Companion** | **[`dsh-session-manager`](https://github.com/minhaoli/dsh-session-manager) — required for tags, moves and deletes** |

Earlier DSH releases are untested.

## Install

Two packages, in this order:

```bash
dsh plugin --profile <your-profile> add github:minhaoli/dsh-session-manager
dsh plugin --profile <your-profile> add github:minhaoli/dsh-session-tree
```

Then **disable the official `ui-workspace` row**, because this package registers the same `uiWorkspace` service:

```yaml
# ~/.dsh/profiles/<profile>/cordis.patch.yml
- id: ui-workspace
  disabled: true
```

Reload the page after installing — the client half is served as a separate module.

## The session-manager dependency

The browser half does not talk to the host over an IPC bridge. It calls a same-origin REST API under `/api/dsh-session-manager/`:

| Call | Endpoint |
|---|---|
| Read all tags | `GET /api/dsh-session-manager/tags` |
| Write one session's tags | `PUT /api/dsh-session-manager/tags` |
| Delete sessions | `POST /api/dsh-session-manager/sessions/delete` |
| Move sessions | `POST /api/dsh-session-manager/sessions/move` |

Those four endpoints are served by **`dsh-session-manager`**. Without it, `tagRead()` catches the failure and returns `{}` — the tree still renders, but every tag is empty, writes silently do nothing, and drag-to-move / delete fail. If tags look broken, check that `dsh-session-manager` is installed and that its REST routes registered (`webServer` present).

## What it adds to the official tree

| Feature | Where |
|---|---|
| Tag chips on session rows | `sidebar.workspaces.session.row.action` |
| Tag / move / delete menu entries | `sidebar.workspaces.session.menu.item` |
| Grouping the tree by tag | the tree header |
| Drag a session onto another workspace | the session row |
| Archive and unarchive | the row menu (unarchive is the direction the GUI lacks) |

The tag data lives in `~/.dsh/session-tags.json`, written by `dsh-session-manager`, so tags survive restarts and ride along when a session moves across workspaces.

The client polls for tag refreshes every 20 seconds. That is the interval a tag written from another window shows up in this one.

## Implementation notes

- `lib/index.js` is a host-side placeholder — `export default function apply() {}`. The bundle patch mounts both halves in one row, so the host half has to exist for the package to compose.
- `lib/client.js` (≈260 KB, 6015 lines) is the built fork. Its `sourceMappingURL` still points at `@deepseek-ai/dsh-client-ui-workspace` and the CSS tag keeps `dataset.plugin = "@deepseek-ai/dsh-client-ui-workspace"` — that is the upstream provenance, not a bug.
- `client.js` defines `class UiWorkspaceService extends Service` and calls `super(ctx, "uiWorkspace")`. That is why the official row must be disabled: two registrations of `uiWorkspace` cannot coexist.
- The package mounts into `sidebar.workspaces.session.menu.item`, `sidebar.workspaces.session.row.action` and `shell.overlay`, and injects the official client packages it builds on (`dsh-api-remotes`, `dsh-api-session-controller`, `dsh-api-workspace-controller`, `dsh-client-connection`, `dsh-client-locale`, `dsh-client-shortcuts`, `dsh-client-ui-conversation`, `dsh-client-ui-layout`, `dsh-client-ui-renderer`, `dsh-client-ui-session`, `dsh-client-ui-sidebar`).

## Companion plugins

- [`dsh-session-manager`](https://github.com/minhaoli/dsh-session-manager) — **required**: the REST API this tree reads and writes.
- [`dsh-session-query-vector`](https://github.com/minhaoli/dsh-session-query-vector) — semantic session search backend.
- [`dsh-session-search`](https://github.com/minhaoli/dsh-session-search) — in-conversation find bar.
- [`dsh-ui-reload`](https://github.com/minhaoli/dsh-ui-reload) — one-click frontend reload button.

## License

MIT — see [LICENSE](./LICENSE). The bundled client code derives from `@deepseek-ai/dsh-client-ui-workspace`; keep the upstream license terms in mind when redistributing.
