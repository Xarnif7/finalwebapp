import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Search, MapPin, ExternalLink, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const ReviewConnectionModal = ({ isOpen, onClose, onConnectionSuccess }) => {
  const [activeTab, setActiveTab] = useState('google');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [connectedSources, setConnectedSources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  console.log('=== MODAL RENDER DEBUG ===');
  console.log('Modal isOpen:', isOpen);
  console.log('Modal props:', { isOpen, onClose: !!onClose, onConnectionSuccess: !!onConnectionSuccess });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [googleApiLoaded, setGoogleApiLoaded] = useState(false);

  // Load Google Maps API dynamically
  useEffect(() => {
    const loadGoogleMapsAPI = () => {
      // Check if already loaded
      if (window.google && window.google.maps && window.google.maps.places) {
        console.log('Google Maps API already loaded');
        setGoogleApiLoaded(true);
        return;
      }

      // Get API key from environment
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
      if (!apiKey) {
        console.error('Google Maps API key not found in environment variables');
        return;
      }

      // Create script element
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('Google Maps API loaded successfully');
        setGoogleApiLoaded(true);
      };
      
      script.onerror = () => {
        console.error('Failed to load Google Maps API');
      };
      
      document.head.appendChild(script);
    };

    loadGoogleMapsAPI();
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      loadConnectedSources();
    }
  }, [isOpen]);

  // Search when query changes
  React.useEffect(() => {
    if (searchQuery.length > 2 && googleApiLoaded) {
      searchGooglePlaces();
    } else if (searchQuery.length <= 2) {
      setSearchResults([]);
      setShowSuggestions(false);
    }
  }, [searchQuery, googleApiLoaded]);

  const loadConnectedSources = async () => {
    try {
      // Get auth token for API calls
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/reviews/sources', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setConnectedSources(data.sources || []);
      } else {
        console.error('Error loading connected sources:', data.error);
        setConnectedSources([]);
      }
    } catch (error) {
      console.error('Error loading connected sources:', error);
      setConnectedSources([]);
    } finally {
      setIsLoading(false);
    }
  };

  const searchGooglePlaces = async () => {
    if (!searchQuery.trim()) return;
    
    console.log('=== SEARCH DEBUG ===');
    console.log('Query:', searchQuery);
    console.log('Google API loaded:', googleApiLoaded);
    console.log('Window google exists:', !!window.google);
    console.log('Google maps exists:', !!(window.google && window.google.maps));
    console.log('Google places exists:', !!(window.google && window.google.maps && window.google.maps.places));
    
    if (!googleApiLoaded) {
      console.log('API not loaded yet');
      return;
    }
    
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      console.log('Google API not available');
      return;
    }
    
    try {
      setIsSearching(true);
      setShowSuggestions(true);
      console.log('Starting search for:', searchQuery);
      
      const service = new window.google.maps.places.AutocompleteService();
      const request = {
        input: searchQuery,
        types: ['establishment'],
        componentRestrictions: { country: 'us' }
      };
      
      console.log('Making Places API request:', request);
      
      service.getPlacePredictions(request, (predictions, status) => {
        console.log('=== PLACES API RESPONSE ===');
        console.log('Status:', status);
        console.log('Status OK constant:', window.google.maps.places.PlacesServiceStatus.OK);
        console.log('Status comparison:', status === window.google.maps.places.PlacesServiceStatus.OK);
        console.log('Predictions count:', predictions?.length);
        console.log('Predictions:', predictions);
        
        setIsSearching(false);
        
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          console.log('Success! Setting results...');
          setSearchResults(predictions);
          if (predictions.length === 0) {
            console.log('No businesses found');
          } else {
            console.log(`Found ${predictions.length} businesses`);
          }
        } else {
          if (status === 'ZERO_RESULTS') {
            setSearchResults([]);
            console.log('No businesses found with that name');
          } else {
            setSearchResults([]);
            console.error(`Search failed: ${status}`);
          }
        }
      });
    } catch (error) {
      console.error('Error in searchGooglePlaces:', error);
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  const handleBusinessSelect = (prediction) => {
    // Convert Google Places prediction to our business format
    const business = {
      place_id: prediction.place_id,
      name: prediction.structured_formatting?.main_text || prediction.description,
      address: prediction.structured_formatting?.secondary_text || '',
      url: `https://www.google.com/maps/place/?q=place_id:${prediction.place_id}`
    };
    
    setSelectedBusiness(business);
    setSearchQuery(business.name);
    setShowSuggestions(false);
  };

  const handleConnect = async () => {
    console.log('=== HANDLE CONNECT DEBUG ===');
    console.log('Selected business:', selectedBusiness);
    
    if (!selectedBusiness) {
      console.log('No business selected, returning');
      alert('Please select a business first');
      return;
    }
    
    setIsConnecting(true);
    try {
      console.log('Starting connection process...');
      await connectBusiness(selectedBusiness);
      console.log('Connection process completed');
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setIsConnecting(false);
      console.log('Connection process finished');
    }
  };

  const connectBusiness = async (business) => {
    try {
      console.log('=== CONNECT BUSINESS START ===');
      
      // Get auth token for API calls
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session retrieved:', !!session);
      console.log('Access token available:', !!session?.access_token);
      
      // Use API endpoint to connect business
      const requestBody = {
        platform: 'google',
        public_url: business.url,
        business_name: business.name,
        external_id: business.place_id,
        place_id: business.place_id
      };
      
      console.log('=== FRONTEND CONNECTION DEBUG ===');
      console.log('Connecting business:', business);
      console.log('Request body:', requestBody);
      console.log('Session token available:', !!session?.access_token);
      
      console.log('Making fetch request to /api/reviews/connect-source...');
      const response = await fetch('/api/reviews/connect-source', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Fetch response received, status:', response.status);
      console.log('Response ok:', response.ok);
      
      const data = await response.json();
      
      console.log('=== CONNECTION RESPONSE DEBUG ===');
      console.log('Response status:', response.status);
      console.log('Response data:', data);
      
      if (!data.success) {
        console.log('Connection failed:', data.error);
        throw new Error(data.error || 'Failed to connect business');
      }
      
      console.log('Connection successful, reviews imported:', data.reviews_imported);
      
      // Show detailed debugging info
      console.log('=== CONNECTION DEBUG INFO ===');
      console.log('Business connected:', business.name);
      console.log('Place ID used:', business.place_id);
      console.log('Reviews imported:', data.reviews_imported);
      console.log('Total available:', data.total_available);
      console.log('Sync success:', data.sync_success);
      
      // Show success message
      if (data.reviews_imported > 0) {
        alert(`Success! Connected to ${business.name} and imported ${data.reviews_imported} reviews.`);
      } else {
        alert(`Success! Connected to ${business.name}. No reviews found for this business.\n\nPlace ID: ${business.place_id}\nThis might be the wrong business or location.`);
      }

      // Reload connected sources
      console.log('Reloading connected sources...');
      await loadConnectedSources();
      console.log('Connected sources reloaded');
      
      if (onConnectionSuccess) {
        console.log('Calling onConnectionSuccess callback...');
        onConnectionSuccess();
        console.log('onConnectionSuccess callback completed');
      }
      
      // Close modal
      console.log('Closing modal...');
      onClose();
      console.log('Modal closed');
    } catch (error) {
      console.error('Error connecting business:', error);
      alert('Error connecting business: ' + error.message);
    }
  };

  const syncReviews = async (businessId, placeId) => {
    try {
      const response = await fetch('/api/reviews/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          place_id: placeId,
          platform: 'google',
          limit: 15 // Only import 15 most recent reviews
        })
      });

      const data = await response.json();
      if (!data.success) {
        console.error('Sync failed:', data.error);
      }
    } catch (error) {
      console.error('Error syncing reviews:', error);
    }
  };

  const disconnectSource = async (sourceId) => {
    try {
      // Get auth token for API calls
      const { data: { session } } = await supabase.auth.getSession();
      
      // Call API endpoint to disconnect and delete reviews
      const response = await fetch('/api/reviews/disconnect-source', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ source_id: sourceId })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to disconnect source');
      }

      // Reload connected sources
      await loadConnectedSources();
      
      // Refresh the inbox if onConnectionSuccess callback exists
      if (onConnectionSuccess) {
        console.log('=== CONNECTION SUCCESS CALLBACK ===');
        console.log('Calling onConnectionSuccess...');
        onConnectionSuccess();
      }
      
      console.log('Source disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting source:', error);
      alert('Error disconnecting source: ' + error.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Connect Review Platforms</h2>
              <p className="text-gray-600 mt-1">
                Connect your business profiles to automatically import reviews
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="google">Google</TabsTrigger>
              <TabsTrigger value="facebook">Facebook</TabsTrigger>
              <TabsTrigger value="yelp">Yelp</TabsTrigger>
            </TabsList>

            <TabsContent value="google" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div className="relative">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Start typing your business name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => {
                        if (searchResults.length > 0) {
                          setShowSuggestions(true);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowSuggestions(false), 200);
                      }}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={searchGooglePlaces}
                      disabled={isSearching || !googleApiLoaded || !searchQuery.trim()}
                    >
                      {isSearching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Search Results Dropdown */}
                {showSuggestions && searchResults.length > 0 && (
                  <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                    {searchResults.map((prediction) => (
                      <div
                        key={prediction.place_id}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                        onClick={() => handleBusinessSelect(prediction)}
                      >
                        <div className="font-medium text-gray-900">{prediction.structured_formatting?.main_text}</div>
                        <div className="text-sm text-gray-500">{prediction.structured_formatting?.secondary_text}</div>
                      </div>
                    ))}
                  </div>
                )}

                {showSuggestions && searchResults.length === 0 && isSearching && (
                  <div className="mt-2 p-3 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 inline animate-spin mr-2" />
                    Searching...
                  </div>
                )}

                {showSuggestions && searchResults.length === 0 && searchQuery.trim() && !isSearching && (
                  <div className="mt-2 p-3 text-sm text-gray-500">
                    No businesses found. Try a different search term.
                  </div>
                )}

                {/* Selected Business Confirmation */}
                {selectedBusiness && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Selected Business:</h4>
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-900">{selectedBusiness.name}</p>
                        <p className="text-sm text-blue-700">{selectedBusiness.address}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Connect Button */}
                {selectedBusiness && (
                  <div className="mt-4">
                    <Button 
                      onClick={handleConnect}
                      disabled={isConnecting || connectedSources.some(s => s.external_id === selectedBusiness.place_id)}
                      className="w-full"
                    >
                      {isConnecting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Connecting and importing reviews...
                        </>
                      ) : connectedSources.some(s => s.external_id === selectedBusiness.place_id) ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Already Connected
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Connect and Import Reviews
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {connectedSources.filter(s => s.platform === 'google').length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Connected Google Businesses:</h4>
                  {connectedSources.filter(s => s.platform === 'google').map((source) => (
                    <div key={source.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <div>
                          <p className="font-medium">{source.business_name}</p>
                          <a 
                            href={source.public_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            View on Google <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => disconnectSource(source.id)}
                      >
                        Disconnect
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="facebook" className="space-y-4 mt-6">
              <div className="text-center p-8">
                <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="font-medium mb-2">Facebook Integration Coming Soon</h3>
                <p className="text-gray-500 text-sm">
                  We're working on Facebook Business integration. Use Zapier for now.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="yelp" className="space-y-4 mt-6">
              <div className="text-center p-8">
                <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="font-medium mb-2">Yelp Integration Coming Soon</h3>
                <p className="text-gray-500 text-sm">
                  We're working on Yelp Business integration. Use Zapier for now.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ReviewConnectionModal;
