import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import React from 'react';
import HrApp from './HrApp';
import { DocumentTypes } from './document-management';
import HrDashboardComponent from './components/HrDashboard';

export const SetupHrRoutes: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/hr" element={<HrApp />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<HrDashboardComponent />} />
          <Route path="documents/types" element={<DocumentTypes />} />
          <Route path="directory" element={<div>Employee Directory</div>} />
          <Route path="employee-list" element={<div>Employee List</div>} />
          <Route path="profile" element={<div>Employee Profile</div>} />
          <Route path="positions" element={<div>Job Positions</div>} />
          <Route path="team" element={<div>Team Overview</div>} />
        </Route>
      </Routes>
    </Router>
  );
};

export default SetupHrRoutes;
