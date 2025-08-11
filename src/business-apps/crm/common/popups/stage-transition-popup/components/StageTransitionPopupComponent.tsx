import React, { useEffect, useState } from "react";
import {
  Button,
  Alert,
  AlertDescription,
  Spinner,
  Card,
  CardContent,
  Badge,
} from "@newwork/nw-design-system";
import { message } from "antd";
import { useStageTransitionPopupContext } from "../context/StageTransitionPopupContext";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { formatDataTestId } from "@/common/utils/formatDataTestId";
import { dispatchProcessContinueEvent } from "@/common/utils/processEventUtils";

const prefixDataTestId = "StageTransitionPopup";

const StageTransitionPopupComponent: React.FC = () => {
  const { formValues, error, businessAppContext, isLoading } = useStageTransitionPopupContext();

  const [submitting, setSubmitting] = useState(false);

  // Add process completion listener
  useEffect(() => {
    const handler = async (event: any) => {
      try {
        const response = event.detail?.response;
        if (response) {
          message.success('Opportunity stage transitioned successfully');
          setSubmitting(false);
        }
      } catch (err: any) {
        console.error('Error in process completion:', err);
        message.error(err?.message || 'Failed to transition opportunity stage');
        setSubmitting(false);
      }
    };
    
    window.addEventListener('pse_complete', handler);
    
    return () => {
      window.removeEventListener('pse_complete', handler);
    };
  }, []);

  // Handle form submission
  const handleSubmit = async () => {
    if (!formValues.opportunityId || !formValues.targetStageRef) {
      message.error('Missing required data');
      return;
    }

    try {
      setSubmitting(true);
      
      // Dispatch process submit event with transition data
      dispatchProcessContinueEvent("pse_submit", {
        opportunityId: formValues.opportunityId,
        targetStageRef: formValues.targetStageRef,
      });
    } catch (err: any) {
      console.error('Error submitting stage transition:', err);
      message.error(err?.message || 'Failed to transition opportunity stage');
      setSubmitting(false);
    }
  };

  // Handle form cancellation
  const handleCancel = () => {
    dispatchProcessContinueEvent("pse_pause", {});
  };

  return (
    <div
      className="gba:max-w-md gba:mx-auto gba:p-6"
      data-testid={formatDataTestId(prefixDataTestId, "container")}
    >
      <Card className="gba:shadow-lg">
        <CardContent className="gba:p-6">
          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="gba:mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="gba:text-center gba:mb-6">
              <Spinner size="lg" className="gba:mb-4" />
              <p className="gba:text-gray-600">Loading opportunity details...</p>
            </div>
          )}

          {/* Confirmation Message with Badges */}
          {!isLoading && (
            <div className="gba:text-center gba:mb-6">
              <p 
                className="gba:text-lg gba:text-gray-800 gba:leading-relaxed"
                data-testid={formatDataTestId(prefixDataTestId, "ConfirmationText")}
              >
                Are you sure you want to transition{' '}
                <Badge variant="outline" className="gba:inline gba:mx-1">
                  {formValues.opportunityName || 'Unknown Opportunity'}
                </Badge>
                {' '}from{' '}
                <Badge variant="secondary" className="gba:inline gba:mx-1">
                  {formValues.sourceStage?.value || 'Unknown Stage'}
                </Badge>
                {' '}to{' '}
                <Badge variant="success" className="gba:inline gba:mx-1">
                  {formValues.targetStage?.value || 'Unknown Target Stage'}
                </Badge>
                ?
              </p>
            </div>
          )}

          {/* Submit and Cancel Buttons */}
          {!isLoading && (
            <div className="gba:flex gba:gap-3">
              <Button
                variant="secondary"
                className="gba:flex-1"
                size="lg"
                onClick={handleCancel}
                disabled={submitting}
                data-testid={formatDataTestId(prefixDataTestId, "CancelButton")}
              >
                {getTranslationFromI18nKeyAndLabel(
                  "crm:common.cancel",
                  "Cancel"
                )}
              </Button>
              <Button
                variant="default"
                className="gba:flex-1"
                size="lg"
                onClick={handleSubmit}
                disabled={submitting}
                data-testid={formatDataTestId(prefixDataTestId, "ConfirmButton")}
              >
                {getTranslationFromI18nKeyAndLabel(
                  "crm:common.confirm",
                  "Confirm"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StageTransitionPopupComponent;
