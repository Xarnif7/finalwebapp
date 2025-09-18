import React, { useEffect, useState } from 'react';
import { oauthSmokeTest } from '../lib/auth-utils';

export default function DevOAuthTest() {
  const [testUrl, setTestUrl] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setTestUrl(oauthSmokeTest());
    }
  }, []);

  const runSmokeTest = async () => {
    if (!testUrl) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      // Use a different approach to avoid CORS issues
      const response = await fetch(testUrl, { 
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        redirect: 'manual'
      });
      
      const body = await response.text();
      
      setResult({
        status: response.status,
        statusText: response.statusText,
        body: body.substring(0, 500) // Limit body length
      });
      
      console.log('[OAUTH SMOKE TEST]', {
        url: testUrl,
        status: response.status,
        statusText: response.statusText,
        body: body.substring(0, 200)
      });
      
    } catch (error) {
      setResult({
        error: error.message,
        status: 0,
        statusText: 'Network Error'
      });
      console.error('[OAUTH SMOKE TEST ERROR]', error);
    } finally {
      setLoading(false);
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return <div>This page is only available in development mode.</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">OAuth Smoke Test</h1>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Test URL:</h2>
        <code className="bg-gray-100 p-2 block break-all">{testUrl}</code>
      </div>
      
      <button 
        onClick={runSmokeTest}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Run Smoke Test'}
      </button>
      
      {result && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Result:</h2>
          <div className="bg-gray-100 p-4 rounded">
            <div className="mb-2">
              <strong>Status:</strong> {result.status} {result.statusText}
            </div>
            {result.body && (
              <div className="mb-2">
                <strong>Body:</strong>
                <pre className="mt-1 text-sm overflow-auto max-h-40">{result.body}</pre>
              </div>
            )}
            {result.error && (
              <div className="text-red-600">
                <strong>Error:</strong> {result.error}
              </div>
            )}
          </div>
          
          <div className="mt-4 text-sm">
            <p><strong>Expected:</strong> 302 redirect to Google</p>
            <p><strong>If 400:</strong> Provider not enabled in Supabase</p>
            <p><strong>If 200:</strong> Check redirect configuration</p>
          </div>
        </div>
      )}
    </div>
  );
}
