import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar.jsx";
import FeaturesIntro from "@/components/FeaturesIntro.jsx";

export default function LandingExperiment() {
  const [scrolled, setScrolled] = useState(false);
  const USE_STATIC_IMAGE_TEST = false; // set to true to test static image blur

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-white">
      <Navbar />

      {/* Full-bleed hero with dynamic gradient background */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden mt-16 bg-gradient-to-br from-[#4BC9F0] via-[#7A5FFF] to-[#4BC9F0]">
        {/* Inline keyframes for animated gradient */}
        <style>{`
          @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
          @keyframes cw { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes ccw { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
          @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
          .badge{height:56px;width:56px;border-radius:9999px;background:rgba(255,255,255,.95);box-shadow:0 10px 20px rgba(0,0,0,.15);display:grid;place-items:center}
          .badge img{height:28px;width:28px}
        `}</style>
        {/* Background layer (TEST: static image to validate header blur) */}
        {USE_STATIC_IMAGE_TEST ? (
          <div
            aria-hidden
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: 'url(/images/landing-hero-dashboard.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 z-0"
            style={{
              background:
                "linear-gradient(135deg, #4BC9F0 0%, #7A5FFF 45%, #6A5BFF 55%, #4BC9F0 100%)",
              backgroundSize: '200% 200%',
              animation: 'gradientShift 18s ease-in-out infinite',
              filter: "saturate(120%)",
            }}
          />
        )}

        {/* Subtle radial fade at edges for readability */}
        <div
          aria-hidden
          className="absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(255,255,255,0) 0%, rgba(15,23,42,0.15) 70%, rgba(15,23,42,0.25) 100%)",
          }}
        />

        {/* Dashed concentric orbits (SVG) */}
        {!USE_STATIC_IMAGE_TEST && (
        <svg
          aria-hidden
          className="absolute w-[180vmin] h-[180vmin] text-white/35 z-0"
          viewBox="0 0 100 100"
          fill="none"
        >
          <g style={{ transformOrigin: '50% 50%', animation: 'cw 60s linear infinite' }}>
            <circle cx="50" cy="50" r="58" stroke="currentColor" strokeWidth="0.3" strokeDasharray="2 3" />
            {/* Orbiting badges on outer ring */}
            <g>
              <foreignObject x="50" y="0" width="0" height="0">
                <div />
              </foreignObject>
            </g>
          </g>
          <g style={{ transformOrigin: '50% 50%', animation: 'ccw 80s linear infinite' }}>
            <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="0.3" strokeDasharray="2 3" />
          </g>
          <g style={{ transformOrigin: '50% 50%', animation: 'cw 100s linear infinite' }}>
            <circle cx="50" cy="50" r="34" stroke="currentColor" strokeWidth="0.3" strokeDasharray="2 3" />
          </g>
          <g style={{ transformOrigin: '50% 50%', animation: 'ccw 120s linear infinite' }}>
            <circle cx="50" cy="50" r="22" stroke="currentColor" strokeWidth="0.3" strokeDasharray="2 3" />
          </g>
        </svg>
        )}

        {/* Platform badges tied to orbits */}
        {!USE_STATIC_IMAGE_TEST && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-0">
          <div className="relative w-[180vmin] h-[180vmin]" style={{ transform: 'translateZ(0)' }}>
            <div className="absolute inset-0" style={{ transform: 'translate(-50%, -50%)', left: '50%', top: '50%' }}>
              {/* Outermost ring intentionally has NO badges */}

              {/* Second ring (counter-clockwise) - start badges here */}
              <div className="absolute left-1/2 top-1/2" style={{ transformOrigin: '0 0', animation: 'ccw 80s linear infinite' }}>
                <div className="absolute" style={{ transform: 'rotate(0deg) translate(46vmin) translate(-28px, -28px)' }}>
                  <div className="badge" style={{ animation: 'cw 80s linear infinite' }}>
                    <img alt="Stripe" src="https://cdn.simpleicons.org/stripe/635BFF" />
                  </div>
                </div>
                <div className="absolute" style={{ transform: 'rotate(120deg) translate(46vmin) translate(-28px, -28px)' }}>
                  <div className="badge" style={{ animation: 'cw 80s linear infinite' }}>
                    <img alt="Google" src="https://cdn.simpleicons.org/google/4285F4" />
                  </div>
                </div>
                <div className="absolute" style={{ transform: 'rotate(240deg) translate(46vmin) translate(-28px, -28px)' }}>
                  <div className="badge" style={{ animation: 'cw 80s linear infinite' }}>
                    <img alt="Facebook" src="https://cdn.simpleicons.org/facebook/1877F2" />
                  </div>
                </div>
              </div>

              {/* Third ring (clockwise) */}
              <div className="absolute left-1/2 top-1/2" style={{ transformOrigin: '0 0', animation: 'cw 100s linear infinite' }}>
                <div className="absolute" style={{ transform: 'rotate(60deg) translate(34vmin) translate(-28px, -28px)' }}>
                  <div className="badge" style={{ animation: 'ccw 100s linear infinite' }}>
                    <img alt="Yelp" src="https://cdn.simpleicons.org/yelp/AF0606" />
                  </div>
                </div>
                <div className="absolute" style={{ transform: 'rotate(200deg) translate(34vmin) translate(-28px, -28px)' }}>
                  <div className="badge" style={{ animation: 'ccw 100s linear infinite' }}>
                    <img alt="GitHub" src="https://cdn.simpleicons.org/github/000000" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Centered text content */}
        <div className="relative z-10 mx-auto px-6 text-center max-w-5xl pt-16">
          <h1 className="font-extrabold tracking-tight" style={{ fontSize: "clamp(52px,8vw,104px)", lineHeight: 1.02 }}>
            <span>More Reviews. Less Work. </span>
            <span className="relative inline-block">
              <span
                className="relative z-10"
                style={{
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.9), #ffffff, rgba(255,255,255,0.9))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 4s linear infinite'
                }}
              >
                Real Results.
              </span>
              <span aria-hidden className="absolute left-0 right-0 -bottom-2 h-2 rounded-full bg-white/70/50 blur-[2px]" />
              <span aria-hidden className="absolute left-0 right-0 -bottom-2 h-2 rounded-full bg-gradient-to-r from-[#4BC9F0] via-white to-[#7A5FFF] opacity-70" />
            </span>
          </h1>
          <p className="mt-6 text-2xl text-white/95 max-w-3xl mx-auto">
            Companies of all sizes automate outreach, standardize data, and trigger AI replies across Google, Facebook, Yelp, and more.
          </p>
          <div className="mt-9 flex items-center justify-center">
            <a href="/paywall" className="inline-flex items-center rounded-2xl bg-gradient-to-r from-[#7A5FFF] to-[#4BC9F0] px-8 py-4 text-lg font-semibold text-white shadow-xl hover:shadow-2xl">
              Start Growing Your Reputation
            </a>
          </div>
        </div>
      </section>

      {/* New white Features section with clear divider */}
      <FeaturesIntro />
    </div>
  );
}


