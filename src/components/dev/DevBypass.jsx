import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Users, BarChart3, Settings } from 'lucide-react';

export default function DevBypass() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🚀 Dev Bypass - UI Testing
          </h1>
          <p className="text-gray-600">
            Skip auth/paywall to test UI changes in development
          </p>
          <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>DEV ONLY</strong> - These routes bypass all authentication and subscription checks
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-blue-600" />
                <span>Automations</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Test the automation creation flow and UI fixes
              </p>
              <Link to="/dev-automations">
                <Button className="w-full">
                  Test Automations UI
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-600" />
                <span>Customers</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Test customer management and manual triggers
              </p>
              <Link to="/dev-customers">
                <Button className="w-full">
                  Test Customers UI
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                <span>Dashboard</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Test the main dashboard interface
              </p>
              <Link to="/dev-dashboard">
                <Button className="w-full">
                  Test Dashboard UI
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">🧪 What to Test</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Automations:</strong> QBO selection, trigger dropdown, Next button positioning</li>
            <li>• <strong>Customers:</strong> Manual trigger functionality from customer actions menu</li>
            <li>• <strong>UI Flow:</strong> Navigation between pages, button interactions</li>
          </ul>
        </div>

        <div className="mt-6 text-center">
          <Link to="/">
            <Button variant="outline">
              ← Back to Landing Page
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
