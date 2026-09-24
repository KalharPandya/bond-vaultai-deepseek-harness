# VaultAI rebrand change map

Purpose: track every user-facing DeepSeek to VaultAI change in this fork so pulling
upstream (deepseek-ai/deepseek-harness) stays low-conflict.

- Fork base commit: `ddefc45fbc` (upstream release 0.1.6-alpha.2)
- Branch: `kalhar/private-windows-build`
- Guiding rule: rebrand only what a user actually sees (product name text + logos).
  Do NOT rename packages (`@deepseek-ai/*`), provider ids (`deepseek-official`,
  `llm-deepseek`), env vars (`DSH_*`), code identifiers, or npm `description` fields.
  Those touch ~4800 references, break nothing visible, and would make every future
  merge painful.

## How the merge stays easy

Two kinds of change live here:

1. Overlay / additive (no upstream file touched): the VaultAI mark is injected through
   existing UI slots and a runtime deployment patch. These never conflict on rebase.
2. In-place string/asset edits to upstream files: listed below with before to after so a
   conflicting hunk on `git pull` is a two-second re-apply.

When upstream changes one of the in-place files, re-apply the same swap. When upstream
changes a slot contract, only the overlay package (`ui-brand-official`) needs a look.

---

## 1. Logos and image assets (binary, regenerate from source)

