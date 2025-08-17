import React, { createContext, useContext } from 'react';

const DashboardContext = createContext(null);

export function DashboardProvider({ children, value }) {
  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === null) { // Changed from undefined to null for more robust check
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}


