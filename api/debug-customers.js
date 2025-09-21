import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get all businesses
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, created_by, created_at')
      .order('created_at', { ascending: true });

    if (businessError) {
      return res.status(500).json({ error: businessError.message });
    }

    // Get all customers with their business info
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('id, full_name, email, business_id, created_by, created_at')
      .order('created_at', { ascending: false });

    if (customerError) {
      return res.status(500).json({ error: customerError.message });
    }

    // Group customers by business
    const customersByBusiness = {};
    customers.forEach(customer => {
      if (!customersByBusiness[customer.business_id]) {
        customersByBusiness[customer.business_id] = [];
      }
      customersByBusiness[customer.business_id].push(customer);
    });

    return res.status(200).json({
      businesses: businesses,
      customersByBusiness: customersByBusiness,
      totalCustomers: customers.length,
      totalBusinesses: businesses.length
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
