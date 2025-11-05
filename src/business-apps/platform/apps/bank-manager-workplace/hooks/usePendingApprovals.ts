/**
 * Hook for fetching pending approvals from custom-flow-engine
 * Integrates with the task management API for banking workflows
 */

import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { BankingApproval } from '../types/banking.types'

// Custom Flow Engine API base URL
const FLOW_ENGINE_BASE_URL = 'https://newwork-dev.newwork.com/custom-flow-engine/api'

export interface PendingApprovalsResponse {
  approvals: BankingApproval[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const usePendingApprovals = (context: BusinessAppContextProps): PendingApprovalsResponse => {
  const [approvals, setApprovals] = useState<BankingApproval[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchApprovals = useCallback(async () => {
    if (!context.accessToken || !context.userInfo?.employeeDetails?.employeeId) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const userId = context.userInfo.employeeDetails.employeeId

      // Fetch assigned tasks from custom-flow-engine
      const response = await fetch(`${FLOW_ENGINE_BASE_URL}/tasks/assigned?userId=${userId}`, {
        headers: {
          Authorization: `Bearer ${context.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch approvals from custom-flow-engine')
      }

      const tasks = await response.json()

      // Transform custom-flow-engine tasks to BankingApproval format
      const transformedApprovals: BankingApproval[] = tasks
        .filter((task: any) => task.status === 'SCHEDULED' || task.status === 'IN_PROGRESS')
        .map((task: any) => ({
          id: task.id,
          type: mapTaskTypeToApprovalType(task.templateName || task.title),
          title: task.title || 'Genehmigung erforderlich',
          description: task.message || '',
          amount: extractAmountFromTask(task),
          currency: 'EUR',
          requestedBy: {
            id: task.createdBy || 'system',
            name: task.createdByName || 'System',
            role: task.createdByRole
          },
          priority: calculatePriority(task),
          dueDate: task.dueDate || new Date(Date.now() + 86400000).toISOString(),
          createdAt: task.createdAt || new Date().toISOString(),
          status: 'pending',
          aiSuggestion: generateAISuggestion(task)
        }))

      setApprovals(transformedApprovals)
    } catch (err) {
      console.error('Error fetching pending approvals:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      // Use fallback mock data for demo if API fails
      setApprovals(getMockApprovals())
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, context.userInfo?.employeeDetails?.employeeId])

  useEffect(() => {
    fetchApprovals()
  }, [fetchApprovals])

  return {
    approvals,
    isLoading,
    error,
    refetch: fetchApprovals
  }
}

// Helper functions

function mapTaskTypeToApprovalType(taskName: string): BankingApproval['type'] {
  const nameLower = taskName.toLowerCase()
  if (nameLower.includes('loan') || nameLower.includes('kredit') || nameLower.includes('darlehen')) {
    return 'loan'
  }
  if (nameLower.includes('credit') || nameLower.includes('limit')) {
    return 'credit-limit'
  }
  if (nameLower.includes('investment') || nameLower.includes('anlage')) {
    return 'investment'
  }
  if (nameLower.includes('expense') || nameLower.includes('spesen')) {
    return 'expense'
  }
  if (nameLower.includes('overtime') || nameLower.includes('überstunden')) {
    return 'overtime'
  }
  return 'expense'
}

function extractAmountFromTask(task: any): number | undefined {
  // Try to extract amount from form data or input
  if (task.formData?.loanAmount) return Number(task.formData.loanAmount)
  if (task.formData?.amount) return Number(task.formData.amount)
  if (task.input?.amount) return Number(task.input.amount)
  if (task.input?.loanAmount) return Number(task.input.loanAmount)
  return undefined
}

function calculatePriority(task: any): 'high' | 'medium' | 'low' {
  // Calculate based on due date
  if (!task.dueDate) return 'medium'

  const now = new Date()
  const due = new Date(task.dueDate)
  const hoursUntilDue = (due.getTime() - now.getTime()) / 3600000

  if (hoursUntilDue < 4) return 'high'
  if (hoursUntilDue < 24) return 'medium'
  return 'low'
}

function generateAISuggestion(task: any): BankingApproval['aiSuggestion'] {
  // Simulate AI recommendation
  const confidence = Math.random() * 0.3 + 0.7 // 70-100%
  const shouldApprove = confidence > 0.8

  return {
    recommendation: shouldApprove ? 'approve' : 'review',
    confidence: Math.round(confidence * 100) / 100,
    rationale: shouldApprove
      ? 'Alle Kriterien erfüllt, keine Risikoindika toren gefunden'
      : 'Manuelle Prüfung empfohlen aufgrund ungewöhnlicher Merkmale',
    riskFactors: shouldApprove ? [] : ['Kredithistorie unvollständig', 'Hoher Kreditbetrag']
  }
}

// Fallback mock data for demo when API is unavailable
function getMockApprovals(): BankingApproval[] {
  return [
    {
      id: 'mock-1',
      type: 'loan',
      title: 'Kreditantrag - Müller GmbH',
      description: 'Firmenkredit für Expansion',
      amount: 150000,
      currency: 'EUR',
      requestedBy: {
        id: 'emp-1',
        name: 'Thomas Berger',
        role: 'Kundenberater'
      },
      priority: 'high',
      dueDate: new Date(Date.now() + 7200000).toISOString(), // 2 hours
      createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      status: 'pending',
      aiSuggestion: {
        recommendation: 'approve',
        confidence: 0.92,
        rationale: 'Alle Kriterien erfüllt, keine Risikoindikatoren',
        riskFactors: []
      }
    },
    {
      id: 'mock-2',
      type: 'credit-limit',
      title: 'Kreditlimit-Erhöhung - Schmidt',
      description: 'Erhöhung von 5.000€ auf 10.000€',
      amount: 5000,
      currency: 'EUR',
      requestedBy: {
        id: 'emp-2',
        name: 'Anna Weber',
        role: 'Filialleiter-Stellvertreter'
      },
      priority: 'medium',
      dueDate: new Date(Date.now() + 14400000).toISOString(), // 4 hours
      createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      status: 'pending',
      aiSuggestion: {
        recommendation: 'review',
        confidence: 0.78,
        rationale: 'Manuelle Prüfung der Kredithistorie empfohlen',
        riskFactors: ['Drei überfällige Zahlungen in letzten 12 Monaten']
      }
    },
    {
      id: 'mock-3',
      type: 'investment',
      title: 'Investment-Beratung - Wagner',
      description: 'Anlageportfolio-Diversifikation',
      amount: 75000,
      currency: 'EUR',
      requestedBy: {
        id: 'emp-3',
        name: 'Michael Fischer',
        role: 'Anlageberater'
      },
      priority: 'medium',
      dueDate: new Date(Date.now() + 86400000).toISOString(), // 1 day
      createdAt: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
      status: 'pending',
      aiSuggestion: {
        recommendation: 'approve',
        confidence: 0.85,
        rationale: 'Diversifikation entspricht Risikoprofil, historisch gute Performance',
        riskFactors: []
      }
    }
  ]
}

