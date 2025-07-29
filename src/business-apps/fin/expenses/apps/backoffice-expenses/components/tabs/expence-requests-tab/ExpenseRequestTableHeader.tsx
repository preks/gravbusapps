import React from 'react';
import { TableHeader, TableHead, TableRow } from '@newwork/nw-design-system';

export const ExpenseRequestTableHeader: React.FC = () => {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="gba:w-[60px]">Actions</TableHead>
        <TableHead>Employee</TableHead>
        <TableHead>Employee Code</TableHead>
        <TableHead>SAP Number</TableHead>
        <TableHead>Request Number</TableHead>
        <TableHead>Title</TableHead>
        <TableHead>Start Date</TableHead>
        <TableHead>End Date</TableHead>
        <TableHead>Creation Date</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="gba:text-right">Remaining Amount</TableHead>
        <TableHead className="gba:text-right">Total Amount</TableHead>
      </TableRow>
    </TableHeader>
  );
}; 