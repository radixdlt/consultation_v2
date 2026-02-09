import type { ComponentPropsWithoutRef } from 'react'
import { cn, getDashboardUrl, truncateAddress } from '@/lib/utils'

type AddressLinkProps = {
  address: string
  prefixLength?: number
  suffixLength?: number
} & Omit<ComponentPropsWithoutRef<'span'>, 'onClick' | 'onKeyDown'>

/**
 * Renders a truncated Radix address that links to the Radix Dashboard.
 * Uses a span with click handling to avoid nested <a> tag issues.
 * Stops event propagation to prevent parent click handlers from firing.
 */
export function AddressLink({
  address,
  prefixLength = 15,
  suffixLength = 6,
  className,
  ...props
}: AddressLinkProps) {
  const truncated = truncateAddress(address, prefixLength, suffixLength)
  const dashboardUrl = getDashboardUrl(address)

  const openDashboard = () => {
    window.open(dashboardUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <span
      role="link"
      tabIndex={0}
      title={address}
      className={cn(
        'cursor-pointer hover:text-primary hover:underline focus:outline-none focus:ring-1 focus:ring-primary',
        className
      )}
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        openDashboard()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.stopPropagation()
          e.preventDefault()
          openDashboard()
        }
      }}
      {...props}
    >
      {truncated}
    </span>
  )
}
