import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Mail, MessageSquare, Clock, Settings, ArrowRight, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Sparkles, Wand2, Eye, User, Link, Building, Calendar, Star, Trash2, Play } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSmsStatus } from "@/hooks/useSmsStatus";
import { supabase } from "@/lib/supabaseClient";
import TestSendModal from "./TestSendModal";

export default function TemplateCustomizer({ 
  isOpen, 
  onClose, 
  template, 
  onSave,
  onDelete,
  businessId,
  user: propUser,
  isCreating = false
}) {
  const { user: authUser } = useAuth();
  const { isSmsEnabled, isSmsPending, isSmsActionNeeded, isSmsNotProvisioned, getSmsStatusMessage } = useSmsStatus();
  const user = propUser || authUser; // Use prop user if available, otherwise use auth user
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_type: 'event',
    channels: ['email'],
    config_json: {
      message: '',
      delay_hours: 0,
      steps: []
    },
    service_types: [],
    service_types_text: '',
    is_default: false,
    trigger_events: {
      manual: true,
      jobber_job_completed: false,
      housecall_pro_job_completed: false,
      servicetitan_job_completed: false
    }
  });
  const [saving, setSaving] = useState(false);
  const [messageDropdownOpen, setMessageDropdownOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [messagePreview, setMessagePreview] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiEnhancing, setAiEnhancing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [testServiceType, setTestServiceType] = useState('');
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null);
  const [testSendModalOpen, setTestSendModalOpen] = useState(false);
  const [businessData, setBusinessData] = useState(null);
  const textareaRef = useRef(null);
  const previewTimeoutRef = useRef(null);

  // Auto-dismiss notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, notification.duration || 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Simple swear word filter
  const filterSwearWords = (text) => {
    const swearWords = ['damn', 'hell', 'shit', 'fuck', 'bitch', 'asshole', 'crap'];
    let filteredText = text;
    
    swearWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      filteredText = filteredText.replace(regex, '*'.repeat(word.length));
    });
    
    return filteredText;
  };

  // Default messages for each automation type
  const getDefaultMessage = (templateKey, templateName) => {
    const defaults = {
      'job_completed': 'Thank you for choosing us! We hope you were satisfied with our service. Please take a moment to leave us a review at {{review_link}}.',
      'invoice_paid': 'Thank you for your payment, {{customer.name}}! We appreciate your business. Please consider leaving us a review at {{review_link}}.',
      'service_reminder': 'Hi {{customer.name}}, this is a friendly reminder about your upcoming service appointment. We look forward to serving you!',
      'mock-1': 'Thank you for choosing us! We hope you were satisfied with our service. Please take a moment to leave us a review at {{review_link}}.',
      'mock-2': 'Thank you for your payment, {{customer.name}}! We appreciate your business. Please consider leaving us a review at {{review_link}}.',
      'mock-3': 'Hi {{customer.name}}, this is a friendly reminder about your upcoming service appointment. We look forward to serving you!'
    };
    
    return defaults[templateKey] || defaults[(templateName || '').toLowerCase()] || 'Thank you for your business! Please leave us a review at {{review_link}}.';
  };

  useEffect(() => {
    if (template) {
      const defaultMessage = getDefaultMessage(template.key, template.name);
      
      // Skip loading saved data for new templates (id is null or undefined)
      if (!template.id) {
        console.log('🆕 Creating new template - skipping saved data load');
        setFormData({
          name: '',
          description: '',
          channels: ['email'],
          trigger_type: 'event',
          delay_hours: 0,
          config_json: {
            message: defaultMessage,
            delay_hours: 0
          }
        });
        setCustomMessage(defaultMessage);
        setMessagePreview(defaultMessage);
        return;
      }
      
      // BULLETPROOF LOAD SYSTEM
      console.log('🔍 TemplateCustomizer user prop:', user);
      const userEmail = user?.email || 'unknown';
      console.log('🔍 TemplateCustomizer userEmail:', userEmail);
      const sanitizedEmail = userEmail ? userEmail.replace(/[^a-zA-Z0-9]/g, '_') : 'unknown';
      const localStorageKey = `blipp_templates_${sanitizedEmail}`;
      
      let savedTemplate = null;
      
      try {
        // Try localStorage first
        const existingData = localStorage.getItem(localStorageKey);
        const savedTemplates = existingData ? JSON.parse(existingData) : {};
        savedTemplate = savedTemplates[template.id];
        
        // If not found in localStorage, try sessionStorage
        if (!savedTemplate) {
          const sessionKey = `session_blipp_templates_${sanitizedEmail}_${template.id}`;
          const sessionData = sessionStorage.getItem(sessionKey);
          if (sessionData) {
            savedTemplate = JSON.parse(sessionData);
            console.log('🔄 LOADED from sessionStorage fallback:', sessionKey);
          }
        }
        
        console.log('🔍 BULLETPROOF LOAD COMPLETE:', {
          templateId: template.id,
          userEmail,
          localStorageKey,
          found: savedTemplate ? 'YES' : 'NO',
          source: savedTemplate ? (savedTemplate.last_saved ? 'localStorage' : 'sessionStorage') : 'none',
          templateName: template.name,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('❌ LOAD ERROR:', error);
        savedTemplate = null;
      }
      
      // Use saved template data if available, otherwise use template data
      const templateData = savedTemplate || template;
      const currentMessage = templateData.custom_message || templateData.config_json?.message || defaultMessage;
      
      setFormData({
        name: templateData.name || '',
        description: templateData.description || '',
        trigger_type: templateData.trigger_type || 'event',
        channels: templateData.channels || ['email'],
        service_types: templateData.service_types || [],
        service_types_text: templateData.service_types?.join(', ') || '',
        is_default: templateData.is_default || false,
        trigger_events: templateData.trigger_events || [],
        config_json: {
          message: currentMessage,
          delay_hours: templateData.config_json?.delay_hours ?? 24,
          delay_days: templateData.config_json?.delay_days || 0,
          steps: templateData.config_json?.steps || []
        }
      });
      
      setCustomMessage(currentMessage);
      generatePreview(currentMessage);
    }
  }, [template, user?.email]);

  // Load business data when test send modal opens
  useEffect(() => {
    if (testSendModalOpen) {
      console.log('🚀 Modal opened, businessId:', businessId);
      
      // If no businessId, get it from user profile
      const getBusinessId = async () => {
        if (!businessId && user?.id) {
          console.log('🚀 Getting business ID from user profile...');
          const { data: profile } = await supabase
            .from('profiles')
            .select('business_id')
            .eq('id', user.id)
            .single();
          
          if (profile?.business_id) {
            console.log('🚀 Found business ID from profile:', profile.business_id);
            return profile.business_id;
          }
        }
        return businessId;
      };

      const loadBusinessData = async () => {
        try {
          const actualBusinessId = await getBusinessId();
          console.log('🚀 Using business ID:', actualBusinessId);
          
          if (!actualBusinessId) {
            console.log('🚀 No business ID available, using fallback');
            const fallbackData = {
              id: 'fallback-business',
              name: 'Your Business',
              email: user?.email || 'noreply@myblipp.com'
            };
            setBusinessData(fallbackData);
            return;
          }

          const { data, error } = await supabase
            .from('businesses')
            .select('id, name, email')
            .eq('id', actualBusinessId)
            .single();
          
          console.log('🚀 Business data query result:', { data, error });
          
          if (error) {
            console.error('Error loading business data:', error);
            const fallbackData = {
              id: actualBusinessId,
              name: 'Your Business',
              email: user?.email || 'noreply@myblipp.com'
            };
            setBusinessData(fallbackData);
          } else {
            setBusinessData(data);
          }
        } catch (error) {
          console.error('Error loading business data:', error);
          const fallbackData = {
            id: 'fallback-business',
            name: 'Your Business',
            email: user?.email || 'noreply@myblipp.com'
          };
          setBusinessData(fallbackData);
        }
      };
      
      loadBusinessData();
    }
  }, [testSendModalOpen, businessId, user?.id, user?.email]);

  // Variable insertion function
  const insertVariable = (variable) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMessage = customMessage.substring(0, start) + variable + customMessage.substring(end);
      setCustomMessage(newMessage);
      setFormData(prev => ({
        ...prev,
        config_json: { ...prev.config_json, message: newMessage }
      }));
      generatePreview(newMessage);
      
      // Set cursor position after the inserted variable
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

  // Debounced preview generation for real-time updates
  const generatePreviewDebounced = (message) => {
    // Clear existing timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    
    // Immediate preview for common variables
    const immediatePreview = (message || '')
      .replace(/\{\{customer\.name\}\}/g, 'John Smith')
      .replace(/\{\{customer\.first_name\}\}/g, 'John')
      .replace(/\{\{customer\.last_name\}\}/g, 'Smith')
      .replace(/\{\{customer\.full_name\}\}/g, 'John Smith')
      .replace(/\{\{business\.name\}\}/g, 'Your Business')
      .replace(/\{\{company_name\}\}/g, 'Your Business')
      .replace(/\{\{company_website\}\}/g, 'https://yourbusiness.com');
    
    setMessagePreview(immediatePreview);
    
    // Set new timeout for full preview with real data
    previewTimeoutRef.current = setTimeout(() => {
      generatePreview(message);
    }, 500); // 500ms delay for full preview
  };

  // Generate preview with real customer data
  const generatePreview = async (message) => {
    try {
      // Get real customer data for preview
      const effectiveBusinessId = businessId || 'demo-business-id';
      
      const response = await fetch('/api/customers/preview-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: effectiveBusinessId
        })
      });

      if (response.ok) {
        const data = await response.json();
        const previewData = data.preview_data;
        
        const preview = (message || '')
          .replace(/\{\{customer\.name\}\}/g, previewData.customer_name)
          .replace(/\{\{customer\.first_name\}\}/g, previewData.customer_name?.split(' ')[0] || 'John')
          .replace(/\{\{customer\.last_name\}\}/g, previewData.customer_name?.split(' ').slice(1).join(' ') || 'Smith')
          .replace(/\{\{customer\.full_name\}\}/g, previewData.customer_name)
          .replace(/\{\{business\.name\}\}/g, previewData.business_name)
          .replace(/\{\{company_name\}\}/g, previewData.business_name)
          .replace(/\{\{company_website\}\}/g, previewData.company_website || 'https://yourbusiness.com');
        setMessagePreview(preview);
      } else {
        // Fallback to sample data
        const preview = (message || '')
          .replace(/\{\{customer\.name\}\}/g, 'John Smith')
          .replace(/\{\{customer\.first_name\}\}/g, 'John')
          .replace(/\{\{customer\.last_name\}\}/g, 'Smith')
          .replace(/\{\{customer\.full_name\}\}/g, 'John Smith')
          .replace(/\{\{business\.name\}\}/g, 'Your Business Name')
          .replace(/\{\{company_name\}\}/g, 'Your Business Name')
          .replace(/\{\{company_website\}\}/g, 'https://yourbusiness.com');
        setMessagePreview(preview);
      }
    } catch (error) {
      console.error('Preview generation error:', error);
      // Fallback to sample data
      const preview = (message || '')
        .replace(/\{\{customer\.name\}\}/g, 'John Smith')
        .replace(/\{\{customer\.first_name\}\}/g, 'John')
        .replace(/\{\{customer\.last_name\}\}/g, 'Smith')
        .replace(/\{\{customer\.full_name\}\}/g, 'John Smith')
        .replace(/\{\{business\.name\}\}/g, 'Your Business Name')
        .replace(/\{\{company_name\}\}/g, 'Your Business Name')
        .replace(/\{\{company_website\}\}/g, 'https://yourbusiness.com');
      setMessagePreview(preview);
    }
  };

  // AI message generation
  const generateWithAI = async () => {
    try {
      setAiGenerating(true);
      
      // Use a fallback business ID if none is available
      const effectiveBusinessId = businessId || 'demo-business-id';
      
      const requestBody = {
        template_name: template?.name,
        template_type: template?.key,
        business_id: effectiveBusinessId,
        automation_type: template?.trigger_type
      };
      
      console.log('🤖 AI Generation Request:', requestBody);
      
      // Skip health check and go straight to AI request
      console.log('🤖 Attempting AI generation...');
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('AI request timed out after 15 seconds');
      }, 15000); // 15 second timeout
      
      const response = await fetch('/api/ai/generate-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const newMessage = data.message;
        setCustomMessage(newMessage);
        setFormData(prev => ({
          ...prev,
          config_json: { ...prev.config_json, message: newMessage }
        }));
        generatePreview(newMessage);
        
        // Mark as AI generated
        setAiGenerating(false);
        setAiEnhancing(false);
      } else {
        const errorText = await response.text();
        console.error('AI Generation API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`AI generation failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('AI generation error:', error);
      
      // Generate unique fallback messages when AI fails
      const fallbackMessages = {
        'job_completed': [
          'Thank you for choosing us! We hope you were satisfied with our service. Please take a moment to leave us a review at {{review_link}}.',
          'We appreciate your business! If you enjoyed our service, please share your experience with a review at {{review_link}}.',
          'Thank you for trusting us with your project! We\'d love to hear your feedback at {{review_link}}.',
          'Your satisfaction means everything to us! Please consider leaving a review at {{review_link}}.',
          'Thank you for your business! We hope you\'ll share your experience with others at {{review_link}}.'
        ],
        'invoice_paid': [
          'Thank you for your payment, {{customer.name}}! We appreciate your business. Please consider leaving us a review at {{review_link}}.',
          'Payment received with gratitude! We\'d love your feedback at {{review_link}}.',
          'Thank you for the prompt payment! Please share your experience at {{review_link}}.',
          'We appreciate your business! Your review at {{review_link}} would mean the world to us.',
          'Payment confirmed! Thank you for choosing us. Please leave a review at {{review_link}}.'
        ],
        'service_reminder': [
          'Hi {{customer.name}}, this is a friendly reminder about your upcoming service appointment. We look forward to serving you!',
          'Hello {{customer.name}}! Just a quick reminder about your upcoming appointment. We can\'t wait to see you!',
          'Hi there {{customer.name}}! We\'re excited about your upcoming service. See you soon!',
          'Hello {{customer.name}}! A friendly reminder that we have your service appointment coming up. Looking forward to it!',
          'Hi {{customer.name}}! We\'re preparing for your upcoming appointment and can\'t wait to serve you!'
        ]
      };
      
      const messageArray = fallbackMessages[template?.key] || ['Thank you for your business! Please leave us a review at {{review_link}}.'];
      const randomIndex = Math.floor(Math.random() * messageArray.length);
      const fallbackMessage = messageArray[randomIndex];
      
      setCustomMessage(fallbackMessage);
      generatePreview(fallbackMessage);
      
      if (error.name === 'AbortError') {
        setNotification({
          type: 'info',
          message: 'AI generation timed out, but we\'ve added a professional fallback message for you!',
          duration: 5000
        });
      } else {
        setNotification({
          type: 'warning',
          message: 'AI service is temporarily unavailable, but we\'ve added a professional fallback message for you!',
          duration: 5000
        });
      }
      setAiGenerating(false);
      setAiEnhancing(false);
    }
  };

  // AI message enhancement
  const enhanceMessage = async () => {
    try {
      setAiEnhancing(true);
      
      // Use a fallback business ID if none is available
      const effectiveBusinessId = businessId || 'demo-business-id';
      
      // Skip health check and go straight to AI request
      console.log('🤖 Attempting AI enhancement...');
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('AI enhancement request timed out after 15 seconds');
      }, 15000); // 15 second timeout
      
      const response = await fetch('/api/ai/enhance-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_message: customMessage,
          template_name: template?.name,
          template_type: template?.key,
          business_id: effectiveBusinessId
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const enhancedMessage = data.enhanced_message;
        setCustomMessage(enhancedMessage);
        setFormData(prev => ({
          ...prev,
          config_json: { ...prev.config_json, message: enhancedMessage }
        }));
        generatePreview(enhancedMessage);
        
        // Mark as AI enhanced
        setAiGenerating(false);
        setAiEnhancing(false);
      } else {
        const errorText = await response.text();
        console.error('AI Enhancement API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`AI enhancement failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('AI enhancement error:', error);
      
      // Provide a simple enhancement when AI fails
      const currentText = customMessage;
      let enhancedText = currentText;
      
      // Simple enhancement rules
      if (currentText && typeof currentText === 'string' && !currentText.includes('{{customer.name}}')) {
        enhancedText = `{{customer.name}}, ${currentText}`;
      }
      
      if (enhancedText !== currentText) {
        setCustomMessage(enhancedText);
        generatePreview(enhancedText);
        setNotification({
          type: 'info',
          message: 'AI enhancement is unavailable, but we\'ve made some basic improvements to your message!',
          duration: 5000
        });
      } else {
        setNotification({
          type: 'info',
          message: 'AI enhancement is temporarily unavailable, but your original message is preserved.',
          duration: 5000
        });
      }
      
      setAiGenerating(false);
      setAiEnhancing(false);
    }
  };

  // AI template matching test
  const testAiMatching = async () => {
    if (!testServiceType.trim()) return;
    
    setAiTesting(true);
    setAiTestResult(null);
    
    try {
      // Get business ID from user's profile
      let effectiveBusinessId = businessId;
      if (!effectiveBusinessId && user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('business_id')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          effectiveBusinessId = profile.business_id;
        }
      }
      
      if (!effectiveBusinessId) {
        setAiTestResult({
          confidence: 0,
          reasoning: 'Unable to determine business ID. Please try again.'
        });
        return;
      }

      const response = await fetch('/api/ai/match-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobberServiceType: testServiceType,
          businessId: effectiveBusinessId
        })
      });

      if (response.ok) {
        const result = await response.json();
        setAiTestResult(result);
      } else {
        const errorText = await response.text();
        console.error('AI matching API error:', response.status, errorText);
        setAiTestResult({
          confidence: 0,
          reasoning: 'Failed to test AI matching. Please try again.'
        });
      }
    } catch (error) {
      console.error('AI testing error:', error);
      setAiTestResult({
        confidence: 0,
        reasoning: 'Error testing AI matching. Please try again.'
      });
    } finally {
      setAiTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Always save to database for persistence
      const updatedTemplate = {
        ...template,
        name: formData.name,
        description: formData.description,
        trigger_type: formData.trigger_type,
        channels: formData.channels,
        service_types: formData.service_types || [],
        is_default: formData.is_default || false,
        trigger_events: formData.trigger_events || [],
        config_json: {
          ...template.config_json,
          ...formData.config_json
        },
        custom_message: filterSwearWords(customMessage),
        ai_generated: aiGenerating || aiEnhancing,
        message_variables: {
          customer_name: customMessage && customMessage.includes('{{customer.name}}'),
          review_link: customMessage && customMessage.includes('{{review_link}}'),
          business_name: customMessage && customMessage.includes('{{business.name}}'),
          service_date: customMessage && customMessage.includes('{{service_date}}'),
          amount: customMessage && customMessage.includes('{{amount}}')
        },
        updated_at: new Date().toISOString()
      };

      // Try to save to database first (only if we have a valid businessId)
      if (businessId && businessId !== 'null' && businessId !== 'undefined') {
        try {
          const response = await fetch(`/api/templates/${businessId}/${template.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({
              ...formData,
              custom_message: filterSwearWords(customMessage),
              config_json: {
                ...formData.config_json,
                message: filterSwearWords(customMessage) // Also save in config_json.message
              },
              message_subject: formData.config_json?.subject || '',
              ai_generated: aiGenerating || aiEnhancing,
              service_types: formData.service_types || [],
              is_default: formData.is_default || false,
              trigger_events: formData.trigger_events || [],
              message_variables: {
                customer_name: customMessage && customMessage.includes('{{customer.name}}'),
                review_link: customMessage && customMessage.includes('{{review_link}}'),
                business_name: customMessage && customMessage.includes('{{business.name}}'),
                service_date: customMessage && customMessage.includes('{{service_date}}'),
                amount: customMessage && customMessage.includes('{{amount}}')
              }
            })
          });

          if (response.ok) {
            const dbTemplate = await response.json();
            onSave(dbTemplate);
            onClose();
            return; // Exit early if database save successful
          } else {
            throw new Error('Database save failed');
          }
        } catch (dbError) {
          console.log('Database save failed, saving to localStorage as backup:', dbError);
          // Fall through to localStorage save
        }
      }
      
      
      // BULLETPROOF PERSISTENCE SYSTEM
      console.log('🔒 TemplateCustomizer save user prop:', user);
      const userEmail = user?.email || 'unknown';
      console.log('🔒 TemplateCustomizer save userEmail:', userEmail);
      const sanitizedEmail = userEmail ? userEmail.replace(/[^a-zA-Z0-9]/g, '_') : 'unknown';
      const localStorageKey = `blipp_templates_${sanitizedEmail}`;
      
      try {
        // Get existing templates
        const existingData = localStorage.getItem(localStorageKey);
        const savedTemplates = existingData ? JSON.parse(existingData) : {};
        
        // Create template data
        const templateData = {
          ...updatedTemplate,
          id: template.id,
          business_id: `mock-business-${sanitizedEmail}`,
          user_email: userEmail,
          last_saved: new Date().toISOString()
        };
        
        // Save template
        savedTemplates[template.id] = templateData;
        
        // Save to localStorage
        localStorage.setItem(localStorageKey, JSON.stringify(savedTemplates));
        
        // Verify save worked
        const verifyData = localStorage.getItem(localStorageKey);
        const verifyTemplates = verifyData ? JSON.parse(verifyData) : {};
        
        console.log('🔒 BULLETPROOF SAVE COMPLETE:', {
          userEmail,
          localStorageKey,
          templateId: template.id,
          templateName: updatedTemplate.name,
          saved: verifyTemplates[template.id] ? 'SUCCESS' : 'FAILED',
          allTemplates: Object.keys(verifyTemplates),
          timestamp: new Date().toISOString()
        });
        
        // Double-check: if save failed, try alternative method
        if (!verifyTemplates[template.id]) {
          console.error('❌ SAVE FAILED - Trying alternative method');
          
          // Alternative: save to sessionStorage as backup
          const sessionKey = `session_${localStorageKey}`;
          sessionStorage.setItem(sessionKey, JSON.stringify(templateData));
          
          console.log('🔄 FALLBACK SAVE to sessionStorage:', sessionKey);
        }
        
      } catch (error) {
        console.error('❌ localStorage error:', error);
        
        // Fallback: save to sessionStorage
        const sessionKey = `session_blipp_templates_${sanitizedEmail}_${template.id}`;
        sessionStorage.setItem(sessionKey, JSON.stringify({
          ...updatedTemplate,
          id: template.id,
          user_email: userEmail,
          last_saved: new Date().toISOString()
        }));
        
        console.log('🔄 FALLBACK SAVE to sessionStorage:', sessionKey);
      }
      
      onSave(updatedTemplate);
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      setNotification({
        type: 'error',
        message: 'Error saving template. Please try again.',
        duration: 5000
      });
    } finally {
      setSaving(false);
    }
  };

  const addChannel = (channel) => {
    if (!formData.channels || !formData.channels.includes(channel)) {
      setFormData(prev => ({
        ...prev,
        channels: [...prev.channels, channel]
      }));
    }
  };

  const removeChannel = (channel) => {
    setFormData(prev => ({
      ...prev,
      channels: prev.channels.filter(c => c !== channel)
    }));
  };

  const getSmartRecommendations = (templateKey) => {
    const recommendations = {
      'job_completed': {
        timing: '24 hours after job completion',
        message: 'Thank you for choosing us! We hope you were satisfied with our service. Please take a moment to leave us a review.',
        channels: ['email', 'sms']
      },
      'invoice_paid': {
        timing: '48 hours after payment',
        message: 'Thank you for your payment! We appreciate your business. Please consider leaving us a review.',
        channels: ['email']
      },
      'service_reminder': {
        timing: '1 day before service',
        message: 'This is a friendly reminder about your upcoming service appointment. We look forward to serving you!',
        channels: ['sms', 'email']
      }
    };
    return recommendations[templateKey] || {};
  };

  const recommendations = getSmartRecommendations(template?.key);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Customize Template: {template?.name}
          </DialogTitle>
        </DialogHeader>

        {/* Notification */}
        {notification && (
          <div className={`p-3 rounded-lg border ${
            notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
            notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            notification.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-sm">{notification.message}</span>
              <button
                onClick={() => setNotification(null)}
                className="text-gray-400 hover:text-gray-600 ml-2"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div>
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter template name"
                className="w-full"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this template does"
                rows={2}
                maxLength={150}
                className="resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.description.length}/150 characters
              </p>
            </div>
          </div>

          {/* Channel Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Communication Channels</h3>
            
            <div className="flex gap-2 flex-wrap">
              <Button
                type="button"
                variant={formData.channels && formData.channels.includes('email') ? 'default' : 'outline'}
                size="sm"
                onClick={() => formData.channels && formData.channels.includes('email') ? removeChannel('email') : addChannel('email')}
                className="flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Email
              </Button>
              
              <Button
                type="button"
                variant={formData.channels && formData.channels.includes('sms') ? 'default' : 'outline'}
                size="sm"
                onClick={() => formData.channels && formData.channels.includes('sms') ? removeChannel('sms') : addChannel('sms')}
                disabled={!isSmsEnabled()}
                className={`flex items-center gap-2 ${!isSmsEnabled() ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={!isSmsEnabled() ? getSmsStatusMessage() : 'SMS messaging'}
              >
                <MessageSquare className="h-4 w-4" />
                SMS
                {!isSmsEnabled() && (
                  <Badge variant="outline" className="ml-1 text-xs">
                    {isSmsNotProvisioned() ? 'Not Set Up' : 
                     isSmsPending() ? 'Pending' : 
                     isSmsActionNeeded() ? 'Action Needed' : 'Disabled'}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Timing Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Timing Configuration</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="delay_days">Delay (Days)</Label>
                <Input
                  id="delay_days"
                  type="number"
                  value={formData.config_json.delay_days}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    config_json: {
                      ...prev.config_json,
                      delay_days: parseInt(e.target.value) || 0
                    }
                  }))}
                  min="0"
                  max="30"
                />
              </div>
              
              <div>
                <Label htmlFor="delay_hours">Delay (Hours)</Label>
                <Input
                  id="delay_hours"
                  type="number"
                  value={formData.config_json.delay_hours}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    config_json: {
                      ...prev.config_json,
                      delay_hours: parseInt(e.target.value) || 0
                    }
                  }))}
                  min="0"
                  max="168"
                />
              </div>
            </div>
          </div>

          {/* Message Content */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Message Content</h3>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="message">Email/SMS Message</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log('🧪 Test Send button clicked - opening modal directly');
                    setTestSendModalOpen(true);
                  }}
                  className="text-xs px-2 py-1 h-7"
                >
                  <Play className="w-3 h-3 mr-1" />
                  Test Send
                </Button>
              </div>
              <Textarea
                ref={textareaRef}
                id="message"
                value={customMessage}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setCustomMessage(newValue);
                  generatePreviewDebounced(newValue);
                }}
                placeholder="Enter your message content. Use {{customer.name}} for personalization."
                rows={4}
              />
            </div>
            
            {/* Message Customization Dropdown */}
            <Collapsible open={messageDropdownOpen} onOpenChange={setMessageDropdownOpen}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-between"
                  type="button"
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Customize Message Content
                  </span>
                  {messageDropdownOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-4 mt-4">
                {/* Variable Insertion Buttons */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Insert Variables</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: '{{customer.first_name}}', label: 'Customer First Name', icon: User },
                      { key: '{{customer.last_name}}', label: 'Customer Last Name', icon: User },
                      { key: '{{customer.full_name}}', label: 'Customer Full Name', icon: User },
                      { key: '{{company_name}}', label: 'Company Name', icon: Building },
                      { key: '{{company_website}}', label: 'Company Website', icon: Link }
                    ].map((variable) => (
                      <Button
                        key={variable.key}
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariable(variable.key)}
                        className="flex items-center gap-2"
                      >
                        <variable.icon className="w-3 h-3" />
                        {variable.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* AI Actions */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">AI Assistance</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={generateWithAI}
                      disabled={aiGenerating || aiEnhancing}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      {aiGenerating ? 'Generating...' : 'Generate with AI'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={enhanceMessage}
                      disabled={aiGenerating || aiEnhancing || !customMessage.trim()}
                      className="flex items-center gap-2"
                    >
                      <Wand2 className="w-4 h-4" />
                      {aiEnhancing ? 'Enhancing...' : 'Enhance Message'}
                    </Button>
                  </div>
                </div>

                {/* Live Preview */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Live Preview
                  </Label>
                  <div className="p-3 bg-gray-50 border rounded-lg">
                    <div className="text-sm whitespace-pre-wrap">
                      {messagePreview || customMessage || 'Enter a message to see preview...'}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Triggers & Keywords */}
          {!isCreating && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Triggers & Keywords</h3>
              
              <div className="space-y-4">
                {/* Keywords (comma-separated) */}
                <div>
                  <Label htmlFor="serviceTypes">Optional keywords to match (comma-separated)</Label>
                  <Input
                    id="serviceTypes"
                    value={formData.service_types_text || ''}
                    onChange={(e) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        service_types_text: e.target.value,
                        service_types: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                      }));
                    }}
                    placeholder="e.g., mowing, grass, roofing, repair"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    We’ll match these against invoice/job text (line descriptions, item names, custom fields). Also uses the template name.
                  </p>
                </div>

                {/* AI Template Matching Preview */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">🤖 AI Matching Preview</h4>
                  <p className="text-xs text-blue-700 mb-3">Test how well this template will match example phrases.</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Try text like: 'lawn mowing and edging' or 'roof repair'"
                      value={testServiceType}
                      onChange={(e) => setTestServiceType(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={testAiMatching}
                      disabled={!testServiceType.trim() || aiTesting}
                      className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {aiTesting ? 'Testing...' : 'Test'}
                    </button>
                  </div>
                  {aiTestResult && (
                    <div className="mt-3 p-3 bg-white rounded border">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-sm font-medium ${aiTestResult.confidence > 0.7 ? 'text-green-600' : aiTestResult.confidence > 0.4 ? 'text-yellow-600' : 'text-red-600'}`}>
                          Confidence: {Math.round(aiTestResult.confidence * 100)}%
                        </span>
                        {aiTestResult.confidence > 0.7 && <span className="text-green-600">✅</span>}
                        {aiTestResult.confidence > 0.4 && aiTestResult.confidence <= 0.7 && <span className="text-yellow-600">⚠️</span>}
                        {aiTestResult.confidence <= 0.4 && <span className="text-red-600">❌</span>}
                      </div>
                      <p className="text-xs text-gray-600">{aiTestResult.reasoning}</p>
                    </div>
                  )}
                </div>

                {/* Default Template Toggle */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={formData.is_default || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="isDefault" className="text-sm">
                    Use this as the default template for service types that don't have a specific template
                  </Label>
                </div>

                {/* Trigger Events */}
                <div>
                  <Label className="text-sm font-medium">Which events should trigger this template?</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="manualTrigger"
                        checked={formData.trigger_events && Array.isArray(formData.trigger_events) && formData.trigger_events.includes('manual') || false}
                        onChange={(e) => {
                          const triggers = formData.trigger_events || [];
                          if (e.target.checked) {
                            setFormData(prev => ({ 
                              ...prev, 
                              trigger_events: [...triggers, 'manual'].filter((v, i, a) => a.indexOf(v) === i)
                            }));
                          } else {
                            setFormData(prev => ({ 
                              ...prev, 
                              trigger_events: triggers.filter(t => t !== 'manual')
                            }));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="manualTrigger" className="text-sm">Manual Trigger - Triggered manually from customer tab</Label>
                    </div>

                    {/* QuickBooks triggers */}
                    <div className="mt-3">
                      <div className="text-xs font-medium text-gray-600 mb-1">QuickBooks</div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="qboInvoiceSent"
                          checked={formData.trigger_events && Array.isArray(formData.trigger_events) && formData.trigger_events.includes('qbo_invoice_sent') || false}
                          onChange={(e) => {
                            const triggers = formData.trigger_events || [];
                            if (e.target.checked) {
                              setFormData(prev => ({ 
                                ...prev, 
                                trigger_events: [...triggers, 'qbo_invoice_sent'].filter((v, i, a) => a.indexOf(v) === i)
                              }));
                            } else {
                              setFormData(prev => ({ 
                                ...prev, 
                                trigger_events: triggers.filter(t => t !== 'qbo_invoice_sent')
                              }));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="qboInvoiceSent" className="text-sm">QuickBooks: Invoice sent</Label>
                      </div>

                      <div className="flex items-center space-x-2 mt-1">
                        <input
                          type="checkbox"
                          id="qboInvoicePaid"
                          checked={formData.trigger_events && Array.isArray(formData.trigger_events) && formData.trigger_events.includes('qbo_invoice_paid') || false}
                          onChange={(e) => {
                            const triggers = formData.trigger_events || [];
                            if (e.target.checked) {
                              setFormData(prev => ({ 
                                ...prev, 
                                trigger_events: [...triggers, 'qbo_invoice_paid'].filter((v, i, a) => a.indexOf(v) === i)
                              }));
                            } else {
                              setFormData(prev => ({ 
                                ...prev, 
                                trigger_events: triggers.filter(t => t !== 'qbo_invoice_paid')
                              }));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="qboInvoicePaid" className="text-sm">QuickBooks: Invoice paid</Label>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="jobberJobCompleted"
                        checked={formData.trigger_events && Array.isArray(formData.trigger_events) && formData.trigger_events.includes('jobber_job_completed') || false}
                        onChange={(e) => {
                          const triggers = formData.trigger_events || [];
                          if (e.target.checked) {
                            setFormData(prev => ({ 
                              ...prev, 
                              trigger_events: [...triggers, 'jobber_job_completed'].filter((v, i, a) => a.indexOf(v) === i)
                            }));
                          } else {
                            setFormData(prev => ({ 
                              ...prev, 
                              trigger_events: triggers.filter(t => t !== 'jobber_job_completed')
                            }));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="jobberJobCompleted" className="text-sm">Jobber Job Completed - Automatically triggered when Jobber job is completed</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="housecallProJobCompleted"
                        checked={formData.trigger_events && Array.isArray(formData.trigger_events) && formData.trigger_events.includes('housecall_pro_job_completed') || false}
                        onChange={(e) => {
                          const triggers = formData.trigger_events || [];
                          if (e.target.checked) {
                            setFormData(prev => ({ 
                              ...prev, 
                              trigger_events: [...triggers, 'housecall_pro_job_completed'].filter((v, i, a) => a.indexOf(v) === i)
                            }));
                          } else {
                            setFormData(prev => ({ 
                              ...prev, 
                              trigger_events: triggers.filter(t => t !== 'housecall_pro_job_completed')
                            }));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="housecallProJobCompleted" className="text-sm">Housecall Pro Job Completed - Automatically triggered when Housecall Pro job is completed</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="servicetitanJobCompleted"
                        checked={formData.trigger_events && Array.isArray(formData.trigger_events) && formData.trigger_events.includes('servicetitan_job_completed') || false}
                        onChange={(e) => {
                          const triggers = formData.trigger_events || [];
                          if (e.target.checked) {
                            setFormData(prev => ({ 
                              ...prev, 
                              trigger_events: [...triggers, 'servicetitan_job_completed'].filter((v, i, a) => a.indexOf(v) === i)
                            }));
                          } else {
                            setFormData(prev => ({ 
                              ...prev, 
                              trigger_events: triggers.filter(t => t !== 'servicetitan_job_completed')
                            }));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="servicetitanJobCompleted" className="text-sm">ServiceTitan Job Completed - Automatically triggered when ServiceTitan job is completed</Label>
                    </div>
                  </div>
                </div>

                {/* How It Works Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 text-blue-600 mt-0.5">ℹ️</div>
                    <div>
                      <h4 className="font-medium text-blue-900 mb-2">How Trigger Matching Works</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• <strong>CRM Triggers:</strong> Only templates with the CRM trigger enabled will be considered</li>
                        <li>• <strong>Keywords + Name:</strong> We match your keywords and the template name to invoice/job text</li>
                        <li>• <strong>Fallback:</strong> If no keyword match, we use your default template for that trigger</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Visual Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Flow Preview</h3>
            
            <div className="flex items-center gap-2 flex-wrap p-4 bg-gray-50 rounded-lg">
              {/* Trigger */}
              <div className="flex items-center gap-2 px-3 py-2 bg-green-100 border border-green-200 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Trigger</span>
              </div>
              
              <ArrowRight className="w-4 h-4 text-gray-400" />
              
              {/* Delay */}
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-100 border border-orange-200 rounded-lg">
                <Clock className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-700">
                  {formData.config_json.delay_days > 0 ? `${formData.config_json.delay_days}d` : 
                   formData.config_json.delay_hours > 0 ? `${formData.config_json.delay_hours}h` : '0h'}
                </span>
              </div>
              
              <ArrowRight className="w-4 h-4 text-gray-400" />
              
              {/* Channels */}
              {formData.channels.map((channel, index) => (
                <React.Fragment key={channel}>
                  {index > 0 && <ArrowRight className="w-4 h-4 text-gray-400" />}
                  <div className={`flex items-center gap-2 px-3 py-2 border rounded-lg ${
                    channel === 'sms' ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'
                  }`}>
                    {channel === 'sms' ? <MessageSquare className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                    <span className="text-sm font-medium">
                      {channel === 'sms' ? 'SMS' : 'Email'}
                    </span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>


          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <div>
              {onDelete && !isCreating && (
                <Button 
                  variant="destructive" 
                  onClick={onDelete}
                  className="bg-red-600 hover:bg-red-700"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Test Send Modal */}
      <TestSendModal
        isOpen={testSendModalOpen}
        onClose={() => setTestSendModalOpen(false)}
        template={{
          id: template?.id || 'test',
          name: formData.name || 'Test Template',
          channels: formData.channels || ['email'],
          config_json: {
            message: customMessage
          }
        }}
        business={businessData}
        isLoadingBusiness={!businessData && testSendModalOpen}
      />
    </Dialog>
  );
}
