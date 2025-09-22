import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useBusiness } from "@/hooks/useBusiness";

const AutomationsPage = () => {
  const { user } = useAuth();
  const { business } = useBusiness();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Automations component mounted');
    console.log('User:', user);
    console.log('Business:', business);
    setLoading(false);
  }, [user, business]);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Automations</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Automations</h1>
      <p>This is a test of the Automations page with hooks.</p>
      <p>User: {user?.email || 'No user'}</p>
      <p>Business: {business?.name || 'No business'}</p>
      <p>If you can see this, the hooks are working!</p>
    </div>
  );
};

export default AutomationsPage;
