import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, X, Settings, Info } from 'lucide-react';

const ServiceTypeMapping = ({ template, onSave, businessId }) => {
  const [serviceTypes, setServiceTypes] = useState([]);
  const [newServiceType, setNewServiceType] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [triggerEvents, setTriggerEvents] = useState(['manual']);

  useEffect(() => {
    if (template) {
      setServiceTypes(template.service_types || []);
      setIsDefault(template.is_default || false);
      setTriggerEvents(template.trigger_events || ['manual']);
    }
  }, [template]);

  const addServiceType = () => {
    if (newServiceType.trim() && !serviceTypes.includes(newServiceType.trim())) {
      setServiceTypes([...serviceTypes, newServiceType.trim()]);
      setNewServiceType('');
    }
  };

  const removeServiceType = (index) => {
    setServiceTypes(serviceTypes.filter((_, i) => i !== index));
  };

  const toggleTriggerEvent = (event) => {
    if (triggerEvents.includes(event)) {
      setTriggerEvents(triggerEvents.filter(e => e !== event));
    } else {
      setTriggerEvents([...triggerEvents, event]);
    }
  };

  const handleSave = () => {
    onSave({
      service_types: serviceTypes,
      is_default: isDefault,
      trigger_events: triggerEvents
    });
  };

  const availableTriggerEvents = [
    { id: 'manual', label: 'Manual Trigger', description: 'Triggered manually from customer tab' },
    { id: 'jobber_job_completed', label: 'Jobber Job Completed', description: 'Automatically triggered when Jobber job is completed' },
    { id: 'housecall_pro_job_completed', label: 'Housecall Pro Job Completed', description: 'Automatically triggered when Housecall Pro job is completed' },
    { id: 'servicetitan_job_completed', label: 'ServiceTitan Job Completed', description: 'Automatically triggered when ServiceTitan job is completed' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>Service Type & Trigger Configuration</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Service Types */}
        <div>
          <Label className="text-sm font-medium">Service Types</Label>
          <p className="text-xs text-gray-600 mb-3">
            Specify which service types this template should handle. Leave empty to handle all service types.
          </p>
          
          <div className="flex flex-wrap gap-2 mb-3">
            {serviceTypes.map((type, index) => (
              <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                <span>{type}</span>
                <button
                  onClick={() => removeServiceType(index)}
                  className="ml-1 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          
          <div className="flex space-x-2">
            <Input
              value={newServiceType}
              onChange={(e) => setNewServiceType(e.target.value)}
              placeholder="e.g., Lawn Care, Sprinkler Repair"
              onKeyPress={(e) => e.key === 'Enter' && addServiceType()}
            />
            <Button onClick={addServiceType} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Default Template */}
        <div className="flex items-center space-x-3">
          <Switch
            id="is-default"
            checked={isDefault}
            onCheckedChange={setIsDefault}
          />
          <div>
            <Label htmlFor="is-default" className="text-sm font-medium">
              Default Template
            </Label>
            <p className="text-xs text-gray-600">
              Use this template for service types that don't have a specific template
            </p>
          </div>
        </div>

        {/* Trigger Events */}
        <div>
          <Label className="text-sm font-medium">Trigger Events</Label>
          <p className="text-xs text-gray-600 mb-3">
            Select which events should trigger this template
          </p>
          
          <div className="space-y-2">
            {availableTriggerEvents.map((event) => (
              <div key={event.id} className="flex items-center space-x-3">
                <Switch
                  id={event.id}
                  checked={triggerEvents.includes(event.id)}
                  onCheckedChange={() => toggleTriggerEvent(event.id)}
                />
                <div className="flex-1">
                  <Label htmlFor={event.id} className="text-sm font-medium">
                    {event.label}
                  </Label>
                  <p className="text-xs text-gray-600">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">How Service Type Mapping Works</h4>
              <ul className="text-xs text-blue-700 mt-1 space-y-1">
                <li>• <strong>Specific Service Types:</strong> Templates with matching service types are used first</li>
                <li>• <strong>Default Template:</strong> Used when no specific template matches the service type</li>
                <li>• <strong>Trigger Events:</strong> Only templates with matching trigger events will be activated</li>
                <li>• <strong>Jobber Integration:</strong> When a job is completed in Jobber, Blipp automatically finds the best matching template</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} className="w-full">
          Save Service Type Configuration
        </Button>
      </CardContent>
    </Card>
  );
};

export default ServiceTypeMapping;
