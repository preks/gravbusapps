/**
 * Git Client Module
 *
 * Provides unified interface for Git operations across different VCS providers
 * (Bitbucket, GitHub, etc.)
 */

export { BitbucketClient } from './BitbucketClient'
export { GitHubClient } from './GitHubClient'
export { useGitClient } from './useGitClient'

export type { GitConfig, GitTreeEntry, GitFileContent, GitCommitResult, GitPullRequest, GitClient } from './types'
