
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { User } from "@/api/entities";
import {
  Star, MessageSquare, TrendingUp, Clock, Shield, Zap, Target, Rocket, Heart, CheckCircle,
  BarChart3, Repeat, Compass, Brain, MessageCircle as ConversationsIcon, ArrowRight,
  Users, Settings, PlayCircle, Award, Instagram, Mail
} from "lucide-react";

const FloatingCard = ({ children, className = "", delay = 0 }) => {
  return (
    <motion.div
      className={`bg-white rounded-2xl shadow-xl border border-gray-100 ${className}`}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.6, 0.01, 0.05, 0.95] }}
      whileHover={{ y: -5, scale: 1.03, transition: { duration: 0.2 } }}
    >
      {children}
    </motion.div>
  );
};

const AnimatedSection = ({ children, className = "", id }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <motion.section
      id={id}
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 60 }}
      transition={{ duration: 0.8, ease: [0.6, 0.01, 0.05, 0.95] }}
      className={className}
    >
      {children}
    </motion.section>
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
  const [user, setUser] = useState(null);
  const { scrollYProgress } = useScroll();
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  useEffect(() => {
    User.me().then(setUser).catch(() => setUser(null));
  }, []);

  const handleGetStarted = () => {
    if (user) {
      navigate(createPageUrl("Dashboard"));
    } else {
      User.login();
    }
  };

  return (
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

      <main className="relative z-10 pt-24">
        {/* Hero Section */}
        <section id="home" className="pt-20 pb-32 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">
              <motion.h1
                className="mb-12"
                style={{
                  textShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  wordSpacing: '0.1em',
                  fontSize: 'clamp(3rem, 7vw, 5rem)',
                  fontWeight: '900',
                  lineHeight: '0.9',
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
                className="text-xl md:text-2xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.2, ease: [0.6, 0.01, 0.05, 0.95] }}
              >
                Effortless review generation that saves you time and drives steady growth by turning every customer into a loyal advocate.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.4, ease: [0.6, 0.01, 0.05, 0.95] }}
              >
                <Button
                  size="lg"
                  onClick={handleGetStarted}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg px-10 py-6 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
                >
                  {user ? 'Visit Your Dashboard' : 'Start Growing Your Reputation'}
                </Button>
              </motion.div>
            </div>

            <motion.div
              className="mt-20 relative"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.6, ease: [0.6, 0.01, 0.05, 0.95] }}
            >
              <div className="relative max-w-5xl mx-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-3xl rounded-3xl" />
                <FloatingCard className="p-8 relative">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Star className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        <CountUpNumber end={247} />%
                      </h3>
                      <p className="text-gray-600">Average Review Increase</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <TrendingUp className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        <CountUpNumber end={89} />%
                      </h3>
                      <p className="text-gray-600">Customer Response Rate</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        <CountUpNumber end={24} />/7
                      </h3>
                      <p className="text-gray-600">Automated Operation</p>
                    </div>
                  </div>
                </FloatingCard>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section for Main Landing Page */}
        <AnimatedSection id="features" className="py-24 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">A Smarter Way to Manage Your Reputation</h2>
              <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">Blipp is more than a review tool. It's a full-stack reputation marketing platform designed to help you grow.</p>
            </div>
            <div className="space-y-24">
              {/* Feature 1: Unified Inbox */}
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="inline-flex items-center gap-3 bg-blue-100 text-blue-700 px-4 py-1 rounded-full mb-4 font-semibold">
                    <ConversationsIcon className="w-5 h-5" />
                    <span>Conversations Inbox</span>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">All Your Messages in One Place</h3>
                  <p className="text-gray-600 text-lg mb-6">Engage with customers across SMS and other platforms from a single, unified inbox. Respond faster, build relationships, and never miss a conversation.</p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-500" /><span>Two-way SMS supported</span></li>
                    <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-500" /><span>AI-powered smart replies</span></li>
                    <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-500" /><span>Internal notes for team collaboration</span></li>
                  </ul>
                </div>
                <motion.div whileHover={{ scale: 1.05 }} transition={{ type: 'spring', stiffness: 300 }}>
                  <img 
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/3afb66987_image.png" 
                    alt="Conversations Inbox Interface" 
                    className="rounded-2xl shadow-xl aspect-[4/3] object-cover w-full"
                  />
                </motion.div>
              </div>

              {/* Feature 2: Automated Sequences */}
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <motion.div whileHover={{ scale: 1.05 }} transition={{ type: 'spring', stiffness: 300 }} className="md:order-last">
                    <img src="https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600" alt="Automation Sequences" className="rounded-2xl shadow-xl aspect-[4/3] object-cover"/>
                </motion.div>
                <div className="md:order-first">
                  <div className="inline-flex items-center gap-3 bg-purple-100 text-purple-700 px-4 py-1 rounded-full mb-4 font-semibold">
                    <Repeat className="w-5 h-5" />
                    <span>Automation Sequences</span>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">Put Your Follow-ups on Autopilot</h3>
                  <p className="text-gray-600 text-lg mb-6">Create multi-step SMS and email campaigns that run automatically. Nurture leads, request reviews, and re-engage past customers without lifting a finger.</p>
                   <ul className="space-y-3">
                    <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-500" /><span>Custom delays and triggers</span></li>
                    <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-500" /><span>Intelligent throttling to avoid spam</span></li>
                    <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-500" /><span>Performance tracking for each sequence</span></li>
                  </ul>
                </div>
              </div>
               <div className="text-center pt-8">
                 <Link to={createPageUrl('Features')}>
                    <Button size="lg" variant="outline" className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white">
                      Explore All Features <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
               </div>
            </div>
          </div>
        </AnimatedSection>

        {/* How It Works Preview */}
        <AnimatedSection className="py-20 px-6 bg-gray-50">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">How It Works</h2>
            <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">Get started in minutes with our simple 3-step process</p>
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {[
                { icon: Settings, title: "Setup", description: "Connect your business profiles in minutes" },
                { icon: Rocket, title: "Automate", description: "Let Blipp handle review requests automatically" },
                { icon: BarChart3, title: "Grow", description: "Watch your ratings and revenue increase" }
              ].map((step, i) => (
                <motion.div
                  key={i}
                  className="text-center"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.2 }}
                  viewport={{ once: true }}
                >
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <step.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </motion.div>
              ))}
            </div>
            <Link to={createPageUrl('HowItWorks')}>
              <Button variant="outline" className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white">
                Learn More <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </AnimatedSection>

        {/* Simple Setup Preview */}
        <AnimatedSection className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold text-gray-900 mb-6">Simple Setup</h2>
                <p className="text-lg text-gray-600 mb-8">Get your reputation marketing engine running in under 10 minutes. No technical knowledge required.</p>
                <div className="space-y-4 mb-8">
                  {[
                    "Connect your Google My Business profile",
                    "Import your customer list (CSV or manual)",
                    "Customize your review request templates",
                    "Set automation rules and go live"
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span>{item}</span>
                    </motion.div>
                  ))}
                </div>
                <Link to={createPageUrl('SimpleSetup')}>
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
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
                  viewport={{ once: true }}
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
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Trusted by Growing Businesses</h2>
            <p className="text-lg text-gray-600 mb-12">See what our customers are saying about their success with Blipp</p>
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {[
                { name: "Sarah Johnson", role: "Dental Practice Owner", quote: "Blipp tripled our Google reviews in just 3 months. Game changer!", rating: 5 },
                { name: "Mike Rodriguez", role: "Restaurant Manager", quote: "The automation saves us hours every week. Our rating went from 3.8 to 4.6.", rating: 5 },
                { name: "Emily Chen", role: "Spa Director", quote: "Customer conversations are so much easier now. Revenue is up 40%.", rating: 5 }
              ].map((testimonial, i) => (
                <motion.div
                  key={i}
                  className="bg-white rounded-2xl p-6 shadow-lg"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4">"{testimonial.quote}"</p>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}</div>
                  </div>
                </motion.div>
              ))}
            </div>
            <Link to={createPageUrl('Testimonials')}>
              <Button variant="outline" className="border-2 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white">
                Read All Stories <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </AnimatedSection>

        {/* Final CTA */}
        <AnimatedSection className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Ready to Transform Your Reputation?</h2>
            <p className="text-xl text-gray-600 mb-8">Join thousands of businesses already growing with Blipp</p>
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xl px-12 py-8 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-110"
            >
              {user ? 'Visit Your Dashboard' : 'Start Your Free Trial'}
              <ArrowRight className="w-6 h-6 ml-3" />
            </Button>
          </div>
        </AnimatedSection>
      </main>
    </div>
  );
}
