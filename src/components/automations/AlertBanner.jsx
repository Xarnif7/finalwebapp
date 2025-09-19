import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AlertBanner = ({ metrics, onDismiss }) => {
  if (!metrics.hasAlert) {
    return null;
  }

  return (
    <Alert className="mb-6 border-red-200 bg-red-50">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <span className="font-medium text-red-800">High Failure Rate Alert</span>
          <p className="text-red-700 mt-1">
            {metrics.alertMessage}
          </p>
          <p className="text-sm text-red-600 mt-1">
            Sends: {metrics.sends} | Failures: {metrics.failures} | Rate: {metrics.failureRate}%
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="text-red-600 hover:text-red-800 hover:bg-red-100"
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default AlertBanner;
