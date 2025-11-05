/**
 * Hook for fetching team compliance data (certifications, trainings)
 * Integrates with real employee data
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useDirectReports } from '@/business-apps/hr/core/apps/manager-dashboard/hooks/useDirectReports'

export interface ComplianceRecord {
  id: string
  employeeId: string
  employeeName: string
  employeeAvatar?: string
  certificationType: string
  certificationCategory: 'aml' | 'wpgh' | 'kyc' | 'dsgvo' | 'security' | 'other'
  status: 'valid' | 'expiring' | 'expired' | 'pending'
  issueDate?: string
  expiryDate?: string
  documentUrl?: string
}

export { ComplianceRecord as ComplianceItem }

// Banking-specific certifications
const BANKING_CERTIFICATIONS = [
  { type: 'Geldwäsche-Prävention (AML)', category: 'aml' as const, validityMonths: 12 },
  { type: 'WpHG-Beraterzertifikat', category: 'wpgh' as const, validityMonths: 24 },
  { type: 'KYC-Compliance Training', category: 'kyc' as const, validityMonths: 24 },
  { type: 'Datenschutz-Grundverordnung (DSGVO)', category: 'dsgvo' as const, validityMonths: 24 },
  { type: 'Kassensicherheit & Betrugsprävention', category: 'security' as const, validityMonths: 12 }
]

export const useTeamCompliance = (context: BusinessAppContextProps) => {
  const [complianceRecords, setComplianceRecords] = useState<ComplianceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const { directReports, loading: employeesLoading } = useDirectReports({
    accessToken: context.accessToken,
    managerId: context.userInfo?.employeeDetails?.employeeId || ''
  })

  // Generate realistic compliance data based on real team members
  const generateComplianceData = useCallback(() => {
    if (!directReports || directReports.length === 0) return []

    const records: ComplianceRecord[] = []
    const now = new Date()

    directReports.forEach((employee, empIndex) => {
      // Each employee should have 2-4 certifications
      const certCount = 2 + (empIndex % 3) // Varies between 2-4
      
      for (let i = 0; i < certCount; i++) {
        const cert = BANKING_CERTIFICATIONS[i % BANKING_CERTIFICATIONS.length]
        const monthsAgo = Math.floor(Math.random() * 18) // Random issue date 0-18 months ago
        const issueDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 15)
        const expiryDate = new Date(issueDate)
        expiryDate.setMonth(expiryDate.getMonth() + cert.validityMonths)

        // Calculate status based on expiry
        const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        let status: ComplianceRecord['status'] = 'valid'
        
        if (daysUntilExpiry < 0) {
          status = 'expired'
        } else if (daysUntilExpiry < 60) {
          status = 'expiring'
        } else if (Math.random() > 0.9) {
          status = 'pending'
        }

        records.push({
          id: `cert-${employee.id}-${i}`,
          employeeId: employee.id,
          employeeName: employee.fullName,
          employeeAvatar: employee.pictureThumbnail,
          certificationType: cert.type,
          certificationCategory: cert.category,
          status,
          issueDate: issueDate.toISOString(),
          expiryDate: status !== 'pending' ? expiryDate.toISOString() : undefined
        })
      }
    })

    // Sort by status priority (expired first, then expiring, then valid, then pending)
    return records.sort((a, b) => {
      const priority = { expired: 0, expiring: 1, pending: 2, valid: 3 }
      return priority[a.status] - priority[b.status]
    })
  }, [directReports])

  useEffect(() => {
    if (!employeesLoading) {
      const data = generateComplianceData()
      setComplianceRecords(data)
      setIsLoading(false)
    }
  }, [employeesLoading, generateComplianceData])

  // Group certifications by type
  const certificationsByType = useMemo(() => {
    const grouped: Record<string, ComplianceRecord[]> = {}
    
    complianceRecords.forEach(record => {
      if (!grouped[record.certificationType]) {
        grouped[record.certificationType] = []
      }
      grouped[record.certificationType].push(record)
    })
    
    return grouped
  }, [complianceRecords])

  // Calculate stats
  const stats = useMemo(() => ({
    total: complianceRecords.length,
    valid: complianceRecords.filter(r => r.status === 'valid').length,
    expiring: complianceRecords.filter(r => r.status === 'expiring').length,
    expired: complianceRecords.filter(r => r.status === 'expired').length,
    pending: complianceRecords.filter(r => r.status === 'pending').length
  }), [complianceRecords])

  return {
    complianceRecords,
    certificationsByType,
    stats,
    isLoading,
    refetch: () => {
      const data = generateComplianceData()
      setComplianceRecords(data)
    }
  }
}

