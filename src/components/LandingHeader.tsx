import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/entities/all";
import { Button } from "@/components/ui/button";

export default function LandingHeader() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    User.me().then(setUser).catch(() => setUser(null)).finally(() => setIsLoading(false));
    const onScroll = () => setScrollY(window.scrollY);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleAuth = () => (user ? navigate(createPageUrl("Dashboard")) : User.login());

  // Subtle adaptive tint (optional). Keep it translucent so blur shows through.
  const tint =
    scrollY < 120 ? "bg-white/10" : "bg-white/12"; // tiny change only—both are translucent

  return (
    <header
      role="navigation"
      className={
        [
          "isolate fixed top-0 left-0 right-0 z-50",
          "h-20 border-b border-white/20",
          "backdrop-blur-xl backdrop-saturate-150",
          "supports-[backdrop-filter]:bg-white/8",
          tint,
          "transition-colors duration-200"
        ].join(" ")
      }
      // Safari: ensure blur is applied
      style={{ WebkitBackdropFilter: "blur(20px)" }}
    >
      <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
        {/* Transparent logo asset — no background box */}
        <Link to={createPageUrl("Landing")} aria-label="Blipp" className="shrink-0">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/0e243f198_NEWBLIPPLOGO.png"
            alt="Blipp"
            className="h-10 w-auto"
            // Make sure it stays readable over dark/bright backgrounds
            style={{ filter: scrollY < 120 ? "brightness(0) invert(1)" : "none" }}
          />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {["Features", "HowItWorks", "SimpleSetup", "Testimonials"].map((p) => (
            <Link
              key={p}
              to={createPageUrl(p)}
              className="text-white/90 hover:text-white font-medium transition-colors relative group"
            >
              {p.replace(/([A-Z])/g, " $1").trim()}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-200 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="w-32 h-9 rounded-lg bg-white/20 animate-pulse" />
          ) : user ? (
            <Button
              onClick={handleAuth}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition"
            >
              View Dashboard
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => User.login()} className="text-white/90 hover:text-white">
                Sign In
              </Button>
              <Button
                onClick={handleAuth}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition"
              >
                Get Started
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}


