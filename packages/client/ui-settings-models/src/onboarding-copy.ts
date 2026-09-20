/** Durable settings namespace for product-wide GUI onboarding facts. */
export const WELCOME_NOTICE_SETTINGS_NAMESPACE = 'ui-onboarding'

/** Field storing the last welcome notice version the user acknowledged. */
export const WELCOME_NOTICE_ACK_FIELD = 'welcomeNoticeVersion'

/**
 * Bump only when the notice changes materially and every user should see it
 * again. The acknowledgement is compared for exact equality.
 */
export const WELCOME_NOTICE_VERSION = '2026-08-13.1'

/**
 * Whether this build shows the product welcome notice at all. The notice is
 * DeepSeek's internal-testing announcement, which a deployment shipping its own
 * gateway has no reason to present. Turning it off here rather than unregistering
 * the slot keeps the notice, its store, and its tests wired, so upstream changes
 * to any of them still apply cleanly.
 */
export const WELCOME_NOTICE_ENABLED = false
