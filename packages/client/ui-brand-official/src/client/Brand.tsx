import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'

/**
 * Render the VaultAI monogram for the host surface that requests it.
 * @param props - Host-supplied mark presentation.
 * @returns the VaultAI mark.
 */
export function OfficialBrandMark({ size }: SidebarBrandMarkOwnerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="currentColor" />
      <path
        d="M6.5 7.5 L12 16.5 L17.5 7.5"
        stroke="var(--dsw-alias-label-primary-inverted)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

/**
 * Render the VaultAI name wordmark without its independently slotted mark.
 * @returns the VaultAI wordmark.
 */
export function OfficialBrandName() {
  return (
    <span style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1, whiteSpace: 'nowrap' }}>
      VaultAI
    </span>
  )
}
