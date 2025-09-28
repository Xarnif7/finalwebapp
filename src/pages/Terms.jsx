import React from 'react';

const Terms = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 mb-4">
              By accessing and using Blipp, you accept and agree to be bound by the terms and provision of this agreement.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. Description of Service</h2>
            <p className="text-gray-700 mb-4">
              Blipp is a SaaS platform that provides review management services, including:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li>Unified review inbox from multiple platforms</li>
              <li>Review response and management tools</li>
              <li>Analytics and reporting features</li>
              <li>Business profile management</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. User Accounts</h2>
            <p className="text-gray-700 mb-4">
              You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. Acceptable Use</h2>
            <p className="text-gray-700 mb-4">
              You agree not to use the service to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-6">
              <li>Violate any laws or regulations</li>
              <li>Infringe on the rights of others</li>
              <li>Transmit harmful or malicious code</li>
              <li>Attempt to gain unauthorized access to our systems</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. Third-Party Integrations</h2>
            <p className="text-gray-700 mb-4">
              Our service integrates with third-party platforms (Google, Facebook, Yelp). You are responsible for complying with their terms of service and ensuring you have the right to access the data you connect.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. Payment Terms</h2>
            <p className="text-gray-700 mb-4">
              Subscription fees are billed in advance on a monthly or annual basis. All fees are non-refundable unless otherwise stated.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">7. Limitation of Liability</h2>
            <p className="text-gray-700 mb-4">
              Blipp shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">8. Termination</h2>
            <p className="text-gray-700 mb-4">
              We may terminate or suspend your account at any time for violation of these terms or for any other reason at our discretion.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">9. Changes to Terms</h2>
            <p className="text-gray-700 mb-4">
              We reserve the right to modify these terms at any time. We will notify users of any material changes.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">10. Contact Information</h2>
            <p className="text-gray-700 mb-4">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p className="text-gray-700">
              Email: legal@myblipp.com<br />
              Website: https://myblipp.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
