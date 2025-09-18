import React from 'react';

export default function EnvTest() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Environment Variables Test</h1>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Available Environment Variables:</h2>
          <div className="space-y-2">
            <div>
              <strong>VITE_SUPABASE_URL:</strong> 
              <span className="ml-2 text-gray-600">
                {import.meta.env.VITE_SUPABASE_URL || 'NOT SET'}
              </span>
            </div>
            <div>
              <strong>VITE_SUPABASE_ANON_KEY:</strong> 
              <span className="ml-2 text-gray-600">
                {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'}
              </span>
            </div>
            <div>
              <strong>VITE_SITE_URL:</strong> 
              <span className="ml-2 text-gray-600">
                {import.meta.env.VITE_SITE_URL || 'NOT SET'}
              </span>
            </div>
          </div>
          
          <h2 className="text-lg font-semibold mb-4 mt-6">All VITE_ Variables:</h2>
          <div className="bg-gray-100 p-4 rounded">
            <pre className="text-sm">
              {JSON.stringify(import.meta.env, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
