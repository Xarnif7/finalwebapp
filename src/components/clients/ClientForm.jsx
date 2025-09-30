
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, X, Plus } from "lucide-react";
import { Client } from '@/api/entities';
import SmsOptInConsent from '../shared/SmsOptInConsent';

const commonTags = [
  "New Client", "VIP", "Regular", "Referred", "High Value", 
  "Follow-up", "Consultation", "Treatment", "Maintenance"
];

// Generate time options for the dropdown
const generateTimeOptions = () => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour = h.toString().padStart(2, '0');
      const minute = m.toString().padStart(2, '0');
      const time24 = `${hour}:${minute}`;
      
      const period = h >= 12 ? 'PM' : 'AM';
      let displayHour = h % 12;
      if (displayHour === 0) displayHour = 12;
      const displayTime = `${displayHour}:${minute} ${period}`;
      
      options.push({ value: time24, label: displayTime });
    }
  }
  return options;
};
const timeOptions = generateTimeOptions();

export default function ClientForm({ isOpen, onClose, onSubmit, client, businessId }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    service_date: '',
    service_time: '',
    tags: [],
    notes: '',
    sms_consent: false,
    email_consent: true
  });
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (client) {
      let serviceDate = '';
      let serviceTime = '';
      
      if (client.service_date) {
        try {
          const date = new Date(client.service_date);
          if (!isNaN(date)) {
            serviceDate = date.toISOString().split('T')[0];
            serviceTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
          }
        } catch(e) { console.error("Could not parse date", client.service_date) }
      }
      
      setFormData({
        first_name: client.first_name || '',
        last_name: client.last_name || '',
        email: client.email || '',
        phone: client.phone || '',
        service_date: serviceDate,
        service_time: serviceTime,
        tags: client.tags || [],
        notes: client.notes || '',
        sms_consent: client.sms_consent || false,
        email_consent: client.email_consent !== false // Default to true if not set
      });
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        service_date: '',
        service_time: '',
        tags: [],
        notes: '',
        sms_consent: false,
        email_consent: true
      });
    }
  }, [client, isOpen]);
  
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({...prev, [id]: value}));
  }

  const handleTimeChange = (e) => {
    setFormData(prev => ({ ...prev, service_time: e.target.value }));
  };

  const handleAddTag = (tag) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    let combinedDateTime = null;
    if (formData.service_date) {
      const timePart = formData.service_time || "00:00";
      const fullDateTimeString = `${formData.service_date}T${timePart}:00`;
      combinedDateTime = new Date(fullDateTimeString).toISOString();
    }
    
    const submitData = {
      ...formData,
      business_id: businessId, // Ensure business_id is included
      service_date: combinedDateTime
    };
    
    delete submitData.service_time;

    if (client?.id) {
        await Client.update(client.id, submitData);
    } else {
        await Client.create(submitData);
    }
    
    onSubmit(submitData);
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{client ? 'Edit Client' : 'Add New Client'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input id="first_name" value={formData.first_name} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input id="last_name" value={formData.last_name} onChange={handleInputChange} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={formData.email} onChange={handleInputChange} required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (for SMS)</Label>
              <Input 
                id="phone" 
                type="tel" 
                value={formData.phone} 
                onChange={handleInputChange} 
                placeholder="+1 (555) 123-4567" 
              />
            </div>

            {/* SMS Consent - only show if phone number is provided */}
            {formData.phone && formData.phone.trim() && (
              <SmsOptInConsent
                businessName="Blipp - Reputation Management Software"
                onConsentChange={(consent) => setFormData(prev => ({ ...prev, sms_consent: consent }))}
                initialConsent={formData.sms_consent}
                showFullForm={false}
                className="mt-4"
              />
            )}
            
            {/* Service Date and Time */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Service Date & Time
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input 
                  id="service_date" 
                  type="date" 
                  value={formData.service_date} 
                  onChange={handleInputChange}
                  placeholder="Service Date"
                />
                <select
                  value={formData.service_time}
                  onChange={handleTimeChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select Time</option>
                  {timeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500">
                Automatic review requests will be scheduled based on this time.
              </p>
            </div>

            {/* Tags Section */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="space-y-2">
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {formData.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <X 
                          className="w-3 h-3 cursor-pointer" 
                          onClick={() => handleRemoveTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag(newTag);
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={() => handleAddTag(newTag)}
                    disabled={!newTag.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {commonTags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-gray-100"
                      onClick={() => handleAddTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Additional notes about this client..."
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                {client ? 'Update Client' : 'Save Client'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}


