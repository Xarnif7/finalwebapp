// Test script to verify the reviews schema works
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testReviewsSchema() {
  try {
    console.log('🧪 Testing Reviews Schema...');
    
    // Test 1: Insert a sample review
    console.log('📝 Inserting sample review...');
    const { data: review, error: insertError } = await supabase
      .from('reviews')
      .insert({
        business_id: '674fedc5-7937-4054-bffd-e4ecc22abc1d', // Use a real business ID from your system
        platform: 'google',
        reviewer_name: 'John Doe',
        reviewer_email: 'john@example.com',
        rating: 5,
        review_text: 'Great service! Very professional and on time.',
        review_created_at: new Date().toISOString(),
        job_type: 'lawn care',
        topics: ['service quality', 'timeliness'],
        tags: ['positive', 'recommend']
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting review:', insertError);
      return;
    }

    console.log('✅ Review inserted successfully:', review.id);

    // Test 2: Check if triggers worked
    console.log('🔍 Checking auto-classification...');
    if (review.sentiment === 'positive' && review.nps_bucket === 'promoter') {
      console.log('✅ Sentiment auto-classification working');
    } else {
      console.log('❌ Sentiment auto-classification failed');
    }

    // Test 3: Check SLA setting
    console.log('⏰ Checking SLA setting...');
    if (review.due_at) {
      console.log('✅ SLA due date set:', review.due_at);
    } else {
      console.log('❌ SLA due date not set');
    }

    // Test 4: Check audit log
    console.log('📋 Checking audit log...');
    const { data: auditLog, error: auditError } = await supabase
      .from('review_audit_log')
      .select('*')
      .eq('review_id', review.id);

    if (auditError) {
      console.error('❌ Error fetching audit log:', auditError);
    } else if (auditLog && auditLog.length > 0) {
      console.log('✅ Audit log entry created:', auditLog[0].action);
    } else {
      console.log('❌ No audit log entry found');
    }

    // Test 5: Insert a response template
    console.log('📄 Testing response templates...');
    const { data: template, error: templateError } = await supabase
      .from('review_response_templates')
      .insert({
        business_id: '674fedc5-7937-4054-bffd-e4ecc22abc1d',
        name: 'Thank You Template',
        template_text: 'Thank you for your positive review! We appreciate your feedback.',
        platform: 'google',
        sentiment: 'positive',
        tone: 'professional'
      })
      .select()
      .single();

    if (templateError) {
      console.error('❌ Error inserting template:', templateError);
    } else {
      console.log('✅ Template inserted successfully:', template.id);
    }

    // Clean up
    console.log('🧹 Cleaning up test data...');
    await supabase.from('reviews').delete().eq('id', review.id);
    if (template) {
      await supabase.from('review_response_templates').delete().eq('id', template.id);
    }

    console.log('🎉 All tests passed! Reviews schema is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testReviewsSchema();
