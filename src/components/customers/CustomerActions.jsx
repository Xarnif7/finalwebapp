import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Clock, CheckCircle, Mail } from 'lucide-react';
import { useActiveTemplates } from '@/hooks/useActiveTemplates';
import { triggerTemplateAutomation } from '@/lib/automationTrigger';

export default function CustomerActions({ customer }) {
  const { activeTemplates, loading } = useActiveTemplates();
  const [triggering, setTriggering] = useState(false);
  const [lastTriggered, setLastTriggered] = useState(null);

  const handleTriggerTemplate = async (template) => {
    if (triggering) return;

    try {
      setTriggering(true);
      setLastTriggered({ template: template.name, timestamp: new Date() });

      console.log('🚀 Triggering automation for customer:', {
        customerName: customer.full_name,
        templateName: template.name,
        customerEmail: customer.email
      });

      await triggerTemplateAutomation(template, customer.id, {
        customer_name: customer.full_name,
        customer_email: customer.email
      });

      // Show success feedback
      setTimeout(() => {
        setLastTriggered(null);
      }, 3000);

    } catch (error) {
      console.error('❌ Failed to trigger automation:', error);
      alert(`Failed to trigger ${template.name} automation: ${error.message}`);
      setLastTriggered(null);
    } finally {
      setTriggering(false);
    }
  };

  // Don't show actions if no active templates
  if (loading || activeTemplates.length === 0) {
    return (
      <div className="flex items-center gap-2">
        {loading ? (
          <span className="text-sm text-gray-500">Loading...</span>
        ) : (
          <span className="text-sm text-gray-400">No active automations</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {lastTriggered && (
        <div className="flex items-center gap-1 text-green-600 text-sm">
          <CheckCircle className="h-4 w-4" />
          <span>{lastTriggered.template} triggered</span>
        </div>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={triggering}>
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="px-2 py-1.5 text-sm font-medium text-gray-700">
            Trigger Automation
          </div>
          {activeTemplates.map((template) => (
            <DropdownMenuItem
              key={template.id}
              onClick={() => handleTriggerTemplate(template)}
              disabled={triggering}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              <span>{template.name}</span>
              {template.config_json?.delay_hours && (
                <span className="text-xs text-gray-500 ml-auto">
                  {template.config_json.delay_hours}h delay
                </span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
