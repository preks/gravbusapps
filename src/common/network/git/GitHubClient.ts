import type {
  GitClient,
  GitConfig,
  GitTreeEntry,
  GitFileContent,
  GitCommitResult,
  GitPullRequest,
  GitPushResult
} from './types'

/**
 * GitHubClient - Implements Git operations for GitHub REST API v3
 *
 * @see https://docs.github.com/en/rest
 *
 * TODO: Implement GitHub API methods
 * Currently placeholder - will be implemented when GitHub support is needed
 */
export class GitHubClient implements GitClient {
  readonly provider = 'github' as const
  private readonly api = 'https://api.github.com'
  private readonly config: GitConfig

  constructor(config: GitConfig) {
    this.config = config
    console.log(
      '[GitHubClient] Initialized (placeholder):',
      JSON.stringify(
        {
          owner: config.workspace,
          repo: config.repo,
          branch: config.branch
        },
        null,
        2
      )
    )
  }

  private getAuthHeader(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.token}`,
      Accept: 'application/vnd.github.v3+json'
    }
  }

  private async fetch(url: string, init?: RequestInit): Promise<Response> {
    const headers = {
      ...this.getAuthHeader(),
      ...(init?.headers || {})
    }

    const res = await fetch(url, { ...init, headers })

    if (!res.ok) {
      const txt = await res.text()
      console.error('[GitHubClient] Error:', { url, status: res.status, response: txt })
      throw new Error(`GitHub API error ${res.status}: ${txt}`)
    }

    return res
  }

  async getDefaultBranch(): Promise<string> {
    throw new Error('GitHubClient: Not implemented yet')
  }

  // @ts-expect-error - Placeholder implementation
  async getTree(): Promise<GitTreeEntry[]> {
    throw new Error('GitHubClient: Not implemented yet')
  }

  // @ts-expect-error - Placeholder implementation
  async readFile(): Promise<GitFileContent> {
    throw new Error('GitHubClient: Not implemented yet')
  }

  // @ts-expect-error - Placeholder implementation
  async writeFile(): Promise<GitCommitResult> {
    throw new Error('GitHubClient: Not implemented yet')
  }

  // @ts-expect-error - Placeholder implementation
  async commitFiles(): Promise<GitCommitResult> {
    throw new Error('GitHubClient: Not implemented yet')
  }

  // @ts-expect-error - Placeholder implementation
  async push(): Promise<GitPushResult> {
    throw new Error('GitHubClient: Not implemented yet')
  }

  // @ts-expect-error - Placeholder implementation
  async ensureBranch(): Promise<void> {
    throw new Error('GitHubClient: Not implemented yet')
  }

  // @ts-expect-error - Placeholder implementation
  async createPullRequest(): Promise<GitPullRequest> {
    throw new Error('GitHubClient: Not implemented yet')
  }

  // @ts-expect-error - Placeholder implementation
  async mergePullRequest(): Promise<void> {
    throw new Error('GitHubClient: Not implemented yet')
  }

  // @ts-expect-error - Placeholder implementation
  async getLastCommitDate(): Promise<string | null> {
    throw new Error('GitHubClient: Not implemented yet')
  }
}
