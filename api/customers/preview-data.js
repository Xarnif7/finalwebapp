import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { business_id } = req.body;

    if (!business_id) {
      return res.status(400).json({ error: 'Missing business_id' });
    }

    // Get a sample customer for preview
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('name, email')
      .eq('business_id', business_id)
      .limit(1);

    if (customersError) {
      console.error('Customers fetch error:', customersError);
    }

    // Get business information
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('name, business_type')
      .eq('id', business_id)
      .single();

    if (businessError) {
      console.error('Business fetch error:', businessError);
    }

    // Get a sample service/invoice for preview
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('service_date, amount')
      .eq('business_id', business_id)
      .order('service_date', { ascending: false })
      .limit(1);

    if (servicesError) {
      console.error('Services fetch error:', servicesError);
    }

    // Prepare preview data
    const previewData = {
      customer_name: customers?.[0]?.name || 'John Smith',
      customer_email: customers?.[0]?.email || 'john.smith@example.com',
      business_name: business?.name || 'Your Business',
      service_date: services?.[0]?.service_date ? new Date(services[0].service_date).toLocaleDateString() : 'January 15, 2024',
      amount: services?.[0]?.amount ? `$${services[0].amount}` : '$150.00',
      review_link: 'https://reviews.example.com/review/abc123'
    };

    res.status(200).json({
      success: true,
      preview_data: previewData
    });

  } catch (error) {
    console.error('Preview data error:', error);
    
    // Return fallback data
    res.status(200).json({
      success: true,
      preview_data: {
        customer_name: 'John Smith',
        customer_email: 'john.smith@example.com',
        business_name: 'Your Business',
        service_date: 'January 15, 2024',
        amount: '$150.00',
        review_link: 'https://reviews.example.com/review/abc123'
      },
      fallback: true
    });
  }
}
