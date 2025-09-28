import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Search, MapPin, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const ReviewPlatformConnector = ({ onConnectionSuccess }) => {
  const [activeTab, setActiveTab] = useState('google');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [connectedSources, setConnectedSources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    loadConnectedSources();
  }, []);

  const loadConnectedSources = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('review_sources')
        .select('*')
        .eq('created_by', user.email)
        .eq('is_active', true);

      if (error) throw error;
      setConnectedSources(data || []);
    } catch (error) {
      console.error('Error loading connected sources:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchGoogleBusiness = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch('/api/reviews/search-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: searchQuery,
          platform: 'google'
        })
      });

      const data = await response.json();
      if (data.success) {
        setSearchResults(data.results || []);
      } else {
        console.error('Search failed:', data.error);
      }
    } catch (error) {
      console.error('Error searching businesses:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const connectBusiness = async (business) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's business_id from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) {
        // If no business_id in profile, get it from businesses table
        const { data: businessData } = await supabase
          .from('businesses')
          .select('id')
          .eq('created_by', user.email)
          .limit(1)
          .single();

        if (!businessData?.id) {
          throw new Error('No business found for user');
        }

        // Update profile with business_id
        await supabase
          .from('profiles')
          .update({ business_id: businessData.id })
          .eq('id', user.id);

        profile.business_id = businessData.id;
      }

      const { error } = await supabase
        .from('review_sources')
        .upsert({
          business_id: profile.business_id,
          platform: 'google',
          public_url: business.url,
          business_name: business.name,
          external_id: business.place_id,
          is_active: true,
          created_by: user.email
        });

      if (error) throw error;

      // Reload connected sources
      await loadConnectedSources();
      
      // Trigger review sync
      await syncReviews(profile.business_id, business.place_id);
      
      if (onConnectionSuccess) {
        onConnectionSuccess();
      }
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
          platform: 'google'
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect Review Platforms</CardTitle>
        <CardDescription>
          Connect your business profiles to automatically import reviews
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="google">Google</TabsTrigger>
            <TabsTrigger value="facebook">Facebook</TabsTrigger>
            <TabsTrigger value="yelp">Yelp</TabsTrigger>
          </TabsList>

          <TabsContent value="google" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search for your business on Google..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchGoogleBusiness()}
              />
              <Button onClick={searchGoogleBusiness} disabled={isSearching}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {isSearching && (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            )}

            {searchResults && searchResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Search Results:</h4>
                {searchResults.map((business, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium">{business.name}</p>
                        <p className="text-sm text-gray-500">{business.address}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => connectBusiness(business)}
                      disabled={connectedSources.some(s => s.external_id === business.place_id)}
                    >
                      {connectedSources.some(s => s.external_id === business.place_id) ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Connected
                        </>
                      ) : (
                        'Connect'
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}

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

          <TabsContent value="facebook" className="space-y-4">
            <div className="text-center p-8">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="font-medium mb-2">Facebook Integration Coming Soon</h3>
              <p className="text-gray-500 text-sm">
                We're working on Facebook Business integration. Use Zapier for now.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="yelp" className="space-y-4">
            <div className="text-center p-8">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="font-medium mb-2">Yelp Integration Coming Soon</h3>
              <p className="text-gray-500 text-sm">
                We're working on Yelp Business integration. Use Zapier for now.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ReviewPlatformConnector;