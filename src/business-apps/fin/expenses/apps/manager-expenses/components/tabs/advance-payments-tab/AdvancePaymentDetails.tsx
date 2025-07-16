import React from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Separator } from '@newwork/nw-design-system';
import { PiCheck, PiX } from 'react-icons/pi';
import Pill from '@/components/pill/Pill';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { formatDate } from '@/common/utils/windowUtils';
import { formatAmount } from '../../../utils/currencyUtils';

export interface AdvancePaymentDetailsProps extends BusinessAppContextProps {
  payment: any;
  onApprove: (paymentId: string) => void;
  onReject: (paymentId: string) => void;
}

const AdvancePaymentDetails: React.FC<AdvancePaymentDetailsProps> = ({
  payment,
  onApprove,
  onReject
}) => {
  const getTextType = (daysRemaining: number) => {
    if (daysRemaining < 0) return 'danger';
    if (daysRemaining < 7) return 'warning';
    return undefined;
  };

  const getDaysRemainingText = (daysRemaining: number) => {
    return daysRemaining < 0 ? 
      `${Math.abs(daysRemaining)} days overdue` : 
      `${daysRemaining} days`;
  };

  const getPillType = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'completed';
      case 'REJECTED': return 'error';
      case 'DRAFT': return 'draft';
      default: return 'waiting';
    }
  };

  const handleApprove = () => {
    onApprove(payment.id);
  };

  const handleReject = () => {
    onReject(payment.id);
  };

  // Helper function to calculate days remaining until due date
  const calculateDaysRemaining = () => {
    if (!payment.dueDate) return null;
    
    const dueDate = new Date(payment.dueDate);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const daysRemaining = calculateDaysRemaining();

  return (
    <div className="gba:p-6 gba:space-y-6">
      {/* Status */}
      <div>
        <Pill 
          type={getPillType(payment.status)}
          label={payment.status}
        />
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-gray-600">Title</label>
              <p className="gba:text-sm">{payment.title || 'N/A'}</p>
            </div>
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-gray-600">Employee</label>
              <p className="gba:text-sm">{payment.employee?.fullName || 'N/A'}</p>
            </div>
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-gray-600">Department</label>
              <p className="gba:text-sm">{payment.employee?.department || 'N/A'}</p>
            </div>
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-gray-600">Request Date</label>
              <p className="gba:text-sm">{payment.requestDate ? formatDate(payment.requestDate, 'date.short') : 'N/A'}</p>
            </div>
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-gray-600">Due Date</label>
              <p className="gba:text-sm">{payment.dueDate ? formatDate(payment.dueDate, 'date.short') : 'N/A'}</p>
            </div>
            {daysRemaining !== null && (
              <div>
                <label className="gba:text-sm gba:font-medium gba:text-gray-600">Days Remaining</label>
                <p className={`gba:text-sm ${getTextType(daysRemaining) === 'danger' ? 'gba:text-red-600' : getTextType(daysRemaining) === 'warning' ? 'gba:text-yellow-600' : ''}`}>
                  {getDaysRemainingText(daysRemaining)}
                </p>
              </div>
            )}
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-gray-600">Amount</label>
              <p className="gba:text-sm gba:font-medium">€{payment.amount ? formatAmount(payment.amount) : '0,00'}</p>
            </div>
          </div>
          
          <div>
            <label className="gba:text-sm gba:font-medium gba:text-gray-600">Purpose</label>
            <p className="gba:text-sm">{payment.purpose || 'No purpose provided'}</p>
          </div>
          
          <div>
            <label className="gba:text-sm gba:font-medium gba:text-gray-600">Description</label>
            <p className="gba:text-sm">{payment.description || 'No description provided'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Approval Information */}
      {payment.status === 'APPROVED' && payment.approvedBy && (
        <Card>
          <CardHeader>
            <CardTitle className="gba:text-lg">Approval Information</CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-4">
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div>
                <label className="gba:text-sm gba:font-medium gba:text-gray-600">Approved By</label>
                <p className="gba:text-sm">{payment.approvedBy || 'Unknown'}</p>
              </div>
              <div>
                <label className="gba:text-sm gba:font-medium gba:text-gray-600">Approved Date</label>
                <p className="gba:text-sm">{payment.approvedDate ? formatDate(payment.approvedDate, 'date.short') : 'N/A'}</p>
              </div>
            </div>
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-gray-600">Comments</label>
              <p className="gba:text-sm">{payment.approvalComments || 'No comments'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejection Information */}
      {payment.status === 'REJECTED' && payment.rejectedBy && (
        <Card>
          <CardHeader>
            <CardTitle className="gba:text-lg">Rejection Information</CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-4">
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div>
                <label className="gba:text-sm gba:font-medium gba:text-gray-600">Rejected By</label>
                <p className="gba:text-sm">{payment.rejectedBy}</p>
              </div>
              <div>
                <label className="gba:text-sm gba:font-medium gba:text-gray-600">Rejected Date</label>
                <p className="gba:text-sm">{payment.rejectedDate ? formatDate(payment.rejectedDate, 'date.short') : 'N/A'}</p>
              </div>
            </div>
            <div>
              <label className="gba:text-sm gba:font-medium gba:text-gray-600">Rejection Reason</label>
              <p className="gba:text-sm">{payment.rejectionReason || 'No reason provided'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {payment.status === 'PENDING' && (
        <div className="gba:flex gba:justify-end gba:gap-4">
          <Button 
            variant="destructive"
            onClick={handleReject}
          >
            <PiX className="gba:h-4 gba:w-4 gba:mr-2" />
            Reject
          </Button>
          <Button 
            variant="default"
            onClick={handleApprove}
          >
            <PiCheck className="gba:h-4 gba:w-4 gba:mr-2" />
            Approve
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdvancePaymentDetails;
