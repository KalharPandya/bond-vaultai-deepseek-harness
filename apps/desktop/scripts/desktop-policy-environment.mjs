/** Resolve the policy service from the same deployment as updater publication. */
import { resolveDesktopAutoUpdateEnvironment } from './desktop-auto-update-environment.mjs'

/** Environment variable that selects whether this build queries a mandatory-update policy service. */
export const DESKTOP_MANDATORY_UPDATE_MODE_ENV = 'DSH_DESKTOP_MANDATORY_UPDATE_MODE'

/**
 * Resolve whether this build carries a policy service, defaulting to the deployment-owned service.
 * @param {NodeJS.ProcessEnv} environment Packaging environment.
 * @returns {'enabled' | 'disabled'} Validated policy mode.
 */
function resolveMandatoryUpdateMode(environment) {
  const value = environment[DESKTOP_MANDATORY_UPDATE_MODE_ENV]?.trim() || 'enabled'
  if (value !== 'enabled' && value !== 'disabled') {
    throw new Error(`desktop package: ${DESKTOP_MANDATORY_UPDATE_MODE_ENV} must be "enabled" or "disabled"`)
  }
  return value
}

function origin(value, name) {
  let url
  try { url = new URL(value) } catch { throw new Error(`desktop package: ${name} requires an HTTPS origin`) }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`desktop package: ${name} requires an HTTPS origin without credentials, path, query, or fragment`)
  }
  return url.origin
}

/**
 * Resolve mandatory policy metadata before preparing artifacts or accessing signing hardware.
 * @param {NodeJS.ProcessEnv} environment File-owned release settings; the unselected origin is not required.
 * @returns {{ origin: string, allowedPageOrigins: string[], authentication: 'anonymous' | 'feishu-test', [key: string]: unknown } | undefined} Selected policy, or undefined when the build carries no policy service.
 */
export function resolveDesktopPolicyEnvironment(environment) {
  // A build without a policy service ships no policy metadata, so the application
  // resolves an absent configuration and never queries or blocks on a remote service.
  if (resolveMandatoryUpdateMode(environment) === 'disabled') return undefined
  const deployment = resolveDesktopAutoUpdateEnvironment(environment)
  const name = deployment === 'test' ? 'DSH_DESKTOP_MANDATORY_UPDATE_TEST_ORIGIN' : 'DSH_DESKTOP_MANDATORY_UPDATE_PROD_ORIGIN'
  const selected = origin(environment[name], name)
  let settings = {}
  if (environment.DSH_DESKTOP_MANDATORY_UPDATE_CONFIG !== undefined) {
    try { settings = JSON.parse(environment.DSH_DESKTOP_MANDATORY_UPDATE_CONFIG) }
    catch { throw new Error('desktop package: DSH_DESKTOP_MANDATORY_UPDATE_CONFIG must be valid JSON') }
  }
  if (typeof settings !== 'object' || settings === null || Array.isArray(settings)
    || 'origin' in settings || 'authentication' in settings) {
    throw new Error('desktop package: policy options must be an object without origin or authentication; use the deployment origin settings')
  }
  const pages = settings.allowedPageOrigins ?? [selected]
  if (!Array.isArray(pages) || pages.length === 0) throw new Error('desktop package: allowedPageOrigins must be a nonempty array')
  return { ...settings, origin: selected,
    allowedPageOrigins: pages.map(value => origin(value, 'allowedPageOrigins')),
    authentication: deployment === 'test' ? 'feishu-test' : 'anonymous' }
}
