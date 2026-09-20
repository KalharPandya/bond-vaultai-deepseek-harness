/** Required deployment-selected metadata for mandatory-update policy requests. */
export interface DesktopPolicyEnvironment {
  origin: string
  allowedPageOrigins: string[]
  authentication: 'anonymous' | 'feishu-test'
  [key: string]: unknown
}

/** Environment variable that selects whether this build queries a mandatory-update policy service. */
export const DESKTOP_MANDATORY_UPDATE_MODE_ENV: 'DSH_DESKTOP_MANDATORY_UPDATE_MODE'

/**
 * Resolve policy settings before artifact preparation or signing.
 * @param environment File-owned release settings; only the selected origin is required.
 * @returns Policy metadata with deployment-selected origin and authentication, or undefined when the build carries no policy service.
 */
export function resolveDesktopPolicyEnvironment(environment: NodeJS.ProcessEnv): DesktopPolicyEnvironment | undefined
