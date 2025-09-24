import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Search,
  Link,
  Plus
} from 'lucide-react';
import { supabase } from '@/lib/supabase/browser';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'react-hot-toast';

const platformConfig = {
  google: { 
    name: 'Google', 
    icon: '🔍', 
    color: 'bg-blue-100 text-blue-800',
    searchPlaceholder: 'Start typing your business name...',
    urlPlaceholder: 'https://maps.google.com/...'
  },
  facebook: { 
    name: 'Facebook', 
    icon: '📘', 
    color: 'bg-blue-100 text-blue-600',
    searchPlaceholder: 'Start typing your business name...',
    urlPlaceholder: 'https://facebook.com/yourbusiness'
  },
  yelp: { 
    name: 'Yelp', 
    icon: '🔴', 
    color: 'bg-red-100 text-red-800',
    searchPlaceholder: 'Start typing your business name...',
    urlPlaceholder: 'https://yelp.com/biz/yourbusiness'
  }
};

export default function ReviewPlatformConnector({ onPlatformsConnected }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('google');
  const [connectedPlatforms, setConnectedPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState({});
  
  // Google-specific state
  const [googleSearchQuery, setGoogleSearchQuery] = useState('');
  const [googleSearchResults, setGoogleSearchResults] = useState([]);
  const [showGoogleSearch, setShowGoogleSearch] = useState(false);
  const [googleApiLoaded, setGoogleApiLoaded] = useState(false);
  const [searching, setSearching] = useState(false);
  
  // Form data for each platform
  const [formData, setFormData] = useState({
    google: { public_url: '', business_name: '', place_id: '' },
    facebook: { public_url: '', business_name: '' },
    yelp: { public_url: '', business_name: '', business_id: '' }
  });

  useEffect(() => {
    if (user) {
      fetchConnectedPlatforms();
      loadGoogleMapsAPI();
    }
  }, [user]);

  // Load Google Maps API dynamically
  const loadGoogleMapsAPI = () => {
    if (window.google && window.google.maps && window.google.maps.places) {
      setGoogleApiLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_PLACES_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setGoogleApiLoaded(true);
      console.log('Google Maps API loaded for reviews');
    };
    script.onerror = () => {
      console.error('Failed to load Google Maps API');
      toast.error('Failed to load Google Maps API');
    };
    document.head.appendChild(script);
  };

  const fetchConnectedPlatforms = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) return;

      const { data: platforms, error } = await supabase
        .from('review_sources')
        .select('*')
        .eq('business_id', profile.business_id);

      if (error) {
        console.error('Error fetching platforms:', error);
        return;
      }

      setConnectedPlatforms(platforms || []);
    } catch (error) {
      console.error('Error fetching platforms:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchGooglePlaces = async (query) => {
    if (!query.trim()) return;
    
    if (!googleApiLoaded) {
      toast.error('Google Maps API is still loading. Please wait a moment and try again.');
      return;
    }
    
    try {
      setSearching(true);
      setShowGoogleSearch(true);
      
      const service = new window.google.maps.places.AutocompleteService();
      const request = {
        input: query,
        types: ['establishment'],
        componentRestrictions: { country: 'us' }
      };
      
      service.getPlacePredictions(request, (predictions, status) => {
        setSearching(false);
        
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
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
      console.error('Error searching Google Places:', error);
      setSearching(false);
      toast.error('Search failed. Please try again.');
    }
  };

  const selectGooglePlace = async (placeId, description) => {
    try {
      // Get place details
      const service = new window.google.maps.places.PlacesService(document.createElement('div'));
      service.getDetails({
        placeId: placeId,
        fields: ['name', 'url', 'place_id', 'formatted_address']
      }, (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          setFormData(prev => ({
            ...prev,
            google: {
              ...prev.google,
              business_name: place.name,
              public_url: place.url,
              place_id: place.place_id
            }
          }));
          
          setGoogleSearchQuery(place.name);
          setShowGoogleSearch(false);
          setGoogleSearchResults([]);
          
          toast.success(`Selected: ${place.name}`);
        }
      });
    } catch (error) {
      console.error('Error getting place details:', error);
      toast.error('Failed to get business details');
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

  const connectPlatform = async (platform) => {
    if (connecting[platform]) return;

    const data = formData[platform];
    if (!data.public_url) {
      toast.error('Please enter a valid URL');
      return;
    }

    try {
      setConnecting(prev => ({ ...prev, [platform]: true }));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) return;

      const platformData = {
        business_id: profile.business_id,
        platform: platform,
        public_url: data.public_url,
        business_name: data.business_name,
        connection_type: platform === 'google' ? 'places' : platform === 'facebook' ? 'page_oauth' : 'api_key',
        external_id: platform === 'google' ? data.place_id : platform === 'yelp' ? data.business_id : null,
        is_active: true
      };

      const { error } = await supabase
        .from('review_sources')
        .upsert(platformData, { 
          onConflict: 'business_id,platform',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Error connecting platform:', error);
        toast.error('Failed to connect platform');
        return;
      }

      toast.success(`${platformConfig[platform].name} connected successfully!`);
      
      // Clear form
      setFormData(prev => ({
        ...prev,
        [platform]: { public_url: '', business_name: '', place_id: '', business_id: '' }
      }));

      // Refresh connected platforms
      await fetchConnectedPlatforms();
      
      // Notify parent component
      if (onPlatformsConnected) {
        onPlatformsConnected();
      }

    } catch (error) {
      console.error('Error connecting platform:', error);
      toast.error('Failed to connect platform');
    } finally {
      setConnecting(prev => ({ ...prev, [platform]: false }));
    }
  };

  const disconnectPlatform = async (platform) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) return;

      const { error } = await supabase
        .from('review_sources')
        .delete()
        .eq('business_id', profile.business_id)
        .eq('platform', platform);

      if (error) {
        console.error('Error disconnecting platform:', error);
        toast.error('Failed to disconnect platform');
        return;
      }

      toast.success(`${platformConfig[platform].name} disconnected`);
      await fetchConnectedPlatforms();

    } catch (error) {
      console.error('Error disconnecting platform:', error);
      toast.error('Failed to disconnect platform');
    }
  };

  const isConnected = (platform) => {
    return connectedPlatforms.some(p => p.platform === platform && p.is_active);
  };

  const getConnectedPlatform = (platform) => {
    return connectedPlatforms.find(p => p.platform === platform && p.is_active);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connected Platforms Overview */}
      {connectedPlatforms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="w-5 h-5" />
              Connected Review Platforms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.keys(platformConfig).map(platform => {
                const connected = isConnected(platform);
                const platformData = getConnectedPlatform(platform);
                const config = platformConfig[platform];
                
                return (
                  <div key={platform} className={`p-4 rounded-lg border ${connected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{config.icon}</span>
                        <span className="font-medium">{config.name}</span>
                      </div>
                      {connected ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not Connected</Badge>
                      )}
                    </div>
                    
                    {connected && platformData && (
                      <div className="text-sm text-gray-600">
                        <div className="font-medium">{platformData.business_name}</div>
                        <div className="truncate">{platformData.public_url}</div>
                      </div>
                    )}
                    
                    {connected && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => disconnectPlatform(platform)}
                      >
                        Disconnect
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Platform Connection Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Connect Review Platforms
          </CardTitle>
          <p className="text-sm text-gray-600">
            Connect your business profiles to automatically import reviews into your inbox
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="google" className="flex items-center gap-2">
                {platformConfig.google.icon} Google
              </TabsTrigger>
              <TabsTrigger value="facebook" className="flex items-center gap-2">
                {platformConfig.facebook.icon} Facebook
              </TabsTrigger>
              <TabsTrigger value="yelp" className="flex items-center gap-2">
                {platformConfig.yelp.icon} Yelp
              </TabsTrigger>
            </TabsList>

            {Object.keys(platformConfig).map(platform => {
              const config = platformConfig[platform];
              const data = formData[platform];
              const connected = isConnected(platform);

              return (
                <TabsContent key={platform} value={platform} className="space-y-4">
                  <div className={`p-4 rounded-lg ${config.color} bg-opacity-10`}>
                    <h3 className="font-semibold mb-2">{config.name} Review Integration</h3>
                    <p className="text-sm text-gray-600">
                      Connect your {config.name} business profile to automatically import reviews
                    </p>
                  </div>

                  {connected ? (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-800">{config.name} is connected!</span>
                      </div>
                      <p className="text-sm text-green-700">
                        Reviews from {config.name} will be automatically imported into your inbox.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Google Places Search (only for Google) */}
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
                          
                          <div className="flex gap-2">
                            <Input
                              placeholder={config.searchPlaceholder}
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
                        </div>
                      )}

                      {/* Business Name */}
                      <div>
                        <Label>Business Name</Label>
                        <Input
                          placeholder={`Your business name on ${config.name}`}
                          value={data.business_name}
                          onChange={(e) => handleInputChange(platform, 'business_name', e.target.value)}
                        />
                      </div>

                      {/* Public URL */}
                      <div>
                        <Label>Business URL</Label>
                        <p className="text-sm text-muted-foreground mb-2">
                          Your business {config.name} page URL
                        </p>
                        <Input
                          placeholder={config.urlPlaceholder}
                          value={data.public_url}
                          onChange={(e) => handleInputChange(platform, 'public_url', e.target.value)}
                        />
                      </div>

                      {/* Connect Button */}
                      <Button
                        onClick={() => connectPlatform(platform)}
                        disabled={connecting[platform] || !data.public_url}
                        className="w-full"
                      >
                        {connecting[platform] ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Link className="w-4 h-4 mr-2" />
                            Connect {config.name}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
