import React, { useState } from 'react'
import {
  Button,
  Alert,
  AlertDescription,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Textarea,
  Label,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { usePerformanceEvaluationPeerApprove } from '../context/PerformanceEvaluationPeerApproveContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import translations from '../_i18n'

const prefixDataTestId = 'PerformanceEvaluationPeerApprove'

const PerformanceEvaluationPeerApproveComponent: React.FC = () => {
  const { t } = useTranslation(translations)
  const { nominatedPeers, peersLoading, isLoading, error, onApprove, onReject, onCancel } =
    usePerformanceEvaluationPeerApprove()

  const [rejectComment, setRejectComment] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [approving, setApproving] = useState(false)

  const handleReject = async () => {
    setRejecting(true)
    try {
      await onReject(rejectComment || undefined)
    } finally {
      setRejecting(false)
    }
  }

  const handleApprove = async () => {
    setApproving(true)
    try {
      await onApprove()
    } finally {
      setApproving(false)
    }
  }

  const isBusy = isLoading || rejecting || approving || peersLoading

  return (
    <div
      className="gba:flex gba:flex-col gba:h-full gba:w-full gba:bg-background"
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
    >
      <div className="gba:flex-shrink-0 gba:px-6 gba:py-4 gba:border-b gba:border-border">
        <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">{t('title')}</h2>
      </div>

      <div className="gba:flex-1 gba:px-6 gba:py-6 gba:space-y-4 gba:overflow-auto">
        {error && (
          <Alert variant="destructive" data-testid={formatDataTestId(prefixDataTestId, 'ErrorAlert')}>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card variant="surface">
          <CardHeader>
            <CardTitle className="gba:text-base">{t('peers-label')}</CardTitle>
          </CardHeader>
          <CardContent className="gba:pt-0">
            {peersLoading ? (
              <div className="gba:flex gba:items-center gba:gap-2 gba:py-4">
                <Spinner size="sm" />
                <p className="gba:text-sm gba:text-muted-foreground">{t('loading-peers')}</p>
              </div>
            ) : nominatedPeers.length === 0 ? (
              <p className="gba:text-sm gba:text-muted-foreground">{t('no-peers')}</p>
            ) : (
              <ul
                className="gba:space-y-2 gba:list-none gba:pl-0"
                data-testid={formatDataTestId(prefixDataTestId, 'PeerList')}
              >
                {nominatedPeers.map((peer, index) => (
                  <li
                    key={peer.id}
                    className="gba:py-2 gba:px-3 gba:rounded-md gba:bg-muted gba:text-foreground gba:text-sm"
                    data-testid={formatDataTestId(prefixDataTestId, 'PeerItem', String(index))}
                  >
                    {peer.name}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="gba:space-y-2">
          <Label className="gba:text-sm gba:font-medium gba:text-muted-foreground">{t('reject-comment-label')}</Label>
          <Textarea
            placeholder={t('reject-comment-placeholder')}
            value={rejectComment}
            onChange={e => setRejectComment(e.target.value)}
            className="gba:min-h-[80px]"
            data-testid={formatDataTestId(prefixDataTestId, 'RejectComment')}
          />
        </div>
      </div>

      <div className="gba:flex-shrink-0 gba:px-6 gba:py-4 gba:border-t gba:border-border gba:flex gba:gap-2 gba:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isBusy}
          data-testid={formatDataTestId(prefixDataTestId, 'CancelButton')}
        >
          {t('cancel-button')}
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={isBusy}
          onClick={handleReject}
          data-testid={formatDataTestId(prefixDataTestId, 'RejectButton')}
        >
          {t('reject-button')}
        </Button>
        <Button
          type="button"
          variant="default"
          disabled={isBusy}
          onClick={handleApprove}
          data-testid={formatDataTestId(prefixDataTestId, 'ApproveButton')}
        >
          {t('approve-button')}
        </Button>
      </div>
    </div>
  )
}

export default PerformanceEvaluationPeerApproveComponent
