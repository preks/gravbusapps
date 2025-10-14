/**
 * Team Compliance Widget
 * Tracks certifications, trainings, and compliance requirements for banking
 */

import React, { useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTeamCompliance, ComplianceRecord } from '../hooks/useTeamCompliance'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Skeleton
} from '@newwork/nw-design-system'
import { Certificate, Warning, CheckCircle, Clock, FileText, Calendar } from '@phosphor-icons/react'

export interface TeamComplianceWidgetProps extends BusinessAppContextProps {
  showDetailed?: boolean
}

export const TeamComplianceWidget: React.FC<TeamComplianceWidgetProps> = ({ showDetailed = false, ...context }) => {
  const [selectedCertType, setSelectedCertType] = useState<string | null>(null)
  
  const { complianceRecords, certificationsByType, stats, isLoading } = useTeamCompliance(context)

  // Get records for selected certification type
  const selectedCertRecords = selectedCertType ? certificationsByType[selectedCertType] || [] : []

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return <Badge variant="success">Gültig</Badge>
      case 'expiring':
        return <Badge variant="warning">Läuft ab</Badge>
      case 'expired':
        return <Badge variant="destructive">Abgelaufen</Badge>
      case 'pending':
        return <Badge variant="info">Ausstehend</Badge>
      default:
        return <Badge variant="default">Unbekannt</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="gba:h-4 gba:w-4 gba:text-success" />
      case 'expiring':
        return <Clock className="gba:h-4 gba:w-4 gba:text-warning" />
      case 'expired':
        return <Warning className="gba:h-4 gba:w-4 gba:text-destructive" />
      case 'pending':
        return <FileText className="gba:h-4 gba:w-4 gba:text-info" />
      default:
        return <Certificate className="gba:h-4 gba:w-4" />
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <Card data-testid="team-compliance-widget">
        <CardHeader>
          <CardTitle>Compliance & Zertifikate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:space-y-3">
            <Skeleton className="gba:h-20 gba:w-full" />
            <Skeleton className="gba:h-20 gba:w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card data-testid="team-compliance-widget">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Certificate className="gba:h-5 gba:w-5" />
            Compliance & Zertifikate
          </CardTitle>
          <CardDescription>
            {stats.valid} gültig • {stats.expiring} laufen ab • {stats.expired} abgelaufen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Compliance Summary */}
          <div className="gba:grid gba:grid-cols-4 gba:gap-2 gba:mb-4 gba:p-3 gba:bg-muted gba:rounded-lg">
            <div className="gba:text-center">
              <div className="gba:text-xl gba:font-bold gba:text-success">{stats.valid}</div>
              <div className="gba:text-xs gba:text-muted-foreground">Gültig</div>
            </div>
            <div className="gba:text-center">
              <div className="gba:text-xl gba:font-bold gba:text-warning">{stats.expiring}</div>
              <div className="gba:text-xs gba:text-muted-foreground">Ablaufend</div>
            </div>
            <div className="gba:text-center">
              <div className="gba:text-xl gba:font-bold gba:text-destructive">{stats.expired}</div>
              <div className="gba:text-xs gba:text-muted-foreground">Abgelaufen</div>
            </div>
            <div className="gba:text-center">
              <div className="gba:text-xl gba:font-bold gba:text-info">{stats.pending}</div>
              <div className="gba:text-xs gba:text-muted-foreground">Ausstehend</div>
            </div>
          </div>

          {/* Certification Types List - Click to see who has them */}
          <div className="gba:space-y-2">
            {Object.keys(certificationsByType).slice(0, showDetailed ? 10 : 5).map(certType => {
              const records = certificationsByType[certType]
              const worstStatus = records.find(r => r.status === 'expired')?.status || 
                                 records.find(r => r.status === 'expiring')?.status ||
                                 records.find(r => r.status === 'pending')?.status ||
                                 'valid'
              
              return (
                <div
                  key={certType}
                  className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg hover:gba:bg-accent gba:cursor-pointer gba:transition-colors"
                  onClick={() => setSelectedCertType(certType)}
                  data-testid={`compliance-type-${certType}`}
                >
                  <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
                    {getStatusIcon(worstStatus)}
                    <div className="gba:flex-1">
                      <p className="gba:text-sm gba:font-medium">{certType}</p>
                      <p className="gba:text-xs gba:text-muted-foreground">
                        {records.length} Mitarbeiter
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(worstStatus)}
                </div>
              )
            })}
          </div>

          {/* Action Button */}
          <div className="gba:mt-4 gba:pt-4 gba:border-t">
            <Button variant="outline" className="gba:w-full" size="sm">
              Alle Zertifikate verwalten →
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Certification Detail Modal - Shows which employees have this cert */}
      <Dialog open={!!selectedCertType} onOpenChange={() => setSelectedCertType(null)}>
        <DialogContent className="gba:max-w-4xl gba:max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="gba:flex gba:items-center gba:gap-2">
              <Certificate className="gba:h-5 gba:w-5" />
              {selectedCertType}
            </DialogTitle>
            <DialogDescription>
              Übersicht: Welche Mitarbeiter haben diese Zertifizierung
            </DialogDescription>
          </DialogHeader>

          <div className="gba:space-y-4 gba:overflow-y-auto gba:max-h-[calc(85vh-200px)] gba:pr-2">
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              {selectedCertRecords.map(record => (
                <div
                  key={record.id}
                  className="gba:flex gba:items-start gba:gap-3 gba:p-4 gba:border gba:rounded-lg gba:bg-card hover:gba:shadow-md gba:transition-shadow"
                  data-testid={`cert-detail-${record.id}`}
                >
                  {/* Employee Avatar */}
                  <Avatar className="gba:h-12 gba:w-12 gba:shrink-0">
                    <AvatarImage
                      src={
                        record.employeeAvatar && !record.employeeAvatar.startsWith('{')
                          ? `data:image/jpeg;base64,${record.employeeAvatar}`
                          : undefined
                      }
                      alt={record.employeeName}
                    />
                    <AvatarFallback>
                      {record.employeeName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Employee Info */}
                  <div className="gba:flex-1 gba:min-w-0">
                    <p className="gba:font-medium gba:mb-1">{record.employeeName}</p>
                    <div className="gba:text-xs gba:text-muted-foreground gba:space-y-0.5">
                      {record.issueDate && (
                        <p>Ausgestellt: {formatDate(record.issueDate)}</p>
                      )}
                      {record.expiryDate && (
                        <p>Gültig bis: {formatDate(record.expiryDate)}</p>
                      )}
                    </div>
                    <div className="gba:mt-2 gba:flex gba:flex-wrap gba:gap-2">
                      {getStatusBadge(record.status)}
                      {record.status === 'expired' && (
                        <Button size="sm" variant="destructive" onClick={() => alert(`Training für ${record.employeeName} planen`)}>
                          Erneuern
                        </Button>
                      )}
                      {record.status === 'expiring' && (
                        <Button size="sm" variant="warning" onClick={() => alert(`Training für ${record.employeeName} planen`)}>
                          Auffrischen
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary - Outside scrollable area */}
          </div>

          {/* Summary at bottom - sticky */}
          <div className="gba:border-t gba:pt-4">
            <div className="gba:p-4 gba:bg-muted gba:rounded-lg">
              <p className="gba:text-xs gba:font-medium gba:mb-3 gba:text-muted-foreground">Zusammenfassung für {selectedCertType}</p>
              <div className="gba:grid gba:grid-cols-4 gba:gap-4 gba:text-center">
                <div>
                  <div className="gba:text-lg gba:font-bold gba:text-success">
                    {selectedCertRecords.filter(r => r.status === 'valid').length}
                  </div>
                  <div className="gba:text-xs gba:text-muted-foreground">Gültig</div>
                </div>
                <div>
                  <div className="gba:text-lg gba:font-bold gba:text-warning">
                    {selectedCertRecords.filter(r => r.status === 'expiring').length}
                  </div>
                  <div className="gba:text-xs gba:text-muted-foreground">Ablaufend</div>
                </div>
                <div>
                  <div className="gba:text-lg gba:font-bold gba:text-destructive">
                    {selectedCertRecords.filter(r => r.status === 'expired').length}
                  </div>
                  <div className="gba:text-xs gba:text-muted-foreground">Abgelaufen</div>
                </div>
                <div>
                  <div className="gba:text-lg gba:font-bold gba:text-info">
                    {selectedCertRecords.filter(r => r.status === 'pending').length}
                  </div>
                  <div className="gba:text-xs gba:text-muted-foreground">Ausstehend</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="gba:flex gba:gap-2 gba:mt-4">
              <Button variant="outline" className="gba:flex-1" onClick={() => alert('Massen-Training planen für alle')}>
                <Calendar className="gba:h-4 gba:w-4 gba:mr-2" />
                Gruppen-Training planen
              </Button>
              <Button variant="default" className="gba:flex-1" onClick={() => alert('Compliance-Bericht exportieren')}>
                <FileText className="gba:h-4 gba:w-4 gba:mr-2" />
                Bericht exportieren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

