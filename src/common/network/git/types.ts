/**
 * Git Client Types
 *
 * Common types for Git VCS operations (GitHub, Bitbucket, etc.)
 */

export interface GitConfig {
  provider: 'github' | 'bitbucket'
  workspace: string // GitHub: owner, Bitbucket: workspace
  repo: string
  branch: string
  token: string
  email?: string // For Bitbucket: email:token authentication
  username?: string // For commit author
}

export interface GitTreeEntry {
  path: string
  type: 'tree' | 'blob' | 'commit_directory' | 'commit_file' // GitHub: tree/blob, Bitbucket: commit_directory/commit_file
  sha?: string
}

export interface GitFileContent {
  content: string
  sha?: string
}

export interface GitCommitResult {
  sha?: string
  url?: string
  message?: string
}

export interface GitPushResult {
  success: boolean
  sha?: string
}

export interface GitPullRequest {
  id: number | string
  url: string
  title: string
}

/**
 * Base interface for Git VCS clients
 */
export interface GitClient {
  readonly provider: 'github' | 'bitbucket'

  /**
   * Get the default branch name for the repository
   */
  getDefaultBranch(): Promise<string>

  /**
   * Get tree structure recursively from a specific path
   */
  getTree(branch: string, path?: string): Promise<GitTreeEntry[]>

  /**
   * Read file content
   */
  readFile(path: string, branch: string): Promise<GitFileContent>

  /**
   * Write/update file content (creates a commit)
   */
  writeFile(branch: string, path: string, content: string, message: string): Promise<GitCommitResult>

  /**
   * Commit multiple files at once
   */
  commitFiles(
    branch: string,
    files: Array<{ path: string; content: string }>,
    message: string
  ): Promise<GitCommitResult>

  /**
   * Push commits to remote
   */
  push(branch: string): Promise<GitPushResult>

  /**
   * Ensure a branch exists (create if not)
   */
  ensureBranch(branch: string, fromBranch: string): Promise<void>

  /**
   * Create a pull request
   */
  createPullRequest(head: string, base: string, title: string, body: string): Promise<GitPullRequest>

  /**
   * Merge a pull request
   */
  mergePullRequest(prId: number | string): Promise<void>

  /**
   * Get last commit date for a file
   */
  getLastCommitDate(path: string, branch: string): Promise<string | null>
}
