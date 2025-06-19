import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import setupHrRoutes from '../setup';

/**
 * Example component demonstrating how to integrate the HR app into your application.
 * This should be used as a reference for setting up the HR module in your app.
 */
const HrAppExample: React.FC = () => {
  return (
    <div className="hr-app-example">
      <h1 className="text-2xl font-bold mb-4">HR Module Integration Example</h1>
      
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold mb-3">Integration Steps</h2>
        <ol className="list-decimal pl-5 space-y-2 mb-6">
          <li>Install required dependencies: <code>npm install react-router-dom @types/react-router-dom</code></li>
          <li>Wrap your app with <code>BrowserRouter</code> if not already done</li>
          <li>Import and use the <code>setupHrRoutes</code> function in your routing configuration</li>
        </ol>

        <div className="bg-white p-4 rounded border">
          <h3 className="font-medium mb-2">Example Implementation:</h3>
          <pre className="bg-gray-800 text-gray-100 p-4 rounded text-sm overflow-x-auto">
            {`// App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { setupHrRoutes } from './business-apps/hr/setup';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Your other routes */}
        <Route path="/" element={<HomePage />} />
        
        {/* HR Module Routes */}
        {setupHrRoutes()}
        
        {/* Other routes */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;`}
          </pre>
        </div>
      </div>

      <div className="mt-8 p-6 border rounded-lg bg-white">
        <h2 className="text-xl font-semibold mb-4">Document Management</h2>
        <p className="mb-4">
          The document management module allows you to define document types and set permissions for different user roles.
          Access it at: <code>/hr/documents/types</code>
        </p>
        
        <div className="bg-gray-50 p-4 rounded border">
          <h3 className="font-medium mb-2">Features:</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Create and manage document types</li>
            <li>Set role-based permissions (view, upload, download, edit, delete)</li>
            <li>Define allowed file types and size limits</li>
            <li>Toggle document type activation</li>
            <li>GDPR compliance tracking</li>
            <li>Security level assignment</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HrAppExample;
