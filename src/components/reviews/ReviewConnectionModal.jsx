import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Search, MapPin, ExternalLink, CheckCircle, AlertCircle, X } from 'lucide-react';
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

  React.useEffect(() => {
    if (isOpen) {
      loadConnectedSources();
    }
  }, [isOpen]);

  // Debounce search to prevent rapid API calls
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchGoogleBusiness();
      } else {
        setSearchResults([]);
        setShowSuggestions(false);
      }
    }, 300); // 300ms delay

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

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

  const searchGoogleBusiness = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    setShowSuggestions(true);
    
    try {
      console.log('Searching for:', searchQuery);
      
      const response = await fetch('/api/reviews/search-business', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          query: searchQuery,
          platform: 'google'
        })
      });

      const data = await response.json();
      console.log('Search response:', data);
      
      if (data.success) {
        setSearchResults(data.results || []);
        setShowSuggestions(true); // Ensure suggestions are shown
        console.log('Search results:', data.results?.length);
      } else {
        console.error('Search failed:', data.error);
        setSearchResults([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error searching businesses:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleBusinessSelect = (business) => {
    setSelectedBusiness(business);
    setSearchQuery(business.name);
    setShowSuggestions(false);
    
    // Force re-render to show selection immediately
    setTimeout(() => {
      setShowSuggestions(false);
    }, 100);
  };

  const handleConnect = async () => {
    if (!selectedBusiness) return;
    
    setIsConnecting(true);
    try {
      await connectBusiness(selectedBusiness);
    } finally {
      setIsConnecting(false);
    }
  };

  const connectBusiness = async (business) => {
    try {
      // Get auth token for API calls
      const { data: { session } } = await supabase.auth.getSession();
      
      // Use API endpoint to connect business
      const response = await fetch('/api/reviews/connect-source', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          platform: 'google',
          public_url: business.url,
          business_name: business.name,
          external_id: business.place_id,
          place_id: business.place_id
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to connect business');
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
      const { error } = await supabase
        .from('review_sources')
        .update({ is_active: false })
        .eq('id', sourceId);

      if (error) throw error;
      await loadConnectedSources();
    } catch (error) {
      console.error('Error disconnecting source:', error);
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
                  <Input
                    placeholder="Search for your business on Google..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (searchResults.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      // Only hide suggestions if no search results
                      if (searchResults.length === 0) {
                        console.log('Hiding suggestions due to blur - no results');
                        setShowSuggestions(false);
                      }
                    }}
                    className="w-full"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>

                {/* Search Results Dropdown */}
                {console.log('Render check - showSuggestions:', showSuggestions, 'searchResults.length:', searchResults.length)}
                {showSuggestions && searchResults.length > 0 && (
                  <div 
                    className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {searchResults.map((business, index) => (
                      <div 
                        key={index} 
                        className={`flex items-start justify-between p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                          selectedBusiness?.place_id === business.place_id ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                        onMouseDown={(e) => {
                          e.preventDefault(); // Prevent input blur
                          handleBusinessSelect(business);
                        }}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <MapPin className="h-4 w-4 text-gray-500 mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{business.name}</p>
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{business.address}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-sm text-gray-600">
                                {business.rating}/5 ({business.user_ratings_total} reviews)
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 ml-4 flex-shrink-0">
                          {selectedBusiness?.place_id === business.place_id ? 'Selected' : 'Click to select'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {showSuggestions && searchResults.length === 0 && searchQuery.trim() && !isSearching && (
                  <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                    <p className="text-gray-500 text-center">No businesses found</p>
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
                        <p className="text-sm text-blue-600">
                          {selectedBusiness.rating}/5 ({selectedBusiness.user_ratings_total} reviews)
                        </p>
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
