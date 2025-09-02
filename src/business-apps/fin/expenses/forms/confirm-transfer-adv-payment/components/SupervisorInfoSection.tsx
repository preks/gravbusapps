import React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@newwork/nw-design-system";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";

interface SupervisorInfoSectionProps {
  supervisor: {
    firstName?: string;
    lastName?: string;
    pictureThumbnail?: string;
    employeePosition: {
      jobPosition: {
        name?: string;
      };
      organizationalUnit: {
        name?: string;
      };
    };
  };
}

const SupervisorInfoSection: React.FC<SupervisorInfoSectionProps> = ({
  supervisor,
}) => {
  return (
    <div
      className="gba:mb-6 gba:p-3"
      data-testid="confirm-transfer-adv-payment-supervisor-section"
    >
      <h3
        className="gba:text-lg gba:font-semibold gba:mb-3 gba:text-foreground"
        data-testid="confirm-transfer-adv-payment-supervisor-title"
      >
        {getTranslationFromI18nKeyAndLabel(
          "lowcoder:confirm_transfer_advance_payment.approved_by",
          "Approved By"
        )}
      </h3>

      <div
        className="gba:flex gba:items-center gba:gap-3"
        data-testid="confirm-transfer-adv-payment-supervisor-details"
      >
        <Avatar
          className="gba:w-10 gba:h-10"
          data-testid="confirm-transfer-adv-payment-supervisor-avatar"
        >
          {supervisor.pictureThumbnail ? (
            <AvatarImage
              src={`data:image/jpeg;base64,${supervisor.pictureThumbnail}`}
            />
          ) : (
            <AvatarFallback>
              {supervisor.firstName?.[0]}
              {supervisor.lastName?.[0]}
            </AvatarFallback>
          )}
        </Avatar>
        <div>
          <div
            className="gba:text-sm gba:font-semibold gba:text-foreground"
            data-testid="confirm-transfer-adv-payment-supervisor-name"
          >
            {supervisor.firstName} {supervisor.lastName}
          </div>
          <div
            className="gba:text-xs gba:font-normal gba:text-muted-foreground"
            data-testid="confirm-transfer-adv-payment-supervisor-role"
          >
            {supervisor.employeePosition?.jobPosition?.name}
          </div>
          <div
            className="gba:text-xs gba:font-normal gba:text-muted-foreground"
            data-testid="confirm-transfer-adv-payment-supervisor-unit"
          >
            {supervisor.employeePosition?.organizationalUnit?.name}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupervisorInfoSection;
