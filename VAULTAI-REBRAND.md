# Northwest Harness white-label & VaultAI change map

Purpose: track every user-facing DeepSeek / VaultAI -> **Northwest Harness** white-label change and GMKtec local gateway wiring in this repository (`kalhar/private-windows-build`) so pulling upstream (`deepseek-ai/deepseek-harness`) stays low-conflict.

- Fork base release: `0.1.6-alpha.2` (upstream release tag `0.1.6-alpha.2`)
- Branch: `kalhar/private-windows-build`
- Guiding rule: white-label only what a user actually sees (product name, logos/wordmarks,
  desktop metadata, default provider config, and model-facing persona). Do NOT rename
  packages (`@deepseek-ai/*`), provider ids (`deepseek-official`, `llm-deepseek`), env vars
  (`DSH_*`), code identifiers, or upstream API defaults. That keeps future upstream merges
  clean while shipping **Northwest Harness** as the white-labeled build.

## How the merge stays easy

Two kinds of change live here:

1. Overlay / additive (no upstream file touched): the Northwest Harness mark is injected
   through existing UI slots and a runtime deployment patch (`apps/desktop/resources/vaultai-defaults.patch.yml`).
2. In-place string/asset edits to upstream files: listed below so a conflicting hunk on
   `git pull` is a fast re-apply.

---

## 1. Logos and image assets (binary, regenerate from source)

Northwest Harness uses a custom geometric "NW" rounded-square badge (`#141923` charcoal + `#FFFFFF` / `#38BDF8` accent) rendered via Playwright Chromium from vector SVG sources.

| File | Description |
| --- | --- |
| `apps/desktop/resources/icon.png` (`1104x1104`), `icon-windows.png` (`1024x1024`), `icon-macos.png` (`1024x1024`) | Northwest Harness `NW` badge PNGs (transparent corners) + matching `icon.svg`, `icon-windows.svg`, `icon-macos.svg` |
| `apps/desktop/installer/assets/brand.png` (`600x196`), `brand-2x.png` (`1200x392`) | Light-mode NSIS installer wordmark ("NORTHWEST HARNESS") |
| `apps/desktop/installer/assets/brand-dark.png` (`600x196`), `brand-dark-2x.png` (`1200x392`) | Dark-mode NSIS installer wordmark |
| `apps/desktop/installer/assets/uninstaller-sidebar.png` (`164x314`) | Uninstaller left panel with Northwest Harness badge on `#F5F6F8` |
| `apps/web/public/favicon.svg` | Monochrome Northwest (`NW`) favicon with `@media (prefers-color-scheme: dark)` inversion support |

favicon note: the PWA e2e (`apps/web/tests/pwa-manifest.e2e.ts`) requires the favicon to contain `fill="#000"` and a `@media (prefers-color-scheme: dark){ path { ... fill:#fff }` rule.

## 2. User-visible product-name text (in-place edits)

All user-facing product names updated to **Northwest Harness** (`short_name: "NW"`):

- `scripts/client-build-environment.ts` (`DSH_CLIENT_TITLE: 'Northwest Harness'`)
- `apps/web/public/manifest.webmanifest` (`name: "Northwest Harness"`, `short_name: "NW"`)
- `packages/client/ui-sidebar-documentpreview/src/client/office/locales.ts`
- `packages/client/ui-plugin-manager/src/client/locales.ts`
- `packages/client/ui-settings-models/src/client/locales.ts`
- `packages/bundle/web-app/src/{index,startup}.ts` (`Northwest Harness Web GUI`)
- `packages/boot/app-boot/src/index.ts`
- `apps/desktop/{README.md,README.zh.md,package.json,src/main.ts,src/locale.ts,scripts/electron-builder-config.mjs,scripts/desktop-upload-plan.ts,scripts/installed-update-distribution.ts,scripts/package-macos.ts,installer/strings.nsh}` (packaged Windows productName `Northwest Harness`, artifactName `northwest-harness-${version}-${os}-${arch}.${ext}`)
- Corresponding unit/scaffold test assertions in `apps/web/tests/scaffold.ts`, `packages/client/ui-settings-models/tests/*`, `packages/bundle/web-app/tests/web-app.spec.ts`, `packages/boot/app-boot/tests/app-boot.spec.ts`, and `apps/desktop/tests/*`.

