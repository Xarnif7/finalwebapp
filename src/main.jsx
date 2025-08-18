import { User } from "@/api/entities";
import AuthWiring from "./auth/AuthWiring.jsx";
/** Block automatic redirects to Base44. Allow only when we explicitly enable it. */
const __origLogin = User.login;
User.login = (...args) => {
  if (window.__allowLogin === true) return __origLogin(...args);
  console.debug("Auto-login blocked on initial load");
};
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
) 










