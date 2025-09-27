


import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform, MotionConfig, useInView } from "framer-motion";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useRevealOnce } from "../hooks/useRevealOnce";
// import { PrimaryCTA } from "../components/marketing/ctas"; // Removed - component doesn't exist
import {
  Star, MessageSquare, TrendingUp, Clock, Shield, Zap, Target, Rocket, Heart, CheckCircle,
  BarChart3, Repeat, Compass, Brain, MessageCircle as ConversationsIcon, ArrowRight,
  Users, Settings, PlayCircle, Award, Instagram, Mail
} from "lucide-react";

const FloatingCard = ({ children, className = "", delay = 0 }) => {
  return (
    <motion.div
      className={`bg-white rounded-2xl shadow-xl border border-gray-100 transform-gpu will-change-[transform,opacity] ${className}`}
      initial={{ opacity: 1, y: 0 }} // Start visible to prevent flash
      animate={{ opacity: 1, y: 0 }} // Always visible
      transition={{ duration: 0.3, ease: "easeOut", delay }}
      whileHover={{ 
        y: -2, 
        scale: 1.02, 
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        transition: { duration: 0.2 } 
      }}
    >
      {children}
    </motion.div>
  );
};

const AnimatedSection = ({ children, className = "", id }) => {
  const [ref, isRevealed] = useRevealOnce({ threshold: 0.2 });

  return (
    <motion.section
      id={id}
      ref={ref}
      initial={{ opacity: 1, y: 0 }} // Start visible to prevent flash
      animate={{ opacity: 1, y: 0 }} // Always visible
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`transform-gpu will-change-[transform,opacity] ${className}`}
    >
      {children}
    </motion.section>
  );
};

// Subcomponents to respect Rules of Hooks (no hooks inside array.map inline)
const HowItWorksStep = ({ Icon, title, description, delay = 0 }) => {
  const [ref, isRevealed] = useRevealOnce({ threshold: 0.2 });
  return (
    <motion.div
      ref={ref}
      className="text-center transform-gpu will-change-[transform,opacity] hover:translate-y-[-2px] transition-all duration-300"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: isRevealed ? 1 : 0, y: isRevealed ? 0 : 12 }}
      transition={{ duration: 0.45, ease: "easeOut", delay }}
    >
      <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-xl font-sans font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 font-sans">{description}</p>
    </motion.div>
  );
};

const SetupListItem = ({ text, delay = 0 }) => {
  const [ref, isRevealed] = useRevealOnce({ threshold: 0.2 });
  return (
    <motion.div
      ref={ref}
      className="flex items-center gap-3 transform-gpu will-change-[transform,opacity]"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: isRevealed ? 1 : 0, x: isRevealed ? 0 : -20 }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
    >
      <CheckCircle className="w-5 h-5 text-green-500" />
      <span className="font-sans">{text}</span>
    </motion.div>
  );
};

const TestimonialCard = ({ testimonial, delay = 0 }) => {
  const [ref, isRevealed] = useRevealOnce({ threshold: 0.2 });
  return (
    <motion.div
      ref={ref}
      className="bg-white rounded-2xl p-6 shadow-lg transform-gpu will-change-[transform,opacity]"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: isRevealed ? 1 : 0, y: isRevealed ? 0 : 30 }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
    >
      <div className="flex items-center mb-4">
        {[...Array(testimonial.rating)].map((_, j) => (
          <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
        ))}
      </div>
      <p className="text-gray-700 mb-4 font-sans">"{testimonial.quote}"</p>
      <div>
        <div className="font-sans font-semibold">{testimonial.name}</div>
        <div className="text-sm text-gray-500 font-sans">{testimonial.role}</div>
      </div>
    </motion.div>
  );
};

const CountUpNumber = ({ end, duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      let startTime;
      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        setCount(Math.floor(progress * end));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }
  }, [isInView, end, duration]);

  return <span ref={ref}>{count}</span>;
};

