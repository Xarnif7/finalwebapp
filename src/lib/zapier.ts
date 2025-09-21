/**
 * Zapier integration helper functions
 * TODO: Replace with real Zapier API calls and Zap Template links
 */

export type ZapStatus = 'connected' | 'not_connected';

export interface ZapTemplate {
  title: string;
  description: string;
  href: string;
}

/**
 * Get Zapier connection status for a user/business
 * TODO: Replace with real API call to check Zapier connection status
 */
export const getZapStatus = async (userId: string): Promise<ZapStatus> => {
  // Placeholder implementation - always returns 'not_connected' for now
  return 'not_connected';
};

/**
 * Zap templates for CRM integration
 * TODO: Replace with real Zapier Template URLs
 */
export const zapTemplates: ZapTemplate[] = [
  {
    title: 'When Invoice Paid in <CRM> → Upsert Customer in Blipp',
    description: 'Automatically add customers to Blipp when invoices are paid in your CRM',
    href: 'https://zapier.com/app/editor/create-zap?template=blipp-invoice-paid'
  },
  {
    title: 'When Job Completed in <CRM> → Send Review Request in Blipp',
    description: 'Send review requests automatically when jobs are completed',
    href: 'https://zapier.com/app/editor/create-zap?template=blipp-job-completed'
  },
  {
    title: 'Nightly <CRM> → Sync New/Updated Customers to Blipp',
    description: 'Sync all customer data from your CRM to Blipp on a schedule',
    href: 'https://zapier.com/app/editor/create-zap?template=blipp-nightly-sync'
  }
];

/**
 * Connect to Zapier
 * TODO: Implement real Zapier OAuth flow
 */
export const connectToZapier = async (): Promise<{ success: boolean; error?: string }> => {
  // Placeholder implementation
  return { success: true };
};

/**
 * Disconnect from Zapier
 * TODO: Implement real Zapier disconnection
 */
export const disconnectFromZapier = async (): Promise<{ success: boolean; error?: string }> => {
  // Placeholder implementation
  return { success: true };
};
