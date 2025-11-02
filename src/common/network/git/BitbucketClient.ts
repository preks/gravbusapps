import type { GitClient, GitConfig, GitTreeEntry, GitFileContent, GitCommitResult, GitPullRequest } from './types'

/**
 * BitbucketClient - Implements Git operations for Bitbucket Cloud API v2
 *
 * @see https://developer.atlassian.com/cloud/bitbucket/rest/
 */
export class BitbucketClient implements GitClient {
  readonly provider = 'bitbucket' as const
  private readonly api = 'https://api.bitbucket.org/2.0'
  private readonly config: GitConfig
  private branchCommitCache = new Map<string, string>() // Cache branch -> commit SHA

  constructor(config: GitConfig) {
    this.config = config
    console.log(
      '[BitbucketClient] Initialized:',
      JSON.stringify(
        {
          workspace: config.workspace,
          repo: config.repo,
          branch: config.branch,
          hasEmail: !!config.email
        },
        null,
        2
      )
    )
  }

  /**
   * Generate auth header for Bitbucket API
   * Atlassian API Token: email:token as Basic Auth
   */
  private getAuthHeader(): Record<string, string> {
    if (this.config.email) {
      const credentials = btoa(`${this.config.email}:${this.config.token}`)
      return { Authorization: `Basic ${credentials}` }
    }

    if (this.config.token.includes(':')) {
      const credentials = btoa(this.config.token)
      return { Authorization: `Basic ${credentials}` }
    }

    return { Authorization: `Bearer ${this.config.token}` }
  }

  /**
   * Make authenticated fetch request to Bitbucket API
   */
  private async fetch(url: string, init?: RequestInit): Promise<Response> {
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...this.getAuthHeader(),
      ...(init?.headers || {})
    }

    const res = await fetch(url, { ...init, headers })

    if (!res.ok) {
      const txt = await res.text()
      console.error('[BitbucketClient] Error:', { url, status: res.status, response: txt })
      throw new Error(`Bitbucket API error ${res.status}: ${txt}`)
    }

