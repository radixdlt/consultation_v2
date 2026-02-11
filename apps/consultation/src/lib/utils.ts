import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { envVars } from './envVars'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function truncateAddress(
  address: string,
  prefixLength = 12,
  suffixLength = 4
): string {
  const minLength = prefixLength + suffixLength + 3 // +3 for "..."
  if (address.length <= minLength) return address
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`
}

/**
 * Returns the Radix Dashboard base URL based on the current network.
 * Network ID 1 = mainnet, 2 = stokenet
 */
export function getDashboardBaseUrl(): string {
  return envVars.NETWORK_ID === 1
    ? 'https://dashboard.radixdlt.com'
    : 'https://stokenet-dashboard.radixdlt.com'
}

/**
 * Returns the full Radix Dashboard URL for an address (account, component, resource, etc.).
 */
export function getDashboardUrl(address: string): string {
  const baseUrl = getDashboardBaseUrl()
  const type = getAddressType(address)
  return `${baseUrl}/${type}/${address}`
}

/**
 * Determines the address type from its prefix for dashboard URL construction.
 */
function getAddressType(
  address: string
): 'account' | 'component' | 'resource' | 'package' | 'pool' | 'validator' {
  if (address.startsWith('account_')) return 'account'
  if (address.startsWith('component_')) return 'component'
  if (address.startsWith('resource_')) return 'resource'
  if (address.startsWith('package_')) return 'package'
  if (address.startsWith('pool_')) return 'pool'
  if (address.startsWith('validator_')) return 'validator'
  return 'account' // Default fallback
}

export function formatXrd(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`
  }
  return value.toFixed(2)
}

export function formatDateRange(start: Date, deadline: Date): string {
  const dateOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric'
  }

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit'
  }

  const startDate = start.toLocaleDateString('en-US', dateOptions)
  const startTime = start.toLocaleTimeString('en-US', timeOptions)

  const deadlineDate = deadline.toLocaleDateString('en-US', {
    ...dateOptions,
    year:
      start.getFullYear() !== deadline.getFullYear() ? 'numeric' : undefined
  })
  const deadlineTime = deadline.toLocaleTimeString('en-US', timeOptions)

  return `${startDate} ${startTime} – ${deadlineDate} ${deadlineTime}`
}
