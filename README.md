# dsh-session-tree

An enhanced session tree for the DSH sidebar: the official `ui-workspace` tree plus tags, tag grouping, drag-to-move across workspaces, a delete action that can back sessions up first, workspace ordering, favourite sessions, and a four-state filter.

Forked from `@deepseek-ai/dsh-client-ui-workspace` (the 0.2.1 tree) and shipped as a separate bundle so the official package stays untouched.

## Requirements

| | |
|---|---|
| DSH | `0.2.2-rc.1` (verified against it); `0.2.1-rc.2` also works |
| `@deepseek-ai/cordis` | `~4.0.5` |
| React | 18.2+ |
| Mode | Web UI (`web` or `desktop` profile) |
| Companion | [`dsh-session-manager`](https://github.com/minhaoli/dsh-session-manager) — the source of the host half, vendored into this package; no separate install needed |

Earlier DSH releases are untested.

## Install

```bash
dsh plugin --profile <your-profile> add github:minhaoli/dsh-session-tree
```

Then **disable the official `ui-workspace` row**, because this package registers the same `uiWorkspace` service:

```yaml
# ~/.dsh/profiles/<profile>/cordis.patch.yml
- id: ui-workspace
  disabled: true
```

Do not mount `dsh-session-manager` as well: its host half is vendored into this package, and mounting both registers the same tools and routes twice.

Reload the page after installing — the client half is served as a separate module.

## The host half is a vendored session-manager

This plugin's host half is the host half of `dsh-session-manager`, shipped as a vendored copy in `lib/host.js` and imported by `lib/index.js`:

```js
import applySessionManager from "./host.js";
```

`lib/index.js` declares the six host services through `apply.inject` (`tools`, `workspaceRegistry`, `storageDomain`, `sessionPersistence`, `systemPrompt`, `webServer`), exactly as the host half declares them itself.

That makes the package self-contained: no `session-manager.js` has to be placed in a profile's `plugins/` directory, and it does not matter whether `dsh-session-manager` is installed on the machine.

The head of `lib/host.js` records the source repository, the upstream commit and the sha256 of the upstream file. To follow upstream, regenerate it with the script instead of editing by hand:

```bash
git clone https://github.com/minhaoli/dsh-session-manager ../dsh-session-manager
node scripts/sync-host.mjs ../dsh-session-manager
```

The cost is that roughly 60 KB of code now exists in two repositories. The sync script refuses a source that does not export `apply` and writes the digest into the file head, so the drift between the two stays visible.

Because this copy already registers the six agent tools and the `/api/dsh-session-manager/` routes, **do not mount `dsh-session-manager` itself at the same time**: both would register the same tools and routes.

## The session-manager REST dependency

The browser half does not talk to the host over an IPC bridge. It calls a same-origin REST API under `/api/dsh-session-manager/`:

| Call | Endpoint |
|---|---|
| Read all tags | `GET /api/dsh-session-manager/tags` |
| Write one session's tags | `PUT /api/dsh-session-manager/tags` |
| Delete sessions | `POST /api/dsh-session-manager/sessions/delete` |
| Move sessions | `POST /api/dsh-session-manager/sessions/move` |

Without the host half, `tagRead()` catches the failure and returns `{}` — the tree still renders, but every tag is empty, writes silently do nothing, and drag-to-move / delete fail. If tags look broken, check that the REST routes registered (`webServer` present).

## What it adds to the official tree

| Feature | Where |
|---|---|
| Tag chips on session rows | `sidebar.workspaces.session.row.action` |
| Tag / move / delete / favourite menu entries | `sidebar.workspaces.session.menu.item` |
| Grouping the tree by tag | the tree header |
| Drag a session onto another workspace | the session row |
| Archive and unarchive | the row menu (unarchive is the direction the GUI lacks) |
| Workspace ordering | view options |
| Favourites folder | bottom of the tree |
| Four-state filter | view options |

Tags and favourites both live in `~/.dsh/session-tags.json`, so they survive restarts and ride along when a session moves across workspaces. The client polls for tag refreshes every 20 seconds.

## Workspace ordering

View options offer three orders:

| Option | Behaviour |
|---|---|
| Default | the order the host reports |
| Recently edited | by the newest session update inside each workspace, descending |
| Workspace name | by title, Chinese collation |

`orderWorkspaces()` feeds `orderedWorkspaces` and only reorders workspace entities — session order inside a group is untouched. The choice is stored in the view store as `workspaceOrderBy` and survives a restart.

## Favourite sessions

- The top of the row menu offers 收藏会话 / 取消收藏.
- A favourited session appears in a separate 收藏 folder at the bottom of the tree, isomorphic to 已归档: bucketed by the original workspace, each bucket collapsible with an arrow.
- Unlike the archive folder it does **not** filter on archive state — archived and unarchived favourites both show.
- Storage reuses `session-tags.json` with the reserved key `__fav__`. That key is filtered out of the tag editor, the inline tag row and the tag picker, so it cannot pollute the user's real tags.
- The tag editor's `commit` preserves the favourite marker, so editing tags never drops a favourite.

## The four-state filter

筛选会话 is one of four mutually exclusive options:

| Option | Archived sessions | Favourites folder |
|---|---|---|
| Show everything | shown | shown |
| Hide archived | hidden | shown |
| Hide favourites | shown | hidden |
| Hide both | hidden | hidden |

Internally this is still `archivedFilter` + `favoriteFilter`, but the four options cover every meaningful combination, so it behaves as a single choice. The same release fixes the highlight mapping: `filter-show-show` used to match no menu id, leaving every option unchecked.

## Implementation notes

- `lib/index.js` is the host-side entry: it mounts the vendored host half (`lib/host.js`) into this plugin's scope and declares the six host services it needs.
- `lib/client.js` (269,814 bytes, 6,225 lines) is the built fork. Its `sourceMappingURL` still points at the upstream package and the CSS tag keeps `dataset.plugin` at the upstream name — that is provenance, not a bug.
- `client.js` defines `class UiWorkspaceService extends Service` and calls `super(ctx, "uiWorkspace")`. That is why the official row must be disabled: two registrations of `uiWorkspace` cannot coexist.
- The package mounts into `sidebar.workspaces.session.menu.item`, `sidebar.workspaces.session.row.action` and `shell.overlay`, and injects the official client packages it builds on (`dsh-api-remotes`, `dsh-api-session-controller`, `dsh-api-workspace-controller`, `dsh-client-connection`, `dsh-client-locale`, `dsh-client-shortcuts`, `dsh-client-ui-conversation`, `dsh-client-ui-layout`, `dsh-client-ui-renderer`, `dsh-client-ui-session`, `dsh-client-ui-sidebar`).

## Changelog

### 0.3.1

- the host half changed from "a forward into the profile's `session-manager.js`" to a **vendored copy** (`lib/host.js`): installing no longer depends on a file outside the package
- added `scripts/sync-host.mjs`, which regenerates the vendored copy from an upstream checkout and records the source commit and sha256 in the file head
- docs: install is one command now, and mounting `dsh-session-manager` alongside is called out as unsupported

### 0.3.0

Architecture

- `lib/index.js` changed from an empty placeholder to a forward into `../../session-manager.js`, declaring six host services through `apply.inject`
- the profile drops the separate session-manager row and keeps a single plugin entry
- `session-manager.js` itself is untouched, so no code is duplicated and the change can be reverted at any time

Added

- workspace ordering: default / recently edited / workspace name, persisted
- favourite sessions: row action, bottom folder that does not filter archived state, reserved `__fav__` key filtered everywhere tags are read
- the session filter reworked into a four-state single choice

Fixed while iterating

| Problem | Fix |
|---|---|
| favourites had a folder but no filter | added the filter switch |
| the three-way switch was unclear | replaced by a single "hide favourites" toggle |
| the toggle sat in its own row | folded into the filter row |
| "show everything" did not reset favourites | resets the favourite state too |
| two dimensions flattened into one group, odd checkbox logic | split into two sub-groups with their own tri-state |
| sub-groups still not obvious | flattened to four mutually exclusive options |
| `filter-show-show` matched no menu id, nothing was checked | fixed the highlight mapping |

### 0.2.0

Tag chips, group-by-tag, drag-to-move, archive/unarchive, delete with backup.

## Verification status

The three new features and the host merge in 0.3.0 have passed static checks (`node --check`) only; **they have not been verified at runtime yet**. Before relying on them, restart DSH and reload the page, then confirm: the three workspace orders apply and persist, favourites and the four-state filter behave, the tag menu never shows `__fav__`, and the session-manager agent tools still work.

## Companion plugins

- [`dsh-session-manager`](https://github.com/minhaoli/dsh-session-manager) — **required**: both the host half and the REST API come from it.
- [`dsh-session-query-vector`](https://github.com/minhaoli/dsh-session-query-vector) — semantic session search backend.
- [`dsh-session-search`](https://github.com/minhaoli/dsh-session-search) — in-conversation find bar.
- [`dsh-ui-reload`](https://github.com/minhaoli/dsh-ui-reload) — one-click frontend reload button.

## License

MIT — see [LICENSE](./LICENSE). The bundled client code derives from `@deepseek-ai/dsh-client-ui-workspace`; keep the upstream license terms in mind when redistributing.