    return res
  }

  /**
   * Get commit SHA for a branch (handles branches with slashes in name)
   * Caches results to avoid redundant API calls
   */
  private async getBranchCommit(branch: string): Promise<string> {
    // Check cache first
    if (this.branchCommitCache.has(branch)) {
      return this.branchCommitCache.get(branch)!
    }

    const url = `${this.api}/repositories/${this.config.workspace}/${this.config.repo}/refs/branches/${encodeURIComponent(branch)}`
    const res = await this.fetch(url)
    const data = await res.json()
    const commitSha = data.target.hash

    // Cache result
    this.branchCommitCache.set(branch, commitSha)
    console.log(`[BitbucketClient] Cached commit SHA for branch ${branch}: ${commitSha}`)

    return commitSha
  }

  /**
   * Get default branch for repository
   */
  async getDefaultBranch(): Promise<string> {
    const url = `${this.api}/repositories/${this.config.workspace}/${this.config.repo}`
    const res = await this.fetch(url)
    const data = await res.json()
    return data.mainbranch?.name || 'main'
  }

  /**
   * Get tree structure recursively
   * Optimized to fetch all content in minimal requests
   */
  async getTree(branch: string, basePath: string = 'src/business-apps'): Promise<GitTreeEntry[]> {
    const commitSha = await this.getBranchCommit(branch)
    console.log(`[BitbucketClient] getTree: branch=${branch}, path=${basePath}, sha=${commitSha}`)

    const results: GitTreeEntry[] = []
    const query = encodeURIComponent('path ~ "_i18n"')
    const url = `${this.api}/repositories/${this.config.workspace}/${this.config.repo}/src/${commitSha}/${basePath}?pagelen=100&max_depth=6&q=${query}`

    let nextUrl: string | null = url
    let requestCount = 0
    const allEntries: any[] = []

    // Paginate through all results
    while (nextUrl) {
      requestCount++
      const res = await this.fetch(nextUrl)
      const data = await res.json()
      if (data.values) allEntries.push(...data.values)
      nextUrl = data.next || null
    }

    console.log(`[BitbucketClient] Fetched ${allEntries.length} entries in ${requestCount} requests`)

    // Separate directories and files
    const i18nDirs = allEntries.filter((e: any) => e.type === 'commit_directory' && e.path.endsWith('/_i18n'))

    const ftlFiles = allEntries.filter(
      (e: any) => e.type === 'commit_file' && e.path.endsWith('.ftl') && e.path.includes('/_i18n/')
    )

    // Convert to GitTreeEntry format (preserve Bitbucket types)
    i18nDirs.forEach((dir: any) => {
      results.push({ path: dir.path, type: 'commit_directory' })
    })

    ftlFiles.forEach((file: any) => {
      results.push({
        path: file.path,
        type: 'commit_file',
        sha: file.commit?.hash || commitSha
      })
    })

    console.log(
      `[BitbucketClient] Result: ${results.length} entries (${i18nDirs.length} dirs + ${ftlFiles.length} files)`
    )

    return results
  }

  /**
   * Read file content from repository
   */
  async readFile(path: string, branch: string): Promise<GitFileContent> {
    const commitSha = await this.getBranchCommit(branch)
    const url = `${this.api}/repositories/${this.config.workspace}/${this.config.repo}/src/${commitSha}/${path}`

    console.log(`[BitbucketClient] readFile: ${path} @ ${commitSha}`)

    const res = await this.fetch(url, {
      headers: { Accept: 'application/octet-stream' } as any
    })

    const content = await res.text()

    return { content, sha: commitSha }
  }

  /**
   * Write/update file in repository
   */
  async writeFile(branch: string, path: string, content: string, message: string): Promise<GitCommitResult> {
    const url = `${this.api}/repositories/${this.config.workspace}/${this.config.repo}/src`

    const form = new FormData()
    const blob = new Blob([content], { type: 'text/plain' })
    form.append(path, blob, path.split('/').pop()!)
    form.append('message', message)
    form.append('branch', branch)

    const res = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: form as any
    })

    if (!res.ok) {
      const txt = await res.text()
      console.error('[BitbucketClient] writeFile error:', txt)
      throw new Error(`Bitbucket write error ${res.status}: ${txt}`)
    }

    return {}
  }

  /**
   * Ensure branch exists, create if not
   */
  async ensureBranch(branch: string, fromBranch: string): Promise<void> {
    try {
      await this.getBranchCommit(branch)
      console.log(`[BitbucketClient] Branch "${branch}" already exists`)
    } catch {
      console.log(`[BitbucketClient] Creating branch "${branch}" from "${fromBranch}"`)
      const keepFile = '.i18n-keep'
      await this.writeFile(
        branch,
        keepFile,
        `Branch created at ${new Date().toISOString()}`,
        `chore: create branch ${branch}`
      )
    }
  }

  /**
   * Create pull request
   */
  async createPullRequest(head: string, base: string, title: string, body: string): Promise<GitPullRequest> {
    const url = `${this.api}/repositories/${this.config.workspace}/${this.config.repo}/pullrequests`

    const res = await this.fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        title,
        description: body,
        source: { branch: { name: head } },
        destination: { branch: { name: base } }
      })
    })

    const data = await res.json()

    return {
      id: data.id,
      url: data.links?.html?.href || '',
      title: data.title
    }
  }

  /**
   * Merge pull request
   */
  async mergePullRequest(prId: number | string): Promise<void> {
    const url = `${this.api}/repositories/${this.config.workspace}/${this.config.repo}/pullrequests/${prId}/merge`
    await this.fetch(url, { method: 'POST' })
  }

  /**
   * Get last commit date for a specific file
   */
  async getLastCommitDate(path: string, branch: string): Promise<string | null> {
    try {
      const commitSha = await this.getBranchCommit(branch)
      const url = `${this.api}/repositories/${this.config.workspace}/${this.config.repo}/commits/${commitSha}?path=${encodeURIComponent(path)}&pagelen=1`

      const res = await this.fetch(url)
      const data = await res.json()

      return data.values?.[0]?.date || null
    } catch (err) {
      console.error('[BitbucketClient] getLastCommitDate error:', err)
      return null
    }
  }
}
