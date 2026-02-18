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
  Spinner
} from '@newwork/nw-design-system'
import { usePerformanceEvaluationPeerApprove } from '../context/PerformanceEvaluationPeerApproveContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const prefixDataTestId = 'PerformanceEvaluationPeerApprove'

const PerformanceEvaluationPeerApproveComponent: React.FC = () => {
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

  const title = getTranslationFromI18nKeyAndLabel(
    'lowcoder:performance_evaluation_peer_approve.title',
    'Approve Nominated Peers'
  )
  const peersLabel = getTranslationFromI18nKeyAndLabel(
    'lowcoder:performance_evaluation_peer_approve.peersLabel',
    'Nominated peers'
  )
  const noPeersMessage = getTranslationFromI18nKeyAndLabel(
    'lowcoder:performance_evaluation_peer_approve.noPeers',
    'No nominated peers to display.'
  )

  return (
    <div
      className="gba:flex gba:flex-col gba:h-full gba:w-full gba:bg-background"
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
    >
      <div className="gba:flex-shrink-0 gba:px-6 gba:py-4 gba:border-b gba:border-border">
        <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">{title}</h2>
      </div>

      <div className="gba:flex-1 gba:px-6 gba:py-6 gba:space-y-4 gba:overflow-auto">
        {error && (
          <Alert variant="destructive" data-testid={formatDataTestId(prefixDataTestId, 'ErrorAlert')}>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card variant="surface">
          <CardHeader>
            <CardTitle className="gba:text-base">{peersLabel}</CardTitle>
          </CardHeader>
          <CardContent className="gba:pt-0">
            {peersLoading ? (
              <div className="gba:flex gba:items-center gba:gap-2 gba:py-4">
                <Spinner size="sm" />
                <p className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:performance_evaluation_peer_approve.loadingPeers',
                    'Loading nominated peers...'
                  )}
                </p>
              </div>
            ) : nominatedPeers.length === 0 ? (
              <p className="gba:text-sm gba:text-muted-foreground">{noPeersMessage}</p>
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
          <Label className="gba:text-sm gba:font-medium gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:performance_evaluation_peer_approve.rejectCommentLabel',
              'Comment (optional, for rejection)'
            )}
          </Label>
          <Textarea
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:performance_evaluation_peer_approve.rejectCommentPlaceholder',
              'Add a comment if rejecting...'
            )}
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
          {getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={isBusy}
          onClick={handleReject}
          data-testid={formatDataTestId(prefixDataTestId, 'RejectButton')}
        >
          {getTranslationFromI18nKeyAndLabel('lowcoder:performance_evaluation_peer_approve.reject', 'Reject')}
        </Button>
        <Button
          type="button"
          variant="default"
          disabled={isBusy}
          onClick={handleApprove}
          data-testid={formatDataTestId(prefixDataTestId, 'ApproveButton')}
        >
          {getTranslationFromI18nKeyAndLabel('lowcoder:performance_evaluation_peer_approve.approve', 'Approve')}
        </Button>
      </div>
    </div>
  )
}

export default PerformanceEvaluationPeerApproveComponent
