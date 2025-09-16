import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
   MapPin, 
   Facebook, 
   Star, 
   ExternalLink, 
   RefreshCw, 
   CheckCircle, 
   AlertCircle,
   Loader2,
   Copy,
   Settings,
   Search
 } from 'lucide-react';
import { supabase } from '@/lib/supabase/browser';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'react-hot-toast';

const IntegrationsTab = () => {
  const { user } = useAuth();
  const [reviewSources, setReviewSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState({});
  const [formData, setFormData] = useState({});
  const [facebookPages, setFacebookPages] = useState([]);
  const [showFacebookPages, setShowFacebookPages] = useState(false);
  const [googleSearchQuery, setGoogleSearchQuery] = useState('');
  const [googleSearchResults, setGoogleSearchResults] = useState([]);
  const [showGoogleSearch, setShowGoogleSearch] = useState(false);
  const [googleApiLoaded, setGoogleApiLoaded] = useState(false);
  const [searching, setSearching] = useState(false);

  

     useEffect(() => {
     if (user) {
       fetchReviewSources();
     }
   }, [user]);

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
      console.log('API Key available:', !!apiKey);
      
      if (!apiKey) {
        console.error('Google Maps API key not found');
        toast.error('Google Maps API key not configured');
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
        toast.success('Google Maps API loaded successfully');
      };
      
      script.onerror = () => {
        console.error('Failed to load Google Maps API');
        toast.error('Failed to load Google Maps API');
      };

      document.head.appendChild(script);
    };

    loadGoogleMapsAPI();
  }, []);

  

  const fetchReviewSources = async () => {
    try {
      setLoading(true);
      
      // Get user's business_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) return;

      // Get existing review sources
      const { data: sources } = await supabase
        .from('review_sources')
        .select('*')
        .eq('business_id', profile.business_id);

      setReviewSources(sources || []);
      
      // Initialize form data
      const initialData = {};
      ['google', 'facebook', 'yelp'].forEach(platform => {
        const source = sources?.find(s => s.platform === platform);
        initialData[platform] = {
          public_url: source?.public_url || '',
          external_id: source?.external_id || '',
          connection_type: source?.connection_type || (platform === 'google' ? 'places' : 'api_key'),
          connected: source?.connected || false,
          access_token: source?.access_token || '',
          last_synced_at: source?.last_synced_at || null
        };
      });
      setFormData(initialData);
      
    } catch (error) {
      console.error('Error fetching review sources:', error);
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (platform, field, value) => {
    setFormData(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value
      }
    }));
  };

           // Google Places Autocomplete
    const searchGooglePlaces = async (query) => {
      if (!query.trim()) return;
      
      console.log('=== SEARCH DEBUG ===');
      console.log('Query:', query);
      console.log('Google API loaded:', googleApiLoaded);
      console.log('Window google exists:', !!window.google);
      console.log('Google maps exists:', !!(window.google && window.google.maps));
      console.log('Google places exists:', !!(window.google && window.google.maps && window.google.maps.places));
      
      if (!googleApiLoaded) {
        console.log('API not loaded yet');
        toast.error('Google Maps API is still loading. Please wait a moment and try again.');
        return;
      }
      
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.log('Google API not available');
        toast.error('Google Maps API not available. Please refresh the page.');
        return;
      }
      
      try {
        setSearching(true);
        setShowGoogleSearch(true);
        console.log('Starting search for:', query);
        
        const service = new window.google.maps.places.AutocompleteService();
        const request = {
          input: query,
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
          
          setSearching(false);
          
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            console.log('Success! Setting results...');
            setGoogleSearchResults(predictions);
            if (predictions.length === 0) {
              toast.info('No businesses found with that name. Try a different search term.');
            } else {
              toast.success(`Found ${predictions.length} businesses`);
            }
          } else {
            if (status === 'ZERO_RESULTS') {
              setGoogleSearchResults([]);
              toast.info('No businesses found with that name. Try a different search term.');
            } else {
              setGoogleSearchResults([]);
              toast.error(`Search failed: ${status}`);
            }
          }
        });
      } catch (error) {
        setSearching(false);
        setGoogleSearchResults([]);
        console.error('Google Places search error:', error);
        toast.error('Search failed. Please try again.');
      }
    };

  const selectGooglePlace = async (placeId, description) => {
    try {
      const service = new window.google.maps.places.PlacesService(document.createElement('div'));
      
      service.getDetails({ placeId }, (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          handleInputChange('google', 'external_id', place.place_id);
          handleInputChange('google', 'public_url', place.url || `https://maps.google.com/?cid=${place.place_id}`);
          setGoogleSearchQuery(place.name || description);
          setShowGoogleSearch(false);
          setGoogleSearchResults([]);
          toast.success('Google Place selected successfully');
        }
      });
    } catch (error) {
      console.error('Error selecting Google place:', error);
      toast.error('Failed to select Google place');
    }
  };

  const resolveGooglePlaceId = async (url) => {
    try {
      // Extract Google Place ID from URL
      let placeId = null;
      
      // Try different URL formats
      const cidMatch = url.match(/[?&]cid=([^&]+)/);
      if (cidMatch) {
        placeId = cidMatch[1];
      } else {
        const dataMatch = url.match(/[?&]data=([^&]+)/);
        if (dataMatch) {
          placeId = dataMatch[1];
        } else {
          const placeMatch = url.match(/place\/([^\/\?]+)/);
          if (placeMatch) {
            placeId = placeMatch[1];
          }
        }
      }
      
      if (placeId) {
        handleInputChange('google', 'external_id', placeId);
        toast.success('Google Place ID extracted successfully');
      } else {
        toast.error('Could not extract Place ID from URL. Please check the format.');
      }
    } catch (error) {
      toast.error('Failed to extract Google Place ID');
    }
  };

  const resolveYelpBusinessId = async (url) => {
    try {
      // Extract Yelp Business ID from URL
      const businessMatch = url.match(/\/biz\/([^\/\?]+)/);
      
      if (businessMatch) {
        const businessId = businessMatch[1].split('?')[0].split('#')[0]; // Clean up
        handleInputChange('yelp', 'external_id', businessId);
        toast.success('Yelp Business ID extracted successfully');
      } else {
        toast.error('Could not extract Business ID from URL. Please check the format.');
      }
    } catch (error) {
      toast.error('Failed to extract Yelp Business ID');
    }
  };

  // Facebook OAuth
  const connectFacebook = async () => {
    try {
      const response = await fetch('/api/auth/facebook/login');
      const data = await response.json();
      
      if (data.auth_url) {
        // Store state for verification
        sessionStorage.setItem('fb_oauth_state', data.state);
        window.open(data.auth_url, '_blank', 'width=600,height=600');
        
        // Poll for callback completion
        const checkCallback = setInterval(async () => {
          try {
            const callbackResponse = await fetch('/api/auth/facebook/callback');
            if (callbackResponse.ok) {
              const callbackData = await callbackResponse.json();
              if (callbackData.success && callbackData.pages) {
                setFacebookPages(callbackData.pages);
                setShowFacebookPages(true);
                clearInterval(checkCallback);
              }
            }
          } catch (error) {
            // Ignore polling errors
          }
        }, 2000);
        
        // Clear interval after 5 minutes
        setTimeout(() => clearInterval(checkCallback), 300000);
      }
    } catch (error) {
      console.error('Facebook OAuth error:', error);
      toast.error('Failed to start Facebook OAuth');
    }
  };

  const selectFacebookPage = async (page) => {
    try {
      handleInputChange('facebook', 'external_id', page.id);
      handleInputChange('facebook', 'access_token', page.access_token);
      handleInputChange('facebook', 'public_url', `https://facebook.com/${page.id}`);
      setShowFacebookPages(false);
      setFacebookPages([]);
      toast.success(`Facebook Page "${page.name}" selected`);
    } catch (error) {
      console.error('Error selecting Facebook page:', error);
      toast.error('Failed to select Facebook page');
    }
  };

  const saveIntegration = async (platform) => {
    try {
      const data = formData[platform];
      
      if (!data.public_url || !data.external_id) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Get user's business_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) {
        toast.error('Business not found');
        return;
      }

      // Check if source already exists
      const existingSource = reviewSources.find(s => s.platform === platform);
      
      if (existingSource) {
        // Update existing
        const { error } = await supabase
          .from('review_sources')
          .update({
            public_url: data.public_url,
            external_id: data.external_id,
            connection_type: data.connection_type,
            connected: true,
            access_token: data.access_token || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSource.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('review_sources')
          .insert({
            business_id: profile.business_id,
            platform,
            public_url: data.public_url,
            external_id: data.external_id,
            connection_type: data.connection_type,
            connected: true,
            access_token: data.access_token || null
          });

        if (error) throw error;
      }

      toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} integration saved successfully`);
      fetchReviewSources();
      
    } catch (error) {
      console.error('Error saving integration:', error);
      toast.error('Failed to save integration');
    }
  };

  const disconnectIntegration = async (platform) => {
    try {
      const existingSource = reviewSources.find(s => s.platform === platform);
      if (existingSource) {
        const { error } = await supabase
          .from('review_sources')
          .update({
            connected: false,
            access_token: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSource.id);

        if (error) throw error;
        
        toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} disconnected successfully`);
        fetchReviewSources();
      }
    } catch (error) {
      console.error('Error disconnecting integration:', error);
      toast.error('Failed to disconnect integration');
    }
  };

  const testConnection = async (platform) => {
    try {
      setSyncing(prev => ({ ...prev, [platform]: true }));
      
      // Get user's business_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) {
        toast.error('Business not found');
        return;
      }

      const response = await fetch(`/api/reviews/sync`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-internal-key': import.meta.env.VITE_INTERNAL_API_KEY || 'your-internal-key-here'
        },
        body: JSON.stringify({ business_id: profile.business_id, platform })
      });

      const result = await response.json();
      
      if (response.ok) {
        const platformResult = result.details[platform];
        if (platformResult && !platformResult.error) {
          toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} connection test successful! Found ${platformResult.total} reviews.`);
        } else {
          toast.error(`Connection test failed: ${platformResult?.error || result.error}`);
        }
      } else {
        toast.error(`Connection test failed: ${result.error}`);
      }
      
    } catch (error) {
      console.error('Error testing connection:', error);
      toast.error('Connection test failed');
    } finally {
      setSyncing(prev => ({ ...prev, [platform]: false }));
    }
  };

  const syncNow = async (platform) => {
    try {
      setSyncing(prev => ({ ...prev, [`sync_${platform}`]: true }));
      
      // Get user's business_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) {
        toast.error('Business not found');
        return;
      }

      const response = await fetch(`/api/reviews/sync`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-internal-key': import.meta.env.VITE_INTERNAL_API_KEY || 'your-internal-key-here'
        },
        body: JSON.stringify({ business_id: profile.business_id, platform })
      });

      const result = await response.json();
      
      if (response.ok) {
        const platformResult = result.details[platform];
        if (platformResult && !platformResult.error) {
          toast.success(`Synced ${platformResult.inserted} new reviews and updated ${platformResult.updated} existing reviews.`);
        } else {
          toast.error(`Sync failed: ${platformResult?.error || result.error}`);
        }
        fetchReviewSources(); // Refresh last_synced_at
      } else {
        toast.error(`Sync failed: ${result.error}`);
      }
      
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Sync failed');
    } finally {
      setSyncing(prev => ({ ...prev, [`sync_${platform}`]: false }));
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'google': return <MapPin className="h-5 w-5" />;
      case 'facebook': return <Facebook className="h-5 w-5" />;
      case 'yelp': return <Star className="h-5 w-5" />;
      default: return <Settings className="h-5 w-5" />;
    }
  };

  const getPlatformName = (platform) => {
    switch (platform) {
      case 'google': return 'Google';
      case 'facebook': return 'Facebook';
      case 'yelp': return 'Yelp';
      default: return platform;
    }
  };

  const getConnectionTypeLabel = (type) => {
    switch (type) {
      case 'places': return 'Google Places API';
      case 'page_oauth': return 'Facebook Page OAuth';
      case 'api_key': return 'API Key';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
             <div>
         <h2 className="text-lg font-semibold mb-2">Review Platform Integrations</h2>
         <p className="text-sm text-muted-foreground mb-4">
           Connect your business to automatically import reviews from Google, Facebook, and Yelp. 
           <strong> For Google:</strong> Use the search box above to find your business, or paste your Google Maps URL and click "Resolve ID".
         </p>
       </div>

      

      {['google', 'facebook', 'yelp'].map((platform) => {
        const data = formData[platform] || {};
        const source = reviewSources.find(s => s.platform === platform);
        const isConnected = source?.connected && source?.external_id && source?.public_url && 
                           !source.external_id.includes('wdadaw') && 
                           !source.external_id.includes('random') &&
                           source.external_id.length > 5;
        const lastSynced = source?.last_synced_at;

        return (
          <Card key={platform}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getPlatformIcon(platform)}
                {getPlatformName(platform)} Integration
                {isConnected && (
                  <Badge variant="secondary" className="ml-auto">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                                                           {/* Google Places Search */}
                {platform === 'google' && (
                  <div>
                    <Label>Search for your business</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Type your business name to find and auto-fill the details below
                    </p>
                    
                    {!googleApiLoaded && (
                      <div className="mb-2 p-2 bg-yellow-50 text-yellow-700 rounded text-sm">
                        <Loader2 className="h-3 w-3 inline animate-spin mr-1" />
                        Loading Google Maps API...
                      </div>
                    )}
                    {googleApiLoaded && (
                      <div className="mb-2 p-2 bg-green-50 text-green-700 rounded text-sm">
                        ✅ Google Maps API Loaded
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-2"
                          onClick={() => {
                            console.log('=== MANUAL TEST ===');
                            console.log('Testing search with "applebees"');
                            searchGooglePlaces('applebees');
                          }}
                        >
                          Test Search
                        </Button>
                      </div>
                    )}
                    
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="Start typing your business name..."
                        value={googleSearchQuery}
                        onChange={(e) => {
                          const value = e.target.value;
                          setGoogleSearchQuery(value);
                          
                          if (value.length > 2) {
                            searchGooglePlaces(value);
                          } else {
                            setShowGoogleSearch(false);
                            setGoogleSearchResults([]);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && googleSearchQuery.trim()) {
                            searchGooglePlaces(googleSearchQuery);
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (googleSearchQuery.trim()) {
                            searchGooglePlaces(googleSearchQuery);
                          }
                        }}
                        disabled={searching || !googleApiLoaded}
                      >
                        {searching ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    {showGoogleSearch && googleSearchResults.length > 0 && (
                      <div className="mt-2 border rounded-lg max-h-40 overflow-y-auto">
                        {googleSearchResults.map((prediction) => (
                          <div
                            key={prediction.place_id}
                            className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => selectGooglePlace(prediction.place_id, prediction.description)}
                          >
                            <div className="font-medium">{prediction.structured_formatting?.main_text}</div>
                            <div className="text-sm text-gray-500">{prediction.structured_formatting?.secondary_text}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {showGoogleSearch && googleSearchResults.length === 0 && searching && (
                      <div className="mt-2 p-2 text-sm text-muted-foreground">
                        <Loader2 className="h-3 w-3 inline animate-spin mr-1" />
                        Searching...
                      </div>
                    )}
                  </div>
                )}

                             {/* Public URL */}
               <div>
                 <Label htmlFor={`${platform}-public-url`}>
                   Public {getPlatformName(platform)} URL
                 </Label>
                 <p className="text-sm text-muted-foreground mb-2">
                   {platform === 'google' 
                     ? 'Your business Google Maps page URL (e.g., https://maps.google.com/...)'
                     : platform === 'facebook' 
                     ? 'Your Facebook business page URL (e.g., https://facebook.com/yourbusiness)'
                     : 'Your Yelp business page URL (e.g., https://yelp.com/biz/yourbusiness)'
                   }
                 </p>
                 <div className="flex gap-2 mt-1">
                   <Input
                     id={`${platform}-public-url`}
                     placeholder={`https://${platform === 'google' ? 'maps.google.com' : platform === 'facebook' ? 'facebook.com' : 'yelp.com'}/...`}
                     value={data.public_url || ''}
                     onChange={(e) => handleInputChange(platform, 'public_url', e.target.value)}
                   />
                   {platform === 'google' && (
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => resolveGooglePlaceId(data.public_url)}
                       disabled={!data.public_url}
                     >
                       Resolve ID
                     </Button>
                   )}
                   {platform === 'yelp' && (
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => resolveYelpBusinessId(data.public_url)}
                       disabled={!data.public_url}
                     >
                       Resolve ID
                     </Button>
                   )}
                 </div>
               </div>

                             {/* Connection Type */}
               <div>
                 <Label htmlFor={`${platform}-connection-type`}>Connection Type</Label>
                 <p className="text-sm text-muted-foreground mb-2">
                   {platform === 'google' 
                     ? 'Select "Google Places API" for basic review import (read-only)'
                     : platform === 'facebook' 
                     ? 'Select "Facebook Page OAuth" to connect your Facebook business page'
                     : 'Select "Yelp Fusion API" to connect with your Yelp business listing'
                   }
                 </p>
                                   <Select
                    value={data.connection_type || ''}
                    onValueChange={(value) => handleInputChange(platform, 'connection_type', value)}
                  >
                    <SelectTrigger className="text-left">
                      <SelectValue placeholder="Select connection type" />
                    </SelectTrigger>
                    <SelectContent>
                      {platform === 'google' && (
                        <SelectItem value="places" className="text-left">Google Places API (Read-only)</SelectItem>
                      )}
                      {platform === 'facebook' && (
                        <SelectItem value="page_oauth" className="text-left">Facebook Page OAuth</SelectItem>
                      )}
                      {platform === 'yelp' && (
                        <SelectItem value="api_key" className="text-left">Yelp Fusion API</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
               </div>

               {/* External ID */}
               <div>
                 <Label htmlFor={`${platform}-external-id`}>
                   {platform === 'google' ? 'Place ID' : platform === 'facebook' ? 'Page ID' : 'Business ID'}
                 </Label>
                 <p className="text-sm text-muted-foreground mb-2">
                   {platform === 'google' 
                     ? 'This will be auto-filled when you search above, or use "Resolve ID" button with your Google Maps URL'
                     : platform === 'facebook' 
                     ? 'This will be auto-filled when you connect your Facebook page'
                     : 'This will be auto-filled when you use "Resolve ID" button with your Yelp URL'
                   }
                 </p>
                 <Input
                   id={`${platform}-external-id`}
                   placeholder={platform === 'google' ? 'ChIJ...' : platform === 'facebook' ? '123456789' : 'business-name'}
                   value={data.external_id || ''}
                   onChange={(e) => handleInputChange(platform, 'external_id', e.target.value)}
                 />
               </div>

              {/* Facebook OAuth Connect Button */}
              {platform === 'facebook' && !isConnected && (
                <div>
                  <Button
                    onClick={connectFacebook}
                    variant="outline"
                    className="w-full"
                  >
                    <Facebook className="h-4 w-4 mr-2" />
                    Connect Facebook
                  </Button>
                </div>
              )}

              {/* Facebook Pages Selection */}
              {showFacebookPages && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Label className="text-sm font-medium mb-2 block">Select a Facebook Page:</Label>
                  <div className="space-y-2">
                    {facebookPages.map((page) => (
                      <div
                        key={page.id}
                        className="p-2 border rounded cursor-pointer hover:bg-blue-100"
                        onClick={() => selectFacebookPage(page)}
                      >
                        <div className="font-medium">{page.name}</div>
                        <div className="text-sm text-gray-500">{page.category}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status and Actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-4">
                  {lastSynced && (
                    <div className="text-sm text-muted-foreground">
                      Last synced: {new Date(lastSynced).toLocaleDateString()}
                    </div>
                  )}
                  {isConnected && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testConnection(platform)}
                        disabled={syncing[platform]}
                      >
                        {syncing[platform] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        Test Connection
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => syncNow(platform)}
                        disabled={syncing[`sync_${platform}`]}
                      >
                        {syncing[`sync_${platform}`] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        Sync Now
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {isConnected && (
                    <Button
                      variant="outline"
                      onClick={() => disconnectIntegration(platform)}
                    >
                      Disconnect
                    </Button>
                  )}
                  <Button
                    onClick={() => saveIntegration(platform)}
                    disabled={!data.public_url || !data.external_id}
                  >
                    {isConnected ? 'Update' : 'Connect'}
                  </Button>
                </div>
              </div>

              {/* Connection Info */}
              {isConnected && (
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  <div className="font-medium mb-1">Connection Details:</div>
                  <div>Type: {getConnectionTypeLabel(data.connection_type)}</div>
                  <div>Status: Connected</div>
                  {lastSynced && (
                    <div>Last sync: {new Date(lastSynced).toLocaleString()}</div>
                  )}
                  {platform === 'google' && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-blue-700">
                      <div className="font-medium">Note:</div>
                      <div>Google Places API is read-only. Replies will be "Copy & Open".</div>
                    </div>
                  )}
                  {platform === 'yelp' && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-blue-700">
                      <div className="font-medium">Note:</div>
                      <div>Yelp Fusion API returns max 3 reviews per sync.</div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Sync All Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Sync All Platforms</h3>
              <p className="text-sm text-muted-foreground">
                Manually sync all connected review platforms at once
              </p>
            </div>
            <Button
              onClick={async () => {
                try {
                  setSyncing(prev => ({ ...prev, all: true }));
                  
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('business_id')
                    .eq('id', user.id)
                    .single();

                  if (!profile?.business_id) {
                    toast.error('Business not found');
                    return;
                  }

                  const response = await fetch('/api/reviews/sync/all', {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json',
                      'x-internal-key': import.meta.env.VITE_INTERNAL_API_KEY || 'your-internal-key-here'
                    },
                    body: JSON.stringify({ business_id: profile.business_id })
                  });

                  const result = await response.json();
                  
                  if (response.ok) {
                    toast.success(`Sync completed! ${result.summary.total_inserted} new, ${result.summary.total_updated} updated`);
                    fetchReviewSources();
                  } else {
                    toast.error(`Sync failed: ${result.error}`);
                  }
                } catch (error) {
                  console.error('Error syncing all:', error);
                  toast.error('Sync failed');
                } finally {
                  setSyncing(prev => ({ ...prev, all: false }));
                }
              }}
              disabled={syncing.all}
            >
              {syncing.all ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync All Platforms
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntegrationsTab;
