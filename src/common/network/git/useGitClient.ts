import { useMemo } from 'react'
import type { GitClient, GitConfig } from './types'
import { BitbucketClient } from './BitbucketClient'
import { GitHubClient } from './GitHubClient'

/**
 * Hook to get Git client instance based on provider configuration
 *
 * @param config Git configuration with provider type
 * @returns GitClient instance (Bitbucket or GitHub)
 *
 * @example
 * ```tsx
 * const gitClient = useGitClient({
 *   provider: 'bitbucket',
 *   workspace: 'my-workspace',
 *   repo: 'my-repo',
 *   branch: 'main',
 *   token: 'xxx',
 *   email: 'user@example.com'
 * });
 *
 * const tree = await gitClient.getTree('main');
 * ```
 */
export function useGitClient(config: GitConfig | null): GitClient | null {
  const client = useMemo(() => {
    if (!config) return null

    switch (config.provider) {
      case 'bitbucket':
        return new BitbucketClient(config)

      case 'github':
        return new GitHubClient(config)

      default:
        console.error('[useGitClient] Unknown provider:', (config as any).provider)
        return null
    }
  }, [config?.provider, config?.workspace, config?.repo, config?.branch, config?.token, config?.email])

  return client
}
