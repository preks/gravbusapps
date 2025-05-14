import React, { useState } from 'react';
import { FederatedComponentLoader } from './FederatedComponentLoader';

// Available federated components from remote app
const availableComponents = [
  { id: 'LeadDetail', name: 'LeadDetail' },
  { id: 'LeadOverview', name: 'LeadOverview' },
  { id: 'OpportunityOverview', name: 'OpportunityOverview' }
];

function App() {
  // State to track which component is currently selected
  const [selectedComponent, setSelectedComponent] = useState(availableComponents[0]);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ marginBottom: '20px' }}>Federated Component Demo</h1>
      
      {/* Component selector */}
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="component-select" style={{ marginRight: '10px', fontWeight: 'bold' }}>
          Select Component:
        </label>
        <select 
          id="component-select"
          value={selectedComponent.id}
          onChange={(e) => {
            const selected = availableComponents.find(c => c.id === e.target.value);
            if (selected) setSelectedComponent(selected);
          }}
          style={{ padding: '8px', borderRadius: '4px' }}
        >
          {availableComponents.map(comp => (
            <option key={comp.id} value={comp.id}>{comp.name}</option>
          ))}
        </select>
      </div>

      {/* Component display area */}
      <div style={{ 
        padding: '20px', 
        border: '1px solid #e1e1e1', 
        borderRadius: '8px',
        backgroundColor: '#f9f9f9'
      }}>
        <h2 style={{ marginTop: 0 }}>{selectedComponent.name}</h2>
        
        {/* Render the selected federated component */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '4px' }}>
          <FederatedComponentLoader
            componentName={selectedComponent.name}
            remoteApp="business-apps"
            fallback={<div>Loading {selectedComponent.name}...</div>}
            props={{}}
          />
        </div>
      </div>
      
      {/* Simple info section */}
      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p>Remote URL: http://localhost:3001/assets/remoteEntry.js</p>
        <p>These components are being loaded dynamically using module federation.</p>
      </div>
    </div>
  );
}

export default App;