Source of truth for the mark: `P:\Vaultai\VaultAI\resources\` (real VaultAI assets):
`icon.png` (padlock-in-hexagon), `vaultai-wordmark-ui.png` (badge + "VaultAI").
Regeneration script kept in the session scratchpad: `gen-assets.mjs` (uses `sharp`).

| File | Was | Now |
| --- | --- | --- |
| `apps/desktop/resources/icon.png` (1104) | DeepSeek whale on light card | VaultAI vault on light card |
| `apps/desktop/resources/icon-windows.png` (1024) | whale | vault (Windows `.ico` is rasterized from this at build) |
| `apps/desktop/resources/icon-macos.png` (1024) | whale | vault |
| `apps/desktop/installer/assets/brand.png` (600x196) | whale + "deepseek HARNESS" | VaultAI wordmark |
| `apps/desktop/installer/assets/brand-2x.png` (1200x392) | same | VaultAI wordmark |
| `apps/desktop/installer/assets/brand-dark.png` (600x196) | same | VaultAI wordmark |
| `apps/desktop/installer/assets/uninstaller-sidebar.png` (164x314) | whale panel | VaultAI vault panel |
| `apps/web/public/favicon.svg` | whale silhouette path | vault (hexagon ring + padlock + keyhole), monochrome |

favicon note: the PWA e2e (`apps/web/tests/pwa-manifest.e2e.ts`) requires the favicon to
contain `fill="#000"` and a `@media (prefers-color-scheme: dark){ path { ... fill:#fff }`
rule. The vault favicon keeps both: fill-based `<path>` elements with evenodd holes, so the
dark-mode flip still works. Do not switch it to stroke-based paths.

## 2. User-visible product-name text (in-place edits)

All "DeepSeek Harness" to "VaultAI" (short_name "DSH" and identifiers left as-is):

| File | Line (approx) | Before | After |
| --- | --- | --- | --- |
| `scripts/client-build-environment.ts` | 22 | `DSH_CLIENT_TITLE: 'DeepSeek Harness'` | `'VaultAI'` |
| `apps/web/public/manifest.webmanifest` | 3 | `"name": "DeepSeek Harness"` | `"name": "VaultAI"` |
| `packages/client/ui-sidebar-documentpreview/src/client/office/locales.ts` | 13 (zh), 37 (en) | `...DeepSeek Harness...` | `...VaultAI...` |
| `packages/client/ui-plugin-manager/src/client/locales.ts` | 74 (zh), 236 (en) | `...DeepSeek Harness...` | `...VaultAI...` |
| `packages/client/ui-settings-models/src/client/locales.ts` | 100 (en), 211 (zh) welcomeBody | `DeepSeek Harness` / `'s` | `VaultAI` / `'s` |
| `packages/bundle/web-app/src/index.ts` | 139, 246 | `DeepSeek Harness Web GUI` | `VaultAI Web GUI` |
| `packages/bundle/web-app/src/startup.ts` | 49 | `Serve the DeepSeek Harness browser UI.` | `Serve the VaultAI browser UI.` |
| `packages/boot/app-boot/src/index.ts` | 1009 | `The DeepSeek Harness implementation checkout is at` | `The VaultAI implementation checkout is at` |

Test assertions updated to match (same strings):
`packages/client/ui-settings-models/tests/welcome-notice.client.spec.tsx` (118),
`packages/bundle/web-app/tests/web-app.spec.ts` (157),
`packages/boot/app-boot/tests/app-boot.spec.ts` (1221).

Earlier (pre-existing in this branch) product-name and provider changes also live in:
`apps/desktop/src/main.ts` (`applicationName: 'Vaultai-secured-deepseek-harness'`),
`apps/desktop/scripts/electron-builder-config.mjs` (productName / artifactName),
`apps/desktop/package.json` (`description` drives the installer FileDescription),
`apps/desktop/installer/strings.nsh` (6 installer strings).

## 3. The VaultAI mark (overlay, no upstream file touched)

Package `packages/client/ui-brand-official` fills the generic brand slots when the client
build profile is `official` (our build). This is how the sidebar AND the empty-conversation
hero show the VaultAI vault instead of the whale, without editing `ui-sidebar`,
`ui-conversation`, `FishLogo.tsx`, or `EmptyHero.tsx`.

- `src/client/Brand.tsx`: `OfficialBrandMark` renders the padlock-in-hexagon (currentColor
  strokes/fill; keyhole punched with `var(--dsw-alias-bg-canvas)` so it adapts to theme).
  `OfficialBrandName` renders `<span>VaultAI</span>`.
- `src/client/index.ts`: registers `sidebar.brand.mark`, `sidebar.brand.name`, and now also
  `conversation.hero.brand.mark`. All guarded by `DSH_CLIENT_BUILD_PROFILE === 'official'`.
- `package.json`: added devDep `@deepseek-ai/dsh-client-ui-conversation` (for the hero slot
  type). `tsconfig.json`: added the matching `../ui-conversation` project reference.
- `tests/browser-plugin.client.spec.tsx`: updated to expect the hero hole filled and the
  name to render text "VaultAI".

Upstream leaves `FishLogo` (the whale) as the slot fallback; we simply occupy the slot, so
the whale code is still present and untouched, and a future upstream whale change cannot
conflict with us.

## 4. Deliberately NOT changed (and why)

- Package `@deepseek-ai/*` names, `deepseek-official` provider id, `llm-deepseek`, all
  `DSH_*` env vars, code identifiers (`DeepSeekModelsEditor`, `validateDeepSeekModels`,
  etc.). Renaming breaks the app and every merge.
- npm `package.json` `description` fields and JSDoc provenance comments that mention
  "DeepSeek Harness" / "DeepSeek Chat". Not shown in the UI.
- The DeepSeek provider's own config defaults in `ui-settings-models` locales
  (`api.deepseek.com` base URLs). Correct for anyone who adds the DeepSeek provider; not
  app branding.
- `apps/cli/src/args.ts:141` CLI `--help` description. Not surfaced in the desktop GUI.

## 5. Model-facing identity (overlay, no core edit)

The shared base emits a fixed first system-prompt line: `You are an AI agent powered by
DeepSeek Harness.` (`packages/core/system-prompt/src/index.ts`, gated on the config
`includeHarnessIdentity`). Editing that string is tempting but it is the first line of every
`snapshots/**/system-prompt.expected.md` fixture (55+ files), so changing the source turns
every upstream merge into a snapshot-conflict slog.

Instead the deployment overlay `apps/desktop/resources/vaultai-defaults.patch.yml` overrides
the `system-prompt` row:

```yaml
- id: system-prompt
  config:
    includeHarnessIdentity: false
    personaPrefix: 'You are an AI agent powered by VaultAI.'
```

`includeHarnessIdentity: false` drops the DeepSeek identity section; `personaPrefix` supplies
the VaultAI line in its place (the section that would sit right after it). The upstream test
`system-prompt.spec.ts` "can omit the harness identity for a deployment that owns the complete
persona" pins this exact behavior. Core source and all snapshot fixtures stay untouched, so
this costs nothing on rebase.