export default function Landing() {
  const navigate = useNavigate();
  const { user, status: authStatus } = useAuth();
  const { hasActive: hasSubscription, loading: subLoading } = useSubscriptionStatus();
  
  console.log('[LANDING] User:', user);
  console.log('[LANDING] Subscription status:', { hasActive: hasSubscription, loading: subLoading });
  console.log('[LANDING] Has subscription:', hasSubscription, 'Loading:', subLoading);

  // Auto-redirect signed-in users with active subscription (only if they're on the landing page)
  useEffect(() => {
    if (authStatus === 'signedIn' && !subLoading && hasSubscription && window.location.pathname === '/') {
      console.log('[LANDING] User has subscription, redirecting to dashboard');
      navigate('/reporting', { replace: true });
    }
  }, [authStatus, subLoading, hasSubscription, navigate]);

  const { scrollYProgress } = useScroll();
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  return (
    <MotionConfig
      transition={{
        duration: 0.45,
        ease: "easeOut"
      }}
    >
      <div className="bg-white text-gray-900 font-sans overflow-hidden">
      <motion.div
        className="fixed inset-0 z-0"
        style={{ y: backgroundY }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-32 left-1/2 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse" style={{ animationDelay: '4s' }} />
      </motion.div>

      <main className="relative z-10">
        {/* Hero Section */}
        <section id="home" className="min-h-screen flex items-center justify-center px-6 py-24">
          <div className="max-w-4xl mx-auto w-full">
            <div className="text-center">
              <motion.h1
                className="mb-16 font-display font-extrabold"
                style={{
                  textShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  wordSpacing: '0.1em',
                  fontSize: 'clamp(3rem, 7vw, 5rem)',
                  lineHeight: '0.95',
                  letterSpacing: '-0.05em',
                  maxWidth: '900px',
                  margin: '0 auto'
                }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: [0.6, 0.01, 0.05, 0.95] }}
              >
                <span>More Reviews. Less Work.</span> <span style={{
                  background: 'linear-gradient(to right, #2563eb, #7c3aed)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: '0 8px 32px rgba(102, 126, 234, 0.4)'
                }}>Real Results.</span>
              </motion.h1>

              <motion.p
                className="text-xl md:text-2xl text-[#475569] mb-16 max-w-[680px] mx-auto font-sans leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.2, ease: [0.6, 0.01, 0.05, 0.95] }}
              >
                Effortless review generation that saves you time and drives steady growth by turning every customer into a loyal advocate.
              </motion.p>

            </div>

            <motion.div
              className="relative"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.6, ease: [0.6, 0.01, 0.05, 0.95] }}
            >
              <div className="relative max-w-5xl mx-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-3xl rounded-3xl" />
                <div className="bg-white rounded-2xl shadow-xl ring-1 ring-black/5 p-8 relative">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Star className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="text-3xl font-display font-extrabold text-gray-900 mb-2">
                        <CountUpNumber end={247} />%
                      </h3>
                      <p className="text-[#64748B] font-sans">Average Review Increase</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-amber-100 to-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <TrendingUp className="w-8 h-8 text-amber-600" />
                      </div>
                      <h3 className="text-3xl font-display font-extrabold text-gray-900 mb-2">
                        <CountUpNumber end={89} />%
                      </h3>
                      <p className="text-[#64748B] font-sans">Customer Response Rate</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-purple-600" />
                      </div>
                      <h3 className="text-3xl font-display font-extrabold text-gray-900 mb-2">
                        <CountUpNumber end={24} />/7
                      </h3>
                      <p className="text-[#64748B] font-sans">Automated Operation</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Main CTA Section - Original Logic */}
            <motion.div
              className="text-center mt-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.8, ease: [0.6, 0.01, 0.05, 0.95] }}
            >
              {user ? (
                subLoading ? (
                  <Button 
                    size="lg" 
                    disabled
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 text-lg font-semibold shadow-xl transition-all duration-300"
                  >
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Loading...
                  </Button>
                ) : hasSubscription ? (
                  <Link to="/reporting">
                    <Button 
                      size="lg" 
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                    >
                      View Dashboard <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                ) : (
                  <Link to="/pricing">
                    <Button 
                      size="lg" 
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                    >
                      Get Started <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                )
              ) : (
                <Button 
                  size="lg" 
                  onClick={async () => {
                    try {
                      const { signInWithGoogle } = await import('../lib/auth-utils');
                      await signInWithGoogle();
                    } catch (error) {
                      console.error('Sign in error:', error);
                    }
                  }}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                >
                  Sign In <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              )}
            </motion.div>

          </div>
        </section>

        {/* Features Section for Main Landing Page */}
        <AnimatedSection id="features" className="py-24 lg:py-28 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-display font-bold text-gray-900 mb-6">Powerful Features That Drive Results</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto font-sans">Everything you need to automate your reputation management and grow your business</p>
            </div>
            <div className="space-y-24">
              {/* Feature 1: Review Management */}
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <motion.div 
                  whileHover={{ scale: 1.02 }} 
                  className="transform-gpu will-change-[transform,opacity]"
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                >
                                     <div className="aspect-[16/10] rounded-2xl shadow-xl overflow-hidden">
                     <img 
                       src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1600&auto=format&fit=crop" 
                       alt="Review Management Dashboard" 
                       className="w-full h-full object-cover"
                       width="560"
                       height="350"
                       sizes="(min-width: 1024px) 560px, 100vw"
                       loading="lazy"
                       decoding="async"
                       onError={(e) => { 
                         e.currentTarget.onerror = null; 
                         e.currentTarget.src = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600&auto=format&fit=crop'; 
                       }}
                     />
                   </div>
                </motion.div>
                <div>
                  <div className="inline-flex items-center gap-3 bg-blue-100 text-blue-700 px-4 py-1 rounded-full mb-4 font-semibold">
                    <Star className="w-5 h-5" />
                    <span>Review Management</span>
                  </div>
                  <h3 className="text-3xl font-display font-bold text-gray-900 mb-4">Centralized Review Control</h3>
                  <p className="text-gray-600 text-lg mb-6 font-sans">Monitor and respond to reviews across Google, Yelp, and Facebook from one unified dashboard. Never miss a customer interaction again.</p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-500" /><span>Real-time review notifications</span></li>
                    <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-500" /><span>Automated sentiment analysis</span></li>
                    <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-500" /><span>Custom response templates</span></li>
                  </ul>
                </div>
              </div>

              {/* Feature 2: Automated Sequences */}
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <motion.div 
                  whileHover={{ scale: 1.02 }} 
                  className="md:order-last transform-gpu will-change-[transform,opacity]"
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                >
                                     <div className="aspect-[16/10] rounded-2xl shadow-xl overflow-hidden">
                     <img 
                       src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600&auto=format&fit=crop" 
                       alt="Automated Follow-up Sequences" 
                       className="w-full h-full object-cover"
                       width="560"
                       height="350"
                       sizes="(min-width: 1024px) 560px, 100vw"
                       loading="lazy"
                       decoding="async"
                       onError={(e) => { 
                         e.currentTarget.onerror = null; 
                         e.currentTarget.src = 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=1600&auto=format&fit=crop'; 
                       }}
                     />
                   </div>
                </motion.div>
                <div className="md:order-first">
                  <div className="inline-flex items-center gap-3 bg-purple-100 text-purple-700 px-4 py-1 rounded-full mb-4 font-semibold">
                    <Repeat className="w-5 h-5" />
                    <span>Automation Sequences</span>
                  </div>
                  <h3 className="text-3xl font-display font-bold text-gray-900 mb-4">Put Your Follow-ups on Autopilot</h3>
                  <p className="text-gray-600 text-lg mb-6 font-sans">Create multi-step SMS and email campaigns that run automatically. Nurture leads, request reviews, and re-engage past customers without lifting a finger.</p>
                   <ul className="space-y-3">
                    <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-500" /><span>Custom delays and triggers</span></li>
                    <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-500" /><span>Intelligent throttling to avoid spam</span></li>
                    <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-500" /><span>Performance tracking for each sequence</span></li>
                  </ul>
                </div>
              </div>
               <div className="text-center pt-8">
                                   <Link to="/features">
                    <Button data-auth="true" size="lg" variant="outline" className="border-2 border-blue-600 text-blue-600 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-blue-700">
                      Explore All Features <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
               </div>
            </div>
          </div>
        </AnimatedSection>

        {/* How It Works Preview */}
        <AnimatedSection className="py-24 lg:py-28 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-4xl font-display font-bold text-gray-900 mb-6">How It Works</h2>
            <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto font-sans">Get started in minutes with our simple 3-step process</p>
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-12">
              <HowItWorksStep Icon={Settings} title="Setup" description="Connect your business profiles in minutes" delay={0} />
              <HowItWorksStep Icon={Rocket} title="Automate" description="Let Blipp handle review requests automatically" delay={0.1} />
              <HowItWorksStep Icon={BarChart3} title="Grow" description="Watch your ratings and revenue increase" delay={0.2} />
            </div>
            <Link to="/how-it-works">
              <Button data-auth="true" variant="outline" className="border-2 border-blue-600 text-blue-600 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-blue-700">
                Learn More <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </AnimatedSection>

        {/* Simple Setup Preview */}
        <AnimatedSection className="py-24 lg:py-28 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-display font-bold text-gray-900 mb-6">Simple Setup</h2>
                <p className="text-lg text-gray-600 mb-8 font-sans">Get your reputation marketing engine running in under 10 minutes. No technical knowledge required.</p>
                <div className="space-y-4 mb-8">
                  <SetupListItem text="Connect your Google My Business profile" delay={0} />
                  <SetupListItem text="Import your customer list (CSV or manual)" delay={0.1} />
                  <SetupListItem text="Customize your review request templates" delay={0.2} />
                  <SetupListItem text="Set automation rules and go live" delay={0.3} />
                </div>
                <Link to="/simple-setup">
                  <Button data-auth="true" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500">
                    See Setup Guide <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
              <div className="relative">
                <motion.div
                  className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl p-8"
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true, amount: 0.2 }}
                >
                  <div className="bg-white rounded-lg p-6 shadow-lg">
                    <h3 className="font-semibold mb-4">Setup Progress</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Business Profile</span>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.5 }}
                        >
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </motion.div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Customer Import</span>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 1 }}
                        >
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </motion.div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Templates</span>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Testimonials Preview */}
        <AnimatedSection className="py-20 px-6 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-4xl font-display font-bold text-gray-900 mb-6">Trusted by Growing Businesses</h2>
            <p className="text-lg text-gray-600 mb-12 font-sans">See what our customers are saying about their success with Blipp</p>
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <TestimonialCard testimonial={{ name: "Sarah Johnson", role: "Dental Practice Owner", quote: "Blipp tripled our Google reviews in just 3 months. Game changer!", rating: 5 }} delay={0} />
              <TestimonialCard testimonial={{ name: "Mike Rodriguez", role: "Restaurant Manager", quote: "The automation saves us hours every week. Our rating went from 3.8 to 4.6.", rating: 5 }} delay={0.1} />
              <TestimonialCard testimonial={{ name: "Emily Chen", role: "Spa Director", quote: "Customer conversations are so much easier now. Revenue is up 40%.", rating: 5 }} delay={0.2} />
            </div>
                            <Link to="/testimonials">
              <Button data-auth="true" variant="outline" className="border-2 border-purple-600 text-purple-600 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-purple-700">
                Read All Stories <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </AnimatedSection>

        {/* Footer Bar */}
        <div className="py-12 px-6 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-white text-lg font-medium">© 2025 Blipp. All rights reserved.</p>
          </div>
        </div>
       </main>
     </div>
     </MotionConfig>
   );
 }




