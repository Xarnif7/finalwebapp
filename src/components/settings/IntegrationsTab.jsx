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
  XCircle, 
  AlertCircle,
  Loader2,
  Copy,
  Settings
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/AuthProvider';
import { toast } from 'react-hot-toast';

const IntegrationsTab = () => {
  const { user } = useAuth();
  const [reviewSources, setReviewSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState({});
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (user) {
      fetchReviewSources();
    }
  }, [user]);

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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
      case 'gbp_oauth': return 'Google Business Profile';
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
        <p className="text-sm text-muted-foreground">
          Connect your business to automatically import reviews from Google, Facebook, and Yelp.
        </p>
      </div>

      {['google', 'facebook', 'yelp'].map((platform) => {
        const data = formData[platform] || {};
        const source = reviewSources.find(s => s.platform === platform);
        const isConnected = source?.connected || false;
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
              {/* Public URL */}
              <div>
                <Label htmlFor={`${platform}-public-url`}>
                  Public {getPlatformName(platform)} URL
                </Label>
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
                <Select
                  value={data.connection_type || ''}
                  onValueChange={(value) => handleInputChange(platform, 'connection_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select connection type" />
                  </SelectTrigger>
                  <SelectContent>
                    {platform === 'google' && (
                      <>
                        <SelectItem value="places">Google Places API (Read-only)</SelectItem>
                        <SelectItem value="gbp_oauth">Google Business Profile (Full access)</SelectItem>
                      </>
                    )}
                    {platform === 'facebook' && (
                      <SelectItem value="page_oauth">Facebook Page OAuth</SelectItem>
                    )}
                    {platform === 'yelp' && (
                      <SelectItem value="api_key">Yelp Fusion API</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* External ID */}
              <div>
                <Label htmlFor={`${platform}-external-id`}>
                  {platform === 'google' ? 'Place ID' : platform === 'facebook' ? 'Page ID' : 'Business ID'}
                </Label>
                <Input
                  id={`${platform}-external-id`}
                  placeholder={platform === 'google' ? 'ChIJ...' : platform === 'facebook' ? '123456789' : 'business-name'}
                  value={data.external_id || ''}
                  onChange={(e) => handleInputChange(platform, 'external_id', e.target.value)}
                />
              </div>

              {/* Access Token (for OAuth connections) */}
              {(data.connection_type === 'page_oauth' || data.connection_type === 'gbp_oauth') && (
                <div>
                  <Label htmlFor={`${platform}-access-token`}>Access Token</Label>
                  <Input
                    id={`${platform}-access-token`}
                    type="password"
                    placeholder="OAuth access token"
                    value={data.access_token || ''}
                    onChange={(e) => handleInputChange(platform, 'access_token', e.target.value)}
                  />
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
                
                <Button
                  onClick={() => saveIntegration(platform)}
                  disabled={!data.public_url || !data.external_id}
                >
                  {isConnected ? 'Update' : 'Connect'}
                </Button>
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

                  const response = await fetch('/api/reviews/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ business_id: profile.business_id, platform: 'all' })
                  });

                  const result = await response.json();
                  
                  if (response.ok) {
                    toast.success(`Sync completed! ${result.summary.total_inserted} new, ${result.summary.total_updated} updated`);
                    fetchReviewSources();
                  } else {
                    toast.error(`Sync failed: ${result.error}`);
                  }
                } catch (error) {
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
