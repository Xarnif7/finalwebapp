// Development component for toggling feature flags
// This should only be included in development builds

import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FEATURE_FLAGS, 
  isFeatureEnabled, 
  toggleFeature, 
  getAllFeatureFlags 
} from '@/lib/featureFlags';

const FeatureFlagToggle = () => {
  const [flags, setFlags] = React.useState(() => getAllFeatureFlags());
  const [isVisible, setIsVisible] = React.useState(false);

  // Listen for feature flag changes
  React.useEffect(() => {
    const handleFlagChange = () => {
      setFlags(getAllFeatureFlags());
    };

    window.addEventListener('featureFlagChanged', handleFlagChange);
    return () => {
      window.removeEventListener('featureFlagChanged', handleFlagChange);
    };
  }, []);

  const handleToggle = (flagName) => {
    const flag = flagName;
    toggleFeature(flag);
  };

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={() => setIsVisible(!isVisible)}
        variant="outline"
        size="sm"
        className="mb-2"
      >
        Feature Flags
        <Badge variant="secondary" className="ml-2">
          {Object.values(flags).filter(Boolean).length}
        </Badge>
      </Button>

      {isVisible && (
        <Card className="w-80">
          <CardHeader>
            <CardTitle className="text-sm">Feature Flags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(flags).map(([flagName, enabled]) => (
              <div key={flagName} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{flagName}</div>
                    <div className="text-xs text-muted-foreground">
                      {FEATURE_FLAGS[flagName]}
                    </div>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={() => handleToggle(flagName)}
                />
              </div>
            ))}
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Enable all flags for testing
                  Object.keys(FEATURE_FLAGS).forEach(flag => {
                    if (!isFeatureEnabled(flag)) {
                      toggleFeature(flag);
                    }
                  });
                }}
                className="w-full"
              >
                Enable All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FeatureFlagToggle;
