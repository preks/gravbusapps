/**
 * Detect if running on dev platform
 * Matches logic from original Lowcoder transformer
 */
export function isDevPlatform(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const lowcoder = (window as any).lowcoder
  const candidateEnvKeys = [lowcoder?.windowEnvKey, 'nw-envs'].filter(Boolean)

  for (const envKey of candidateEnvKeys) {
    const env = (window as any)[envKey as string]
    if (!env) continue

    // Check if tenant env is dev
    if (env.NEXT_PUBLIC_TENANT_ENV === 'dev') {
      return true
    }

    // Check if GraphQL endpoint contains "dev"
    if (
      typeof env.NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK === 'string' &&
      env.NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK.includes('dev')
    ) {
      return true
    }
  }

  return false
}
