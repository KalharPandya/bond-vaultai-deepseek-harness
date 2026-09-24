import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'

/**
 * Render the padlock-in-hexagon VaultAI mark for the host surface that requests it.
 * @param props - Host-supplied mark presentation.
 * @returns the VaultAI mark.
 */
export function OfficialBrandMark({ size, className }: SidebarBrandMarkOwnerProps & { className?: string | undefined }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 1.6 L20.5 6.5 V17.5 L12 22.4 L3.5 17.5 V6.5 Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" fill="none" />
      <path d="M9.1 11.2 V9.4 a2.9 2.9 0 0 1 5.8 0 V11.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <rect x="7.8" y="11.2" width="8.4" height="6.4" rx="1.5" fill="currentColor" />
      <circle cx="12" cy="13.7" r="1.15" fill="var(--dsw-alias-bg-canvas, #ffffff)" />
      <rect x="11.35" y="13.9" width="1.3" height="2.4" rx="0.65" fill="var(--dsw-alias-bg-canvas, #ffffff)" />
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
