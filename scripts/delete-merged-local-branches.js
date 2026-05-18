#!/usr/bin/env node

/**
 * Delete local branches that are already included in a base branch.
 *
 * Dry-run current repo:
 *   node scripts/delete-merged-local-branches.js --dry-run
 *
 * Delete in current repo:
 *   node scripts/delete-merged-local-branches.js --delete
 *
 * Dry-run another repo:
 *   node scripts/delete-merged-local-branches.js --repo "/path/to/another-repo" --dry-run
 *
 * Delete in another repo:
 *   node scripts/delete-merged-local-branches.js --repo "/path/to/another-repo" --delete
 *
 * Optional:
 *   --base main
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'

const PROTECTED_BRANCHES = new Set(['develop', 'main', 'master'])

function parseArgs(argv) {
  const options = {
    repo: process.cwd(),
    base: 'develop',
    delete: false,
    dryRun: false
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--repo') {
      options.repo = argv[index + 1]
      index += 1
      continue
    }

    if (arg === '--base') {
      options.base = argv[index + 1]
      index += 1
      continue
    }

    if (arg === '--delete') {
      options.delete = true
      continue
    }

    if (arg === '--dry-run') {
      options.dryRun = true
      continue
    }

    if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  if (options.delete && options.dryRun) {
    throw new Error('Use either --delete or --dry-run, not both.')
  }

  return options
}

function printHelp() {
  console.log(`Usage:
  node scripts/delete-merged-local-branches.js [--repo <path>] [--base <branch>] [--dry-run]
  node scripts/delete-merged-local-branches.js [--repo <path>] [--base <branch>] --delete

Options:
  --repo <path>     Git repository path. Default: current directory.
  --base <branch>   Base branch used for merge checks. Default: develop.
  --dry-run         Print branches that would be deleted. Default behavior.
  --delete          Delete matching local branches.`)
}

function runGit(repo, args, options = {}) {
  const result = spawnSync('git', ['-C', repo, ...args], {
    encoding: 'utf8',
    stdio: options.stdio ?? 'pipe'
  })

  return {
    code: result.status ?? 1,
    stdout: result.stdout?.trim() ?? '',
    stderr: result.stderr?.trim() ?? ''
  }
}

function assertRepo(repo) {
  if (!fs.existsSync(repo)) {
    throw new Error(`Repo path not found: ${repo}`)
  }

  if (!fs.existsSync(path.join(repo, '.git'))) {
    throw new Error(`Not a git repository: ${repo}`)
  }
}

function getLocalBranches(repo) {
  const result = runGit(repo, ['for-each-ref', '--format=%(refname:short)', 'refs/heads'])

  if (result.code !== 0) {
    throw new Error(result.stderr || 'Failed to read local branches.')
  }

  if (!result.stdout) {
    return []
  }

  return result.stdout.split(/\r?\n/).filter(Boolean)
}

function getCurrentBranch(repo) {
  const result = runGit(repo, ['branch', '--show-current'])

  if (result.code !== 0) {
    throw new Error(result.stderr || 'Failed to read current branch.')
  }

  return result.stdout
}

function assertBaseExists(repo, base) {
  const result = runGit(repo, ['rev-parse', '--verify', '--quiet', base])

  if (result.code !== 0) {
    throw new Error(`Base branch not found: ${base}`)
  }
}

function getDeleteCandidate(repo, base, branch) {
  const mergeResult = runGit(repo, ['merge-base', '--is-ancestor', branch, base])

  if (mergeResult.code === 0) {
    return {
      branch,
      match: 'merge',
      deleteCommand: `git branch -d ${branch}`
    }
  }

  const cherryResult = runGit(repo, ['cherry', base, branch])

  if (cherryResult.code !== 0 || !cherryResult.stdout) {
    return null
  }

  const hasUnmergedPatch = cherryResult.stdout.split(/\r?\n/).some(line => line.startsWith('+'))

  if (hasUnmergedPatch) {
    return null
  }

  return {
    branch,
    match: 'squash/cherry-pick',
    deleteCommand: `git branch -D ${branch}`
  }
}

function printResults(options, currentBranch, results) {
  const mode = options.delete && !options.dryRun ? 'DELETE' : 'DRY-RUN'

  console.log(`Repo: ${options.repo}`)
  console.log(`Base: ${options.base}`)
  console.log(`Current skipped: ${currentBranch}`)
  console.log(`Mode: ${mode}`)
  console.log('')

  if (results.length === 0) {
    console.log('NO_LOCAL_BRANCHES_ALREADY_MERGED')
    return
  }

  for (const result of results) {
    console.log(`${result.branch}\t${result.match}\t${result.deleteCommand}`)
  }
}

function deleteBranches(repo, results) {
  for (const result of results) {
    const deleteMode = result.match === 'merge' ? '-d' : '-D'
    const deleteResult = runGit(repo, ['branch', deleteMode, '--', result.branch], {
      stdio: 'inherit'
    })

    if (deleteResult.code !== 0) {
      throw new Error(`Failed to delete branch: ${result.branch}`)
    }
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  options.repo = path.resolve(options.repo)

  assertRepo(options.repo)
  assertBaseExists(options.repo, options.base)

  const currentBranch = getCurrentBranch(options.repo)
  const protectedBranches = new Set([...PROTECTED_BRANCHES, currentBranch])
  const branches = getLocalBranches(options.repo).filter(branch => !protectedBranches.has(branch))
  const results = branches
    .map(branch => getDeleteCandidate(options.repo, options.base, branch))
    .filter(Boolean)
    .sort((left, right) => left.branch.localeCompare(right.branch))

  printResults(options, currentBranch, results)

  if (options.delete && !options.dryRun && results.length > 0) {
    deleteBranches(options.repo, results)
  }
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
