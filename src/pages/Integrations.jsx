import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Calendar, Users, ShoppingCart, MessageSquare, CheckCircle, Clock, Zap } from 'lucide-react';
import ZapierCrmCard from '../components/zapier/ZapierCrmCard';
import { useAuth } from '../components/auth/AuthProvider';
import { motion } from 'framer-motion';

// FIX: Restyled Integrations page with clean cards, proper alignment, and category headers.

const integrationCategories = [
    {
        name: 'Booking',
        icon: Calendar,
        integrations: [
            { name: 'Calendly', logo: 'https://images.ctfassets.net/k0lk9ki7ckib/2V5Xg4mI0T42a4im2AS22g/30e3f436d45f4702a6334a179a32c254/calendly-logo.png', connected: true, description: 'Send review requests after appointments.' },
            { name: 'Square Appointments', logo: 'https://images.ctfassets.net/2d5q1td6cyxq/5mRj2g5p40NnBflTFEQe13/b585d590150337c1d7634674997858f7/Square_Appointments_logomark.png', connected: false, description: 'Sync your customer list and trigger requests.' },
            { name: 'Acuity Scheduling', logo: 'https://d2jxbw4p40ef2x.cloudfront.net/features/logo-acuity-scheduling.png', connected: false, description: 'Connect your scheduling to automate reputation.' },
        ],
    },
    {
        name: 'CRM',
        icon: Users,
        integrations: [
            { name: 'Zapier', logo: 'https://cdn.zapier.com/storage/photos/9a0c4b8b8b8b8b8b8b8b8b8b8b8b8b8b.png', connected: false, description: 'Connect any CRM via Zapier automation.' },
            { name: 'HubSpot', logo: 'https://cdn.icon-icons.com/icons2/2699/PNG/512/hubspot_logo_icon_169922.png', connected: false, description: 'Sync contacts and company data.' },
            { name: 'Salesforce', logo: 'https://cdn.iconscout.com/icon/free/png-256/free-salesforce-282591.png', connected: false, description: 'Trigger requests based on opportunity stages.' },
        ],
    },
    {
        name: 'Review Platforms',
        icon: MessageSquare,
        integrations: [
            { name: 'Google Business Profile', logo: 'https://cdn.iconscout.com/icon/free/png-256/free-google-business-3628795-3030007.png', connected: true, description: 'Manage and reply to Google reviews.' },
            { name: 'Facebook', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/1200px-Facebook_Logo_%282019%29.png', connected: false, description: 'Track and respond to recommendations.' },
            { name: 'Yelp', logo: 'https://cdn.icon-icons.com/icons2/2428/PNG/512/yelp_logo_icon_147271.png', connected: false, description: 'Monitor your Yelp presence and reviews.' },
        ],
    },
];

const IntegrationCard = ({ integration }) => {
    const [isConnected, setIsConnected] = useState(integration.connected);

    return (
        <Card className="flex flex-col">
            <CardContent className="p-6 flex-1">
                <div className="flex items-center gap-4 mb-4">
                    <img src={integration.logo} alt={`${integration.name} logo`} className="h-12 w-12 object-contain" />
                    <div>
                        <p className="font-semibold text-lg text-gray-900">{integration.name}</p>
                        <p className="text-sm text-gray-500">{integration.description}</p>
                    </div>
                </div>
            </CardContent>
            <div className="p-6 pt-0 mt-auto bg-slate-50 rounded-b-2xl border-t border-slate-200 flex items-center justify-between">
                {isConnected ? (
                     <Badge variant="success" className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Connected
                    </Badge>
                ) : (
                    <span className="text-sm text-gray-500">Not connected</span>
                )}
                <Button variant={isConnected ? 'destructive' : 'default'} size="sm" onClick={() => setIsConnected(!isConnected)}>
                    {isConnected ? 'Disconnect' : 'Connect'}
                </Button>
            </div>
        </Card>
    );
};

export default function IntegrationsPage() {
    const { user } = useAuth();
    
    return (
        <div className="space-y-8">
            <div className="page-header">
                <h1 className="page-title">Integrations Hub</h1>
                <p className="page-subtitle">Connect your tools to automate your workflow and streamline data.</p>
            </div>

            {/* Zapier CRM Connection Card */}
            <ZapierCrmCard userId={user?.id} />

            <div className="space-y-12">
                {integrationCategories.map((category, catIndex) => (
                    <motion.div 
                        key={category.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: catIndex * 0.1 }}
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <category.icon className="w-6 h-6 text-blue-600" />
                            <h2 className="text-2xl font-semibold">{category.name}</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {category.integrations.map((integration) => (
                                <IntegrationCard key={integration.name} integration={integration} />
                            ))}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}


