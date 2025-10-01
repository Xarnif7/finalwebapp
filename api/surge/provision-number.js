/**
 * Provision SMS Number Endpoint
 * POST /api/surge/provision-number
 * Creates Surge account, purchases TFN, submits verification
 */

const { getBusiness, updateBusiness, supabase } = require('../_lib/db');
const { requireOwner } = require('../_lib/auth');
const {
  createAccountForBusiness,
  purchaseTollFreeNumber,
  submitTfnVerification
} = require('../_lib/surgeClient');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { businessId, businessInfo } = req.body;

    // Validate required fields
    if (!businessId || !businessInfo) {
      return res.status(400).json({ 
        error: 'Missing required fields: businessId, businessInfo' 
      });
    }

    const {
      legal_name,
      brand_name,
      website,
      address,
      ein,
      sole_prop,
      contact_name,
      contact_email,
      contact_phone_e164,
      opt_in_method,
      opt_in_evidence_url,
      terms_url,
      privacy_url,
      estimated_monthly_volume,
      time_zone_iana
    } = businessInfo;

    // Validate required fields
    const requiredFields = ['legal_name', 'contact_email', 'opt_in_evidence_url', 'estimated_monthly_volume'];
    const missingFields = requiredFields.filter(field => !businessInfo[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required business info: ${missingFields.join(', ')}`
      });
    }

    // Validate address structure
    if (!address || !address.street_line1 || !address.city || 
        !address.state || !address.postal_code || !address.country) {
      return res.status(400).json({
        error: 'Missing required address fields: street_line1, city, state, postal_code, country'
      });
    }

    // Validate EIN vs sole_prop
    if (!sole_prop && !ein) {
      return res.status(400).json({
        error: 'Either EIN or sole_prop must be provided'
      });
    }

    if (ein && sole_prop) {
      return res.status(400).json({
        error: 'Cannot provide both EIN and sole_prop'
      });
    }

    // Validate EIN format (9 digits)
    if (ein) {
      const einDigits = ein.replace(/\D/g, '');
      if (einDigits.length !== 9) {
        return res.status(400).json({
          error: 'EIN must be exactly 9 digits'
        });
      }
    }

    // Validate phone number format
    if (contact_phone_e164) {
      const e164Regex = /^\+[1-9]\d{1,14}$/;
      if (!e164Regex.test(contact_phone_e164)) {
        return res.status(400).json({
          error: 'Contact phone must be in E.164 format'
        });
      }
    }

    // Validate URLs
    const urlFields = ['website', 'opt_in_evidence_url', 'terms_url', 'privacy_url'];
    for (const field of urlFields) {
      if (businessInfo[field]) {
        try {
          new URL(businessInfo[field]);
        } catch {
          return res.status(400).json({
            error: `${field} must be a valid URL`
          });
        }
      }
    }

    // Validate estimated_monthly_volume is integer
    if (!Number.isInteger(estimated_monthly_volume) || estimated_monthly_volume <= 0) {
      return res.status(400).json({
        error: 'estimated_monthly_volume must be a positive integer'
      });
    }

    // Auth: ensure caller owns businessId
    await requireOwner(req, businessId);

    // Get the business
    const business = await getBusiness(businessId);
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Check if business already has a number
    if (business.from_number) {
      return res.status(400).json({
        error: 'Business already has an SMS number',
        from_number: business.from_number,
        status: business.verification_status
      });
    }

    console.log('[PROVISION] Starting SMS provisioning for business:', businessId);

    // Step 1: Create Surge account if needed
    let accountId = business.surge_account_id;
    if (!accountId) {
      // Build organization object
      const organization = {
        legal_name: legal_name,
        ein_or_sole_prop: sole_prop ? "sole_prop" : ein,
        website: website,
        address: {
          line1: address.street_line1,
          line2: address.street_line2 || "",
          city: address.city,
          state: address.state,
          postal_code: address.postal_code,
          country: address.country
        },
        contact: {
          name: contact_name,
          email: contact_email,
          phone: contact_phone_e164
        }
      };

      const nameInternal = `${legal_name} — ${businessId}`;
      const brandName = brand_name || legal_name;

      const { accountId: newAccountId } = await createAccountForBusiness({
        name: nameInternal,
        brand_name: brandName,
        organization,
        time_zone: time_zone_iana || 'America/Denver'
      });
      accountId = newAccountId;
      
      // Persist surge_account_id
      await updateBusiness(businessId, { surge_account_id: accountId });
      console.log('[PROVISION] Account ID:', accountId);
    }

    // Capacity guard
    const maxNumbers = parseInt(process.env.SURGE_MAX_NUMBERS || '0', 10);
    if (maxNumbers > 0) {
      const { data: countRow } = await supabase
        .from('businesses')
        .select('id', { count: 'exact', head: true })
        .not('from_number', 'is', null);
      const inUse = (countRow && countRow.length) ? countRow.length : (supabase._count || 0);
      // Supabase count via head isn't easily available here; fallback simple query
      const { count } = await supabase
        .from('businesses')
        .select('id', { count: 'exact', head: true })
        .not('from_number', 'is', null);
      const numbersInUse = count || 0;
      if (numbersInUse >= maxNumbers) {
        await supabase.from('phone_provisioning_queue').insert({ business_id: businessId, status: 'queued' });
        return res.status(200).json({ queued: true, message: "Provisioning queued. We’ll email you when capacity opens." });
      }
    }

    // Step 2: Purchase toll-free number
    const { phoneId, e164 } = await purchaseTollFreeNumber({ accountId });
    console.log('[PROVISION] Purchased TFN:', e164);

    // Step 3: Submit TFN verification
    const brandName = brand_name || legal_name;
    
    const verificationPayload = {
      brand_name: brandName,
      use_case_categories: ["account_notifications", "customer_care", "two_way_conversational"],
      use_case_summary: `Transactional notifications and customer care for ${brandName}. Examples include service confirmations and review/feedback follow-ups. No promotional content. All messages honor STOP/HELP.`,
      sample_messages: [
        `Hi {First}—it's ${brandName}. Thanks again for choosing us today. Would you leave a quick review? {link} Reply STOP to opt out, HELP for help. Msg & data rates may apply.`,
        `${brandName} support: We received your feedback and we're on it. Reply here with any details. Reply STOP to opt out, HELP for help. Msg & data rates may apply.`
      ],
      opt_in: {
        method: opt_in_method,
        evidence_url: opt_in_evidence_url
      },
      terms_url: terms_url,
      privacy_url: privacy_url,
      estimated_monthly_volume: Number(estimated_monthly_volume)
    };

    const { verificationId, status } = await submitTfnVerification({ 
      accountId, 
      payload: verificationPayload 
    });
    console.log('[PROVISION] Verification submitted:', verificationId, status);

    // Step 4: Update business record
    await updateBusiness(businessId, {
      surge_phone_id: phoneId,
      from_number: e164,
      sender_type: 'tfn',
      verification_status: 'pending',
      last_verification_error: null,
      tfn_verification_id: verificationId,
      time_zone_iana: time_zone_iana || 'America/Denver',
      address_street_line1: address.street_line1,
      address_street_line2: address.street_line2,
      address_city: address.city,
      address_state: address.state,
      address_postal_code: address.postal_code,
      address_country: address.country
    });

    console.log('[PROVISION] Business updated successfully');

    return res.status(200).json({
      success: true,
      from_number: e164,
      status: 'pending',
      message: 'TFN provisioned and verification submitted. Pending approval.'
    });

  } catch (error) {
    console.error('[PROVISION] Error:', error);
    return res.status(500).json({
      error: 'Failed to provision SMS number',
      details: error.message
    });
  }
};
