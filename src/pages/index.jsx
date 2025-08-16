import Layout from "./Layout.jsx";

import Landing from "./Landing";

import Onboarding from "./Onboarding";

import Dashboard from "./Dashboard";

import Clients from "./Clients";

import Settings from "./Settings";

import Reviews from "./Reviews";

import ReviewTracking from "./ReviewTracking";

import ReviewLanding from "./ReviewLanding";

import AutomatedRequests from "./AutomatedRequests";

import ReviewInbox from "./ReviewInbox";

import SocialPosts from "./SocialPosts";

import Sequences from "./Sequences";

import Competitors from "./Competitors";

import TeamRoles from "./TeamRoles";

import AuditLog from "./AuditLog";

import CsvImport from "./CsvImport";

import Notifications from "./Notifications";

import Integrations from "./Integrations";

import RevenueImpact from "./RevenueImpact";

import Conversations from "./Conversations";

import ReviewPerformance from "./ReviewPerformance";

import Features from "./Features";

import HowItWorks from "./HowItWorks";

import SimpleSetup from "./SimpleSetup";

import Testimonials from "./Testimonials";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Landing: Landing,
    
    Onboarding: Onboarding,
    
    Dashboard: Dashboard,
    
    Clients: Clients,
    
    Settings: Settings,
    
    Reviews: Reviews,
    
    ReviewTracking: ReviewTracking,
    
    ReviewLanding: ReviewLanding,
    
    AutomatedRequests: AutomatedRequests,
    
    ReviewInbox: ReviewInbox,
    
    SocialPosts: SocialPosts,
    
    Sequences: Sequences,
    
    Competitors: Competitors,
    
    TeamRoles: TeamRoles,
    
    AuditLog: AuditLog,
    
    CsvImport: CsvImport,
    
    Notifications: Notifications,
    
    Integrations: Integrations,
    
    RevenueImpact: RevenueImpact,
    
    Conversations: Conversations,
    
    ReviewPerformance: ReviewPerformance,
    
    Features: Features,
    
    HowItWorks: HowItWorks,
    
    SimpleSetup: SimpleSetup,
    
    Testimonials: Testimonials,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Landing />} />
                
                
                <Route path="/Landing" element={<Landing />} />
                
                <Route path="/Onboarding" element={<Onboarding />} />
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Clients" element={<Clients />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/Reviews" element={<Reviews />} />
                
                <Route path="/ReviewTracking" element={<ReviewTracking />} />
                
                <Route path="/ReviewLanding" element={<ReviewLanding />} />
                
                <Route path="/AutomatedRequests" element={<AutomatedRequests />} />
                
                <Route path="/ReviewInbox" element={<ReviewInbox />} />
                
                <Route path="/SocialPosts" element={<SocialPosts />} />
                
                <Route path="/Sequences" element={<Sequences />} />
                
                <Route path="/Competitors" element={<Competitors />} />
                
                <Route path="/TeamRoles" element={<TeamRoles />} />
                
                <Route path="/AuditLog" element={<AuditLog />} />
                
                <Route path="/CsvImport" element={<CsvImport />} />
                
                <Route path="/Notifications" element={<Notifications />} />
                
                <Route path="/Integrations" element={<Integrations />} />
                
                <Route path="/RevenueImpact" element={<RevenueImpact />} />
                
                <Route path="/Conversations" element={<Conversations />} />
                
                <Route path="/ReviewPerformance" element={<ReviewPerformance />} />
                
                <Route path="/Features" element={<Features />} />
                
                <Route path="/HowItWorks" element={<HowItWorks />} />
                
                <Route path="/SimpleSetup" element={<SimpleSetup />} />
                
                <Route path="/Testimonials" element={<Testimonials />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}