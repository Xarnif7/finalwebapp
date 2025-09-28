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
    if (!searchQuery || !searchQuery.trim()) return;
    
    
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
      const service = new window.google.maps.places.AutocompleteService();
      const request = {
        input: searchQuery,
        types: ['establishment'],
        componentRestrictions: { country: 'us' }
      };
      
      service.getPlacePredictions(request, (predictions, status) => {
        setIsSearching(false);
        
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSearchResults(predictions);
        } else {
          setSearchResults([]);
        }
      });
    } catch (error) {
      console.error('Error in searchGooglePlaces:', error);
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  const searchBusinesses = async () => {
    if (!searchQuery || !searchQuery.trim()) return;
    
    try {
      setIsSearching(true);
      setShowSuggestions(true);
      
      console.log('🔍 Searching for:', { query: searchQuery, platform: activeTab });
      
      const response = await fetch('/api/reviews/search-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: searchQuery,
          platform: activeTab
        })
      });

      const data = await response.json();
      console.log('📊 Search response:', data);
      setIsSearching(false);
      
      if (data.success) {
        setSearchResults(data.results || []);
      } else {
        console.error('Search failed:', data.error);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching businesses:', error);
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  const handleBusinessSelect = (result) => {
    let business;
    
    if (activeTab === 'google') {
      // Convert Google Places prediction to our business format
      business = {
        place_id: result.place_id,
        name: result.structured_formatting?.main_text || result.description,
        address: result.structured_formatting?.secondary_text || '',
        url: `https://www.google.com/maps/place/?q=place_id:${result.place_id}`,
        external_id: result.place_id,
        public_url: `https://www.google.com/maps/place/?q=place_id:${result.place_id}`
      };
    } else if (activeTab === 'facebook') {
      // Facebook page result
      business = {
        id: result.id,
        name: result.name,
        category: result.category,
        url: result.url,
        external_id: result.external_id,
        public_url: result.public_url
      };
    } else if (activeTab === 'yelp') {
      // Yelp business result
      business = {
        id: result.id,
        name: result.name,
        category: result.category,
        address: result.address,
        url: result.url,
        external_id: result.external_id,
        public_url: result.public_url,
        rating: result.rating,
        review_count: result.review_count
      };
    }
    
    setSelectedBusiness(business);
    setSearchQuery(business.name);
    setShowSuggestions(false);
  };

  const handleConnect = async () => {
    if (!selectedBusiness) {
      alert('Please select a business first');
      return;
    }
    
    setIsConnecting(true);
    try {
      await connectBusiness(selectedBusiness);
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const connectBusiness = async (business) => {
    try {
      // Get auth token for API calls
      const { data: { session } } = await supabase.auth.getSession();
      
      // Use API endpoint to connect business
      const requestBody = {
        platform: 'google',
        public_url: business.url,
        business_name: business.name,
        external_id: business.place_id,
        place_id: business.place_id
      };
      
      const response = await fetch('/api/reviews/connect-source', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to connect business');
      }
      
      // Show success message
      if (data.reviews_imported > 0) {
        alert(`Success! Connected to ${business.name} and imported ${data.reviews_imported} reviews.`);
      } else {
        alert(`Success! Connected to ${business.name}. No reviews found for this business.`);
      }

      // Reload connected sources
      await loadConnectedSources();
      
      if (onConnectionSuccess) {
        onConnectionSuccess();
      }
      
      // Close modal
      onClose();
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
        onConnectionSuccess();
      }
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
                        if (searchResults && searchResults.length > 0) {
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
                      onClick={activeTab === 'google' ? searchGooglePlaces : searchBusinesses}
                      disabled={isSearching || (activeTab === 'google' && !googleApiLoaded) || !searchQuery || !searchQuery.trim()}
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
                {showSuggestions && searchResults && searchResults.length > 0 && (
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
              <div className="space-y-4">
                <div className="relative">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search for your Facebook page..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => {
                        if (searchResults && searchResults.length > 0) {
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
                      onClick={searchBusinesses}
                      disabled={isSearching || !searchQuery || !searchQuery.trim()}
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
                {showSuggestions && searchResults && searchResults.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => handleBusinessSelect(result)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{result.name}</p>
                            <p className="text-sm text-gray-500">{result.category}</p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Business */}
                {selectedBusiness && (
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div className="flex-1">
                          <p className="font-medium text-green-900">{selectedBusiness.name}</p>
                          <p className="text-sm text-green-700">{selectedBusiness.category}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={handleConnect}
                          disabled={isConnecting}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isConnecting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Connect'
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="yelp" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div className="relative">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search for your Yelp business..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => {
                        if (searchResults && searchResults.length > 0) {
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
                      onClick={searchBusinesses}
                      disabled={isSearching || !searchQuery || !searchQuery.trim()}
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
                {showSuggestions && searchResults && searchResults.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => handleBusinessSelect(result)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{result.name}</p>
                            <p className="text-sm text-gray-500">{result.category}</p>
                            {result.address && (
                              <p className="text-xs text-gray-400">{result.address}</p>
                            )}
                            {result.rating && (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-yellow-500">★</span>
                                <span className="text-xs text-gray-600">
                                  {result.rating} ({result.review_count} reviews)
                                </span>
                              </div>
                            )}
                          </div>
                          <ExternalLink className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Business */}
                {selectedBusiness && (
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div className="flex-1">
                          <p className="font-medium text-green-900">{selectedBusiness.name}</p>
                          <p className="text-sm text-green-700">{selectedBusiness.category}</p>
                          {selectedBusiness.address && (
                            <p className="text-xs text-green-600">{selectedBusiness.address}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={handleConnect}
                          disabled={isConnecting}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isConnecting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Connect'
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ReviewConnectionModal;
