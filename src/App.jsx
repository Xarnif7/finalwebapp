import './App.css'
import Pages from "./pages/index.jsx"
import { Toaster } from "./components/ui/toaster"
import { Toaster as HotToaster } from "react-hot-toast"
import { AuthProvider } from "@/components/auth/AuthProvider"
import { BrowserRouter } from "react-router-dom"
import { useEffect } from "react"

function App() {
  useEffect(() => {
    // Simple redirect monitoring without overriding read-only properties
    console.log('[APP] App initialized - monitoring for base44.app redirects');
    
    // Monitor for any redirects to base44.app
    const checkForBase44Redirect = () => {
      if (window.location.href.includes('base44.app')) {
        console.error('[REDIRECT DETECTED] Redirected to base44.app!');
        alert('Detected redirect to base44.app! This should not happen.');
      }
    };
    
    // Check periodically for redirects
    const interval = setInterval(checkForBase44Redirect, 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Pages />
        <Toaster />
        <HotToaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#10b981',
              color: 'white',
              fontWeight: '500'
            }
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App 


