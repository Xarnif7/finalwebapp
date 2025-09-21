import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MapPin, Upload, Plus, X, CheckCircle } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase/browser';

const ServiceAreaStep = ({ data, onUpdate }) => {
  const { user } = useAuth();
  const [businessAddress, setBusinessAddress] = useState('');
  const [zipCodes, setZipCodes] = useState([]);
  const [customZipInput, setCustomZipInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadBusinessAddress();
  }, []);

  const loadBusinessAddress = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (profile?.business_id) {
        const { data: business } = await supabase
          .from('businesses')
          .select('address, city, state, zip_code')
          .eq('id', profile.business_id)
          .single();

        if (business) {
          const fullAddress = `${business.address}, ${business.city}, ${business.state} ${business.zip_code}`;
          setBusinessAddress(fullAddress);
          
          // Generate 20-mile radius zip codes (simplified - in real app, use geocoding API)
          if (business.zip_code) {
            generateZipCodesFromRadius(business.zip_code, 20);
          }
        }
      }
    } catch (error) {
      console.error('Error loading business address:', error);
    }
  };

  const generateZipCodesFromRadius = (centerZip, radiusMiles) => {
    // This is a simplified version - in production, use a geocoding service like Google Maps API
    // For now, we'll simulate some nearby zip codes within the radius
    const centerZipNum = parseInt(centerZip);
    const simulatedZips = [];
    
    // Generate zip codes within radius (simplified algorithm)
    for (let i = -Math.floor(radiusMiles / 2); i <= Math.floor(radiusMiles / 2); i++) {
      const zip = centerZipNum + i;
      if (zip >= 10000 && zip <= 99999) {
        simulatedZips.push(zip.toString().padStart(5, '0'));
      }
    }
    
    // Add some additional nearby zips for better coverage
    const additionalZips = [
      centerZipNum + 10, centerZipNum + 20, centerZipNum - 10, centerZipNum - 20,
      centerZipNum + 5, centerZipNum - 5, centerZipNum + 15, centerZipNum - 15
    ].filter(zip => zip >= 10000 && zip <= 99999)
     .map(zip => zip.toString().padStart(5, '0'));
    
    const allZips = [...new Set([...simulatedZips, ...additionalZips])].slice(0, 15); // Limit to 15 zips
    
    setZipCodes(allZips);
    onUpdate({
      serviceArea: {
        ...data.serviceArea,
        zipCodes: allZips,
        radius: radiusMiles
      }
    });
  };

  const handleAddCustomZip = () => {
    if (customZipInput && !zipCodes.includes(customZipInput)) {
      const newZips = [...zipCodes, customZipInput];
      setZipCodes(newZips);
      setCustomZipInput('');
      onUpdate({
        serviceArea: {
          ...data.serviceArea,
          zipCodes: newZips
        }
      });
    }
  };

  const handleRemoveZip = (zipToRemove) => {
    const newZips = zipCodes.filter(zip => zip !== zipToRemove);
    setZipCodes(newZips);
    onUpdate({
      serviceArea: {
        ...data.serviceArea,
        zipCodes: newZips
      }
    });
  };

  const handlePasteZips = (event) => {
    const pastedText = event.target.value;
    const zips = pastedText.split(/[,\n\s]+/).filter(zip => /^\d{5}$/.test(zip));
    
    if (zips.length > 0) {
      const newZips = [...new Set([...zipCodes, ...zips])];
      setZipCodes(newZips);
      onUpdate({
        serviceArea: {
          ...data.serviceArea,
          zipCodes: newZips
        }
      });
    }
  };

  const handleRadiusChange = (radius) => {
    if (businessAddress) {
      generateZipCodesFromRadius(businessAddress.split(' ').pop(), radius);
    }
    onUpdate({
      serviceArea: {
        ...data.serviceArea,
        radius: radius
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Define your service area</h3>
        <p className="text-gray-600">We'll automatically generate zip codes within your radius, or you can add custom ones</p>
      </div>

      {/* Business Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Your Business Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              {businessAddress || 'Loading business address...'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Radius Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Service Radius</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="radius">Coverage radius:</Label>
              <select
                id="radius"
                value={data.serviceArea.radius}
                onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10 miles</option>
                <option value={15}>15 miles</option>
                <option value={20}>20 miles</option>
                <option value={25}>25 miles</option>
                <option value={30}>30 miles</option>
                <option value={50}>50 miles</option>
              </select>
            </div>
            <p className="text-sm text-gray-600">
              We'll automatically include all zip codes within {data.serviceArea.radius} miles of your business
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Generated Zip Codes */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Service Area</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {zipCodes.map((zip, index) => (
                <Badge key={index} variant="outline" className="flex items-center gap-1">
                  {zip}
                  <button
                    onClick={() => handleRemoveZip(zip)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <p className="text-sm text-gray-600">
              {zipCodes.length} zip codes included in your service area
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Custom Zip Code Addition */}
      <Card>
        <CardHeader>
          <CardTitle>Add Custom Zip Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter zip code (e.g., 12345)"
                value={customZipInput}
                onChange={(e) => setCustomZipInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCustomZip()}
                maxLength={5}
              />
              <Button onClick={handleAddCustomZip} disabled={!customZipInput}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label>Or paste multiple zip codes:</Label>
              <Textarea
                placeholder="Paste zip codes separated by commas, spaces, or new lines:&#10;12345, 12346, 12347&#10;12348 12349 12350"
                onChange={handlePasteZips}
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Mapping Link */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-blue-900">Need precise mapping?</h4>
              <p className="text-sm text-blue-700">
                For detailed service area mapping with city boundaries and custom regions
              </p>
            </div>
            <Button variant="outline" size="sm">
              Advanced Mapping
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {zipCodes.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <h4 className="font-semibold text-green-900">Service area configured!</h4>
                <p className="text-sm text-green-700">
                  {zipCodes.length} zip codes ready for your review requests
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ServiceAreaStep;
