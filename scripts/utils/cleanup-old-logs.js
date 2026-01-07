#!/usr/bin/env node

/**
 * Cleanup script for old browser log files
 * Keeps only the N most recent log files to prevent disk space issues
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const LOGS_DIR = path.join(__dirname, '..', '..', 'logs')
const MAX_LOG_FILES = 10 // Keep only the 10 most recent log files
const MAX_AGE_DAYS = 7 // Delete logs older than 7 days

/**
 * Get all log files with their stats
 */
function getLogFiles() {
  if (!fs.existsSync(LOGS_DIR)) {
    console.log('[cleanup-logs] Logs directory does not exist yet. Skipping cleanup.')
    return []
  }

  const files = fs.readdirSync(LOGS_DIR)
  const logFiles = files
    .filter(file => file.startsWith('dev-') && file.endsWith('.log'))
    .map(file => {
      const filePath = path.join(LOGS_DIR, file)
      const stats = fs.statSync(filePath)
      return {
        name: file,
        path: filePath,
        mtime: stats.mtime,
        size: stats.size
      }
    })

  // Sort by modification time (newest first)
  logFiles.sort((a, b) => b.mtime - a.mtime)

  return logFiles
}

/**
 * Delete old log files based on count and age
 */
function cleanupLogs() {
  const logFiles = getLogFiles()

  if (logFiles.length === 0) {
    console.log('[cleanup-logs] No log files found.')
    return
  }

  console.log(`[cleanup-logs] Found ${logFiles.length} log file(s)`)

  const now = Date.now()
  const maxAgeMs = MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  let deletedCount = 0
  let deletedSize = 0

  logFiles.forEach((file, index) => {
    const age = now - file.mtime.getTime()
    const shouldDeleteByCount = index >= MAX_LOG_FILES
    const shouldDeleteByAge = age > maxAgeMs

    if (shouldDeleteByCount || shouldDeleteByAge) {
      try {
        fs.unlinkSync(file.path)
        deletedCount++
        deletedSize += file.size
        const reason = shouldDeleteByAge ? 'age' : 'count'
        console.log(`[cleanup-logs] Deleted (${reason}): ${file.name} (${formatBytes(file.size)})`)
      } catch (error) {
        console.error(`[cleanup-logs] Failed to delete ${file.name}:`, error.message)
      }
    }
  })

  if (deletedCount > 0) {
    console.log(`[cleanup-logs] Cleanup complete: Deleted ${deletedCount} file(s), freed ${formatBytes(deletedSize)}`)
  } else {
    console.log('[cleanup-logs] No files to delete.')
  }
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

// Run cleanup
try {
  cleanupLogs()
} catch (error) {
  console.error('[cleanup-logs] Error during cleanup:', error.message)
  process.exit(1)
}