## 3. Official brand UI slots (`packages/client/ui-brand-official`)

Mounted when `DSH_CLIENT_BUILD_PROFILE === 'official'`:

- `src/client/Brand.tsx`: `OfficialBrandMark` (geometric `NW` SVG mark), `OfficialBrandName` rendering `OFFICIAL_BRAND_COPY.name` (`Northwest Harness`).
- `src/client/locales.ts`: centralizes `OFFICIAL_BRAND_COPY` so `pnpm run verify-client-ui-i18n` passes cleanly.
- `src/client/index.ts`: occupies `sidebar.brand.mark`, `sidebar.brand.name`, and `conversation.hero.brand.mark`.

## 4. GMKtec / Lemonade gateway wiring & prompt cache (`vaultai-defaults.patch.yml`)

`apps/desktop/resources/vaultai-defaults.patch.yml` wires the default first-party `vaultai` provider route directly to the connected GMKtec EVO-X2 gateway (`http://vaultai.local/v1`):

- `displayName: Northwest Harness`
- `api: openai-completions`
- `baseURL: http://vaultai.local/v1`
- `apiKeyEnv: VAULTAI_API_KEY` (resolved from env, `$DSH_HOME/.credentials.yaml`, or `.env`)
- `headers: { X-VaultAI-Reasoning: preserve }` — instructs `VaultLM-Dashboard` proxy to preserve upstream `delta.reasoning_content` verbatim instead of flattening into `<think>...</think>` inside `delta.content`, so `@earendil-works/pi-ai` cleanly separates `reasoning` and `text` blocks.
- `cacheRetention: long` + `compat.supportsLongCacheRetention: true` — enables OpenAI prompt cache affinity (`prompt_cache_key`) against Lemonade Server's KV prefix cache.
- Registered models (`agent-default-model`: `Qwen3.8-27B-Gufo`):
  - `Qwen3.8-27B-Gufo` (Primary — vision + reasoning + tools, `off: none`)
  - `Qwen3.8-27B-GGUF` (Concurrent — vision + reasoning + tools, `off: none`)
  - `qwen3.6-35b-a3b` (Fast MoE — vision + reasoning + tools, `off: none`)
  - `gpt-oss-20b` (Ultra-Fast — text + harmony reasoning)
  - `Qwen3.8-27B-ROCmFP4-STRIX-MTP` (ROCm FP4 — vision + reasoning + tools, `off: none`)
  - `nvidia-nemotron-3-nano-30b-a3b`
  - `gpt-oss-120b-mxfp4` (Heavy)
- Disables `llm-deepseek` and `skill-badge`, and sets `system-prompt.personaPrefix` to `'You are an AI agent powered by Northwest Harness.'`.
- **Prompt Processing Bar (`: vaultai-progress`) implemented end-to-end:** `packages/llm/llm-pi-ai/src/progress.ts` (`createProgressFetch`, `parseVaultAiProgressLine`) tees the raw SSE `Response.body` before `@earendil-works/pi-ai`'s SDK parser discards SSE comments, parses `: vaultai-progress {"stage":"prompt_eval","processed":...,"total":...,"percent":...,"cached":...,"elapsed_ms":...}` frames (injected by `VaultLM-Dashboard` + `vaultai.local` `vaultai-slots-relay.service` `:13306` across `gufo:rocm` and `llamacpp:rocm`), and forwards transient `TurnProgress` updates (`Agent` -> `SessionAssistantStream` -> `ChatView` `TurnStatus` progress bar with `chat.deepDiving` localized to `'Processing...'` / `'正在处理...'`, keeping `node_modules/@earendil-works/pi-ai` and persisted `StreamChunk` schemas untouched). Live `PiAiAdapter` E2E against `http://vaultai.local/v1` (`Qwen3.8-27B-Gufo`) verified `14` progress steps (`0%`–`100%`) on a `40,930`-token cold prompt, followed by `38,912` cached tokens (`95%` cache hit) and `16.6x` faster TTFT (`4,673ms` vs `77,792ms`) on warm tool continuation (`lookup_equity`). Also verified offline Word/Office checks (`python-docx` -> `check_office.py --contains` -> `@deepseek-ai/dsh-office-to-pdf` PDF render) and `$HOME/.dsh/.credentials.yaml` (`refs.VAULTAI_API_KEY`).
