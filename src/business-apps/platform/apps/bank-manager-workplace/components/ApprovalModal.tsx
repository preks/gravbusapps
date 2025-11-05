/**
 * Approval Modal Component
 * Professional modal for reviewing and approving/rejecting requests
 */

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Badge,
  Textarea
} from '@newwork/nw-design-system'
import { 
  CheckCircle, 
  XCircle, 
  Sparkle, 
  Warning, 
  User, 
  CurrencyCircleDollar,
  Clock,
  Info
} from '@phosphor-icons/react'
import { BankingApproval } from '../types/banking.types'
import { formatCurrency, getTimeAgo, getPriorityVariant } from '../utils/formatters'

export interface ApprovalModalProps {
  approval: BankingApproval | null
  isOpen: boolean
  onClose: () => void
  onApprove: (approvalId: string, comments?: string) => void
  onReject: (approvalId: string, reason: string) => void
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  approval,
  isOpen,
  onClose,
  onApprove,
  onReject
}) => {
  const [action, setAction] = useState<'view' | 'approve' | 'reject'>('view')
  const [comments, setComments] = useState('')

  const handleApprove = () => {
    if (!approval) return
    onApprove(approval.id, comments || undefined)
    setComments('')
    setAction('view')
    onClose()
  }

  const handleReject = () => {
    if (!approval || !comments.trim()) {
      alert('Bitte geben Sie eine Begründung für die Ablehnung ein.')
      return
    }
    onReject(approval.id, comments)
    setComments('')
    setAction('view')
    onClose()
  }

  if (!approval) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="gba:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            {action === 'approve' ? (
              <>
                <CheckCircle className="gba:h-5 gba:w-5 gba:text-success" />
                Genehmigung bestätigen
              </>
            ) : action === 'reject' ? (
              <>
                <XCircle className="gba:h-5 gba:w-5 gba:text-destructive" />
                Ablehnung begründen
              </>
            ) : (
              <>
                <Info className="gba:h-5 gba:w-5" />
                {approval.title}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {action === 'approve' && 'Überprüfen Sie die Details und bestätigen Sie die Genehmigung'}
            {action === 'reject' && 'Geben Sie bitte eine Begründung für die Ablehnung an'}
            {action === 'view' && 'Detaillierte Ansicht der Genehmigung'}
          </DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-4">
          {/* Request Details */}
          <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:p-4 gba:bg-muted gba:rounded-lg">
            <div>
              <label className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                <CurrencyCircleDollar className="gba:h-3 gba:w-3" />
                Betrag
              </label>
              <p className="gba:font-semibold gba:mt-1">
                {approval.amount && formatCurrency(approval.amount, approval.currency)}
              </p>
            </div>
            <div>
              <label className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                <User className="gba:h-3 gba:w-3" />
                Antragsteller
              </label>
              <p className="gba:font-semibold gba:mt-1">{approval.requestedBy.name}</p>
              {approval.requestedBy.role && (
                <p className="gba:text-xs gba:text-muted-foreground">{approval.requestedBy.role}</p>
              )}
            </div>
            <div>
              <label className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                <Clock className="gba:h-3 gba:w-3" />
                Fälligkeitsdatum
              </label>
              <p className="gba:font-semibold gba:mt-1">{getTimeAgo(approval.dueDate)}</p>
              <Badge variant={getPriorityVariant(approval.priority)} className="gba:mt-1">
                {approval.priority === 'high' ? 'Dringend' : 'Normal'}
              </Badge>
            </div>
            <div>
              <label className="gba:text-xs gba:text-muted-foreground">Typ</label>
              <p className="gba:font-semibold gba:mt-1">{approval.type}</p>
            </div>
          </div>

          {/* Description */}
          {approval.description && (
            <div>
              <label className="gba:text-sm gba:font-medium">Beschreibung</label>
              <p className="gba:text-sm gba:text-muted-foreground gba:mt-2 gba:p-3 gba:bg-muted gba:rounded-lg">
                {approval.description}
              </p>
            </div>
          )}

          {/* AI Suggestion */}
          {approval.aiSuggestion && (
            <div className="gba:p-4 gba:bg-info-secondary gba:rounded-lg gba:border gba:border-info">
              <div className="gba:flex gba:items-start gba:gap-3">
                <Sparkle className="gba:h-5 gba:w-5 gba:text-info gba:mt-0.5" />
                <div className="gba:flex-1">
                  <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                    <h4 className="gba:font-semibold gba:text-info">KI-Empfehlung</h4>
                    <Badge variant="info">
                      {Math.round(approval.aiSuggestion.confidence * 100)}% Confidence
                    </Badge>
                  </div>
                  <p className="gba:text-sm gba:mb-2">
                    <strong>
                      {approval.aiSuggestion.recommendation === 'approve' ? 'Genehmigen empfohlen' : 'Genauere Prüfung empfohlen'}
                    </strong>
                  </p>
                  <p className="gba:text-sm gba:text-info-foreground">{approval.aiSuggestion.rationale}</p>
                  
                  {approval.aiSuggestion.riskFactors && approval.aiSuggestion.riskFactors.length > 0 && (
                    <div className="gba:mt-3">
                      <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                        <Warning className="gba:h-4 gba:w-4 gba:text-warning" />
                        <span className="gba:text-xs gba:font-medium">Risikofaktoren:</span>
                      </div>
                      <ul className="gba:text-xs gba:space-y-1 gba:ml-5 gba:list-disc">
                        {approval.aiSuggestion.riskFactors.map((factor, idx) => (
                          <li key={idx}>{factor}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Comments/Reason Field */}
          {(action === 'approve' || action === 'reject') && (
            <div>
              <label className="gba:text-sm gba:font-medium">
                {action === 'approve' ? 'Kommentare (optional)' : 'Begründung (erforderlich)'}
              </label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={
                  action === 'approve'
                    ? 'Optionale Anmerkungen zur Genehmigung...'
                    : 'Bitte begründen Sie die Ablehnung...'
                }
                className="gba:mt-2"
                rows={4}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="gba:flex gba:gap-3 gba:pt-4 gba:border-t">
            {action === 'view' && (
              <>
                <Button variant="outline" onClick={onClose} className="gba:flex-1">
                  Schließen
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setAction('reject')}
                  className="gba:flex-1"
                >
                  <XCircle className="gba:h-4 gba:w-4 gba:mr-2" />
                  Ablehnen
                </Button>
                <Button
                  variant="default"
                  onClick={() => setAction('approve')}
                  className="gba:flex-1"
                >
                  <CheckCircle className="gba:h-4 gba:w-4 gba:mr-2" />
                  Genehmigen
                </Button>
              </>
            )}

            {action === 'approve' && (
              <>
                <Button variant="outline" onClick={() => { setAction('view'); setComments('') }} className="gba:flex-1">
                  Zurück
                </Button>
                <Button variant="default" onClick={handleApprove} className="gba:flex-1">
                  <CheckCircle className="gba:h-4 gba:w-4 gba:mr-2" />
                  Genehmigung bestätigen
                </Button>
              </>
            )}

            {action === 'reject' && (
              <>
                <Button variant="outline" onClick={() => { setAction('view'); setComments('') }} className="gba:flex-1">
                  Zurück
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleReject} 
                  className="gba:flex-1"
                  disabled={!comments.trim()}
                >
                  <XCircle className="gba:h-4 gba:w-4 gba:mr-2" />
                  Ablehnung bestätigen
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

