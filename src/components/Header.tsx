import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Header() {
const [scrolled, setScrolled] = useState(false);

useEffect(() => {
const onScroll = () => setScrolled(window.scrollY > 24);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });
return () => window.removeEventListener("scroll", onScroll);
}, []);

const shell =
"isolate sticky top-0 z-50 transition-[background,border-color,box-shadow] duration-200 " +
"backdrop-blur-lg backdrop-saturate-150 bg-white/10 supports-[backdrop-filter]:bg-white/5";
const elevation = scrolled
? " ring-1 ring-white/15 shadow-[0_1px_0_rgba(3,7,18,0.10)]"
: " ring-0 shadow-none";

return (
<header
role="navigation"
className={shell + elevation}
style={{ WebkitBackdropFilter: "blur(14px)" }}
>
<div className="mx-auto max-w-7xl h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
<Link to="/" aria-label="Blipp" className="flex items-center gap-2">
<img src="/logo-blipp.svg" alt="Blipp" className="h-6 w-auto" />
</Link>    <nav className="hidden md:flex items-center gap-8 text-sm">
      <a href="#features" className="text-white/90 hover:text-white">Features</a>
      <a href="#how" className="text-white/90 hover:text-white">How It Works</a>
      <a href="#testimonials" className="text-white/90 hover:text-white">Testimonials</a>
      <Button asChild className="rounded-xl bg-gradient-to-r from-[#7A5FFF] to-[#4BC9F0] text-white px-4 py-2 font-semibold hover:opacity-95">
        <Link to="/signup">Get Started</Link>
      </Button>
    </nav>

    <button
      className="md:hidden p-2 rounded-lg hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7A5FFF]"
      aria-label="Open menu"
    >
      <span className="block h-[2px] w-5 bg-white mb-1" />
      <span className="block h-[2px] w-5 bg-white" />
    </button>
  </div>
</header>
);
}


