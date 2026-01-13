/**
 * Detect if running on dev platform
 * Matches logic from original Lowcoder transformer
 */
export function isDevPlatform(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const lowcoder = (window as any).lowcoder
  if (!lowcoder || !lowcoder.windowEnvKey) {
    return false
  }

  const envKey = lowcoder.windowEnvKey
  const env = (window as any)[envKey]

  if (!env) {
    return false
  }

  // Check if tenant env is dev
  if (env.NEXT_PUBLIC_TENANT_ENV === 'dev') {
    return true
  }

  // Check if GraphQL endpoint contains "dev"
  if (env.NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK && env.NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK.includes('dev')) {
    return true
  }

  return false
}
