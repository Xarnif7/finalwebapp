import React, { useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { motion, useInView } from "framer-motion";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSubscriptionStatus } from "../hooks/useSubscriptionStatus";
import {
  Settings, Zap, BarChart3, ArrowRight, CheckCircle, MessageSquare,
  Users, Clock, Shield, Star
} from "lucide-react";

const AnimatedSection = ({ children, className = "", id }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <motion.section
      id={id}
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 12 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.section>
  );
};

export default function HowItWorks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const subscriptionStatus = useSubscriptionStatus();
  const { active: hasSubscription } = subscriptionStatus;
  
  console.log('[HOWITWORKS] Component rendering with props:', { 
    user: !!user, 
    hasSubscription,
    pathname: window.location.pathname 
  });
  
  const handleGetStarted = async () => {
    if (user) {
      if (hasSubscription) {
        navigate(createPageUrl("Dashboard"));
      } else {
        navigate("/paywall"); // Redirect to paywall if no subscription
      }
    } else {
      // Import supabase for OAuth
      const { signInWithGoogle } = await import('../lib/auth-utils');
      
      try {
        // Store the current path as redirect destination
        localStorage.setItem('postLoginRedirect', window.location.pathname);
        
        // Initiate Google OAuth
        await signInWithGoogle();
      } catch (error) {
        console.error('Sign in error:', error);
      }
    }
  };

  const steps = [
    {
      number: 1,
      title: "Connect Your Business",
      description: "Link your Google, Yelp, and Facebook business profiles to start collecting reviews automatically.",
      image: "/images/howitworks-connect.svg",
      features: ["Google My Business integration", "Yelp business connection", "Facebook page linking", "One-time setup process"]
    },
    {
      number: 2,
      title: "Set Up Automation",
      description: "Configure review requests, customer follow-ups, and response templates with our intelligent automation system.",
      image: "/images/howitworks-automate.svg",
      features: ["Smart timing algorithms", "Customizable templates", "Multi-channel campaigns", "A/B testing built-in"]
    },
    {
      number: 3,
      title: "Watch Your Business Grow",
      description: "Monitor performance, engage with customers, and watch your online reputation transform into revenue growth.",
      image: "/images/howitworks-analyze.svg",
      features: ["Real-time analytics", "Revenue tracking", "Competitor benchmarking", "ROI measurement"]
    }
  ];

  return (
    <div className="bg-white text-gray-900 font-sans">
      <main className="pt-24">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h1
              className="text-4xl md:text-6xl font-display font-bold text-gray-900 mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
            >
              How It <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Works</span>
            </motion.h1>
            <motion.p
              className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto font-sans"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              Transform your customer relationships into powerful reputation growth with our simple 3-step process.
            </motion.p>
          </div>
        </section>

        {/* Steps Section */}
        <AnimatedSection className="py-24 lg:py-28 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="space-y-24">
              {steps.map((step, index) => (
                <div key={step.number} className="relative">
                  {/* Connection Line - positioned lower to avoid text overlap */}
                  {index < steps.length - 1 && (
                    <div className="absolute left-1/2 transform -translate-x-1/2 top-40 w-px h-32 bg-gradient-to-b from-blue-600 to-purple-600 z-10" />
                  )}
                  
                  <div className={`grid lg:grid-cols-2 gap-12 items-start ${index % 2 === 1 ? 'lg:grid-flow-dense' : ''}`}>
                    <div className={`${index % 2 === 1 ? 'lg:col-start-2' : ''}`}>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                          {step.number}
                        </div>
                        <div>
                          <h3 className="text-3xl font-display font-bold text-gray-900">{step.title}</h3>
                        </div>
                      </div>
                      <p className="text-lg text-gray-600 mb-8 font-sans">{step.description}</p>
                      <div className="space-y-3">
                        {step.features.map((feature, i) => (
                          <motion.div
                            key={i}
                            className="flex items-center gap-3"
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            viewport={{ once: true }}
                          >
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="font-sans">{feature}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                    
                    <div className={`${index % 2 === 1 ? 'lg:col-start-1 lg:row-start-1' : ''}`}>
                      <motion.div
                        className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 flex items-center justify-center h-80 transform-gpu will-change-[transform,opacity]"
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                        whileHover={{ 
                          scale: 1.02,
                          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                        }}
                      >
                        <img 
                          src={step.image} 
                          alt={`${step.title} illustration`}
                          className="w-full h-full object-contain"
                          loading="lazy"
                          decoding="async"
                        />
                      </motion.div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* Benefits Section */}
        <AnimatedSection className="py-24 lg:py-28 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Why Businesses Choose Blipp</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">Our proven process delivers consistent results across industries</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {[
                { icon: Clock, title: "Save Time", description: "Automate 90% of your reputation management tasks" },
                { icon: Star, title: "More Reviews", description: "Average 247% increase in review volume" },
                { icon: Shield, title: "Brand Protection", description: "Proactive monitoring and instant alerts" },
                { icon: BarChart3, title: "Measurable ROI", description: "Track revenue impact from improved ratings" }
              ].map((benefit, i) => (
                <motion.div
                  key={i}
                  className="bg-white rounded-xl p-6 shadow-lg text-center transform-gpu will-change-[transform,opacity] hover:translate-y-[-2px] hover:shadow-xl transition-all duration-300 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut", delay: i * 0.1 }}
                  viewport={{ once: true, amount: 0.2 }}
                >
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* CTA Section */}
        <AnimatedSection className="py-24 lg:py-28 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Ready to Get Started?</h2>
            <p className="text-xl text-gray-600 mb-8">Join thousands of businesses already growing with Blipp</p>
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xl px-12 py-6 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
            >
              Start Your Free Trial
              <ArrowRight className="w-6 h-6 ml-3" />
            </Button>
          </div>
        </AnimatedSection>
      </main>
    </div>
  );
}


