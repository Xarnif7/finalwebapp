
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
      /* User.login();  // disabled auto-redirect */
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
        <section id="home" className="pt-20 pb-32 px-6 relative overflow-hidden">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              {/* Badge */}
              <motion.div
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 text-blue-700 px-6 py-3 rounded-full mb-8 font-semibold"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.6, 0.01, 0.05, 0.95] }}
              >
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Trusted by 10,000+ businesses worldwide</span>
              </motion.div>

              <motion.h1
                className="mb-8"
                style={{
                  textShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  wordSpacing: '0.1em',
                  fontSize: 'clamp(3.5rem, 8vw, 6rem)',
                  fontWeight: '900',
                  lineHeight: '0.85',
                  letterSpacing: '-0.05em',
                  maxWidth: '1000px',
                  margin: '0 auto'
                }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: [0.6, 0.01, 0.05, 0.95] }}
              >
                <span className="block">Turn Every Customer</span>
                <span className="block" style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #ec4899 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: '0 8px 32px rgba(102, 126, 234, 0.4)'
                }}>Into a Review Machine</span>
              </motion.h1>

              <motion.p
                className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.2, ease: [0.6, 0.01, 0.05, 0.95] }}
              >
                Stop chasing reviews manually. Our AI-powered platform automatically requests, manages, and optimizes your online reputation while you focus on what matters most.
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.4, ease: [0.6, 0.01, 0.05, 0.95] }}
              >
                <Button
                  size="lg"
                  onClick={handleGetStarted}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg px-12 py-6 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 group"
                >
                  {user ? 'Visit Your Dashboard' : 'Start Free Trial'}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 text-lg px-8 py-6 rounded-2xl transition-all duration-300"
                >
                  <PlayCircle className="w-5 h-5 mr-2" />
                  Watch Demo
                </Button>
              </motion.div>

              {/* Social Proof */}
              <motion.div
                className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-500"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.6, ease: [0.6, 0.01, 0.05, 0.95] }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1,2,3,4,5].map((i) => (
                      <div key={i} className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full border-2 border-white"></div>
                    ))}
                  </div>
                  <span>Join 10,000+ happy customers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span>4.9/5 rating on G2</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span>SOC 2 compliant</span>
                </div>
              </motion.div>
            </div>

            {/* Enhanced Stats Section */}
            <motion.div
              className="mt-24 relative"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.6, ease: [0.6, 0.01, 0.05, 0.95] }}
            >
              <div className="relative max-w-6xl mx-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 blur-3xl rounded-3xl" />
                <FloatingCard className="p-12 relative bg-white/80 backdrop-blur-sm">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <motion.div 
                      className="text-center group"
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:shadow-lg transition-all duration-300">
                        <Star className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-3xl font-bold text-gray-900 mb-2">
                        <CountUpNumber end={247} />%
                      </h3>
                      <p className="text-gray-600 font-medium">Average Review Increase</p>
                      <p className="text-sm text-gray-500 mt-1">Within 90 days</p>
                    </motion.div>
                    
                    <motion.div 
                      className="text-center group"
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:shadow-lg transition-all duration-300">
                        <TrendingUp className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-3xl font-bold text-gray-900 mb-2">
                        <CountUpNumber end={89} />%
                      </h3>
                      <p className="text-gray-600 font-medium">Customer Response Rate</p>
                      <p className="text-sm text-gray-500 mt-1">Industry leading</p>
                    </motion.div>
                    
                    <motion.div 
                      className="text-center group"
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:shadow-lg transition-all duration-300">
                        <Clock className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-3xl font-bold text-gray-900 mb-2">
                        <CountUpNumber end={24} />/7
                      </h3>
                      <p className="text-gray-600 font-medium">Automated Operation</p>
                      <p className="text-sm text-gray-500 mt-1">Never sleeps</p>
                    </motion.div>

                    <motion.div 
                      className="text-center group"
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <div className="w-20 h-20 bg-gradient-to-r from-amber-500 to-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:shadow-lg transition-all duration-300">
                        <Award className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-3xl font-bold text-gray-900 mb-2">
                        <CountUpNumber end={4.9} />
                      </h3>
                      <p className="text-gray-600 font-medium">Average Rating</p>
                      <p className="text-sm text-gray-500 mt-1">Customer satisfaction</p>
                    </motion.div>
                  </div>
                </FloatingCard>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section for Main Landing Page */}
        <AnimatedSection id="features" className="py-32 px-6 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <motion.div
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 px-6 py-2 rounded-full mb-6 font-semibold"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <Zap className="w-4 h-4" />
                <span>Powerful Features</span>
              </motion.div>
              <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-8 leading-tight">
                Everything You Need to
                <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Dominate Your Market
                </span>
              </h2>
              <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
                Stop juggling multiple tools. Our all-in-one platform handles everything from review requests to customer conversations, giving you the competitive edge you need.
              </p>
            </div>
            <div className="space-y-24">
              {/* Feature 1: Unified Inbox */}
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div>
                  <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 px-6 py-3 rounded-full mb-6 font-semibold">
                    <ConversationsIcon className="w-5 h-5" />
                    <span>Smart Conversations</span>
                  </div>
                  <h3 className="text-4xl font-bold text-gray-900 mb-6 leading-tight">Never Miss a Customer Again</h3>
                  <p className="text-gray-600 text-xl mb-8 leading-relaxed">Centralize all customer communications in one intelligent inbox. Our AI helps you respond faster and more effectively, turning every interaction into an opportunity.</p>
                  <div className="space-y-4 mb-8">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Two-way SMS & Email</h4>
                        <p className="text-gray-600">Seamless communication across all channels</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">AI-Powered Responses</h4>
                        <p className="text-gray-600">Smart suggestions that save you time</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Team Collaboration</h4>
                        <p className="text-gray-600">Internal notes and assignment features</p>
                      </div>
                    </div>
                  </div>
                  <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 rounded-xl">
                    Try Conversations <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
                <motion.div 
                  className="relative"
                  whileHover={{ scale: 1.02 }} 
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-2xl rounded-3xl"></div>
                  <img 
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/3afb66987_image.png" 
                    alt="Conversations Inbox Interface" 
                    className="relative rounded-3xl shadow-2xl aspect-[4/3] object-cover w-full border border-white/20"
                  />
                </motion.div>
              </div>

              {/* Feature 2: Automated Sequences */}
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <motion.div 
                  className="relative lg:order-last"
                  whileHover={{ scale: 1.02 }} 
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 blur-2xl rounded-3xl"></div>
                  <img 
                    src="https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600" 
                    alt="Automation Sequences" 
                    className="relative rounded-3xl shadow-2xl aspect-[4/3] object-cover w-full border border-white/20"
                  />
                </motion.div>
                <div className="lg:order-first">
                  <div className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 px-6 py-3 rounded-full mb-6 font-semibold">
                    <Repeat className="w-5 h-5" />
                    <span>Smart Automation</span>
                  </div>
                  <h3 className="text-4xl font-bold text-gray-900 mb-6 leading-tight">Set It and Forget It</h3>
                  <p className="text-gray-600 text-xl mb-8 leading-relaxed">Build powerful automation sequences that work 24/7. From review requests to customer nurturing, let our AI handle the heavy lifting while you focus on growing your business.</p>
                  <div className="space-y-4 mb-8">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Smart Triggers</h4>
                        <p className="text-gray-600">Custom delays and intelligent timing</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Anti-Spam Protection</h4>
                        <p className="text-gray-600">Intelligent throttling keeps you compliant</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Performance Analytics</h4>
                        <p className="text-gray-600">Track ROI and optimize every sequence</p>
                      </div>
                    </div>
                  </div>
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-xl">
                    Build Automation <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
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

        {/* Enhanced Testimonials Section */}
        <AnimatedSection className="py-32 px-6 bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
          <div className="max-w-7xl mx-auto text-center relative">
            <motion.div
              className="inline-flex items-center gap-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 px-6 py-2 rounded-full mb-6 font-semibold"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <Heart className="w-4 h-4" />
              <span>Customer Success Stories</span>
            </motion.div>
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-8 leading-tight">
              Real Results from
              <span className="block bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Real Businesses
              </span>
            </h2>
            <p className="text-xl text-gray-600 mb-16 max-w-3xl mx-auto">Join thousands of businesses that have transformed their reputation and revenue with Blipp</p>
            
            <div className="grid lg:grid-cols-3 gap-8 mb-16">
              {[
                { 
                  name: "Sarah Johnson", 
                  role: "Dental Practice Owner", 
                  company: "Bright Smiles Dental",
                  quote: "Blipp tripled our Google reviews in just 3 months. We went from 12 reviews to 47, and our rating jumped from 3.2 to 4.8. Our patient bookings increased by 60%!", 
                  rating: 5,
                  metric: "60% more bookings",
                  avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&q=85&fm=jpg&crop=face&cs=srgb&w=150&h=150&fit=crop"
                },
                { 
                  name: "Mike Rodriguez", 
                  role: "Restaurant Manager", 
                  company: "Bella Vista Restaurant",
                  quote: "The automation saves us hours every week. Our rating went from 3.8 to 4.6, and we're getting 3x more reviews. Customer satisfaction is through the roof!", 
                  rating: 5,
                  metric: "3x more reviews",
                  avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&q=85&fm=jpg&crop=face&cs=srgb&w=150&h=150&fit=crop"
                },
                { 
                  name: "Emily Chen", 
                  role: "Spa Director", 
                  company: "Serenity Wellness Spa",
                  quote: "Customer conversations are so much easier now. Our response time went from hours to minutes, and revenue is up 40%. Blipp pays for itself every month!", 
                  rating: 5,
                  metric: "40% revenue increase",
                  avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&q=85&fm=jpg&crop=face&cs=srgb&w=150&h=150&fit=crop"
                }
              ].map((testimonial, i) => (
                <motion.div
                  key={i}
                  className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 group"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5 }}
                >
                  <div className="flex items-center mb-6">
                    {[...Array(testimonial.rating)].map((_, j) => (
                      <Star key={j} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-6 text-lg leading-relaxed">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-4 mb-4">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-500">{testimonial.role}</div>
                      <div className="text-sm text-blue-600 font-medium">{testimonial.company}</div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3">
                    <div className="text-sm text-green-700 font-semibold">Result: {testimonial.metric}</div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to={createPageUrl('Testimonials')}>
                <Button size="lg" variant="outline" className="border-2 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white px-8 py-4 rounded-xl">
                  Read All Success Stories <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Button size="lg" className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-4 rounded-xl">
                Start Your Success Story <Rocket className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </AnimatedSection>

        {/* Enhanced Final CTA */}
        <AnimatedSection className="py-32 px-6 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
          
          <div className="max-w-5xl mx-auto text-center relative">
            <motion.div
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-6 py-2 rounded-full mb-8 font-semibold border border-white/20"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <Rocket className="w-4 h-4" />
              <span>Ready to Get Started?</span>
            </motion.div>
            
            <h2 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight">
              Stop Losing Customers to
              <span className="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Bad Reviews
              </span>
            </h2>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
              Join 10,000+ businesses that have transformed their reputation and increased revenue by 40% on average. Your competitors are already using Blipp – don't get left behind.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-xl px-16 py-8 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 group border border-white/20"
              >
                {user ? 'Visit Your Dashboard' : 'Start Free Trial - No Credit Card'}
                <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white/30 text-white hover:bg-white/10 text-xl px-12 py-8 rounded-2xl backdrop-blur-sm transition-all duration-300"
              >
                <PlayCircle className="w-6 h-6 mr-3" />
                Watch 2-Min Demo
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="text-3xl font-bold text-white mb-2">14-Day</div>
                <div className="text-gray-300">Free Trial</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="text-3xl font-bold text-white mb-2">No Setup</div>
                <div className="text-gray-300">Fees Ever</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="text-3xl font-bold text-white mb-2">24/7</div>
                <div className="text-gray-300">Support</div>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </main>
    </div>
  );
}


