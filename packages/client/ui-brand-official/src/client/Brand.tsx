import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { OFFICIAL_BRAND_COPY } from './locales'

/**
 * Render the compass Northwest Harness mark for the host surface that requests it.
 * @param props - Host-supplied mark presentation.
 * @returns the Northwest Harness mark.
 */
export function OfficialBrandMark({ size, className }: SidebarBrandMarkOwnerProps & { className?: string | undefined }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9.6" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 1.2 V3.4 M12 20.6 V22.8 M1.2 12 H3.4 M20.6 12 H22.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <polygon points="6,6 15,9.6 12,12 9.6,15" fill="currentColor" />
      <polygon points="18,18 15,9.6 12,12 9.6,15" fill="currentColor" fillOpacity="0.4" />
      <circle cx="12" cy="12" r="1.35" fill="var(--dsw-alias-bg-canvas, #ffffff)" />
    </svg>
  )
}

/**
 * Render the Northwest Harness name wordmark without its independently slotted mark.
 * @returns the Northwest Harness wordmark.
 */
export function OfficialBrandName() {
  return (
    <span style={{ fontSize: '15.5px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1, whiteSpace: 'nowrap' }}>
      {OFFICIAL_BRAND_COPY.name}
    </span>
  )
}
