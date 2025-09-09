import { useEffect, useState } from "react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const shell =
    "isolate sticky top-0 z-50 transition-[background,box-shadow,border-color] duration-200 " +
    // GLASS
    "backdrop-blur-lg backdrop-saturate-150 bg-gradient-to-r from-[#4BC9F0]/20 to-[#7A5FFF]/20 supports-[backdrop-filter]:from-[#4BC9F0]/15 supports-[backdrop-filter]:to-[#7A5FFF]/15 ";
  const elevation = scrolled
    ? "ring-1 ring-white/15 shadow-[0_1px_0_rgba(3,7,18,0.10)]"
    : "ring-0 shadow-none";

  return (
    <header role="navigation" className={shell + elevation} style={{ WebkitBackdropFilter: "blur(14px)" }}>
      <div className="mx-auto max-w-7xl h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo: transparent asset only */}
        <a href="/" className="flex items-center gap-2" aria-label="Blipp">
          <img src="/logo-blipp.svg" alt="Blipp" className="h-6 w-auto" />
        </a>

        <nav className="hidden md:flex items-center gap-8 text-sm">
          <a className="text-white/90 hover:text-white" href="#features">Features</a>
          <a className="text-white/90 hover:text-white" href="#how">How It Works</a>
          <a className="text-white/90 hover:text-white" href="#testimonials">Testimonials</a>
          <a href="/signup" className="rounded-xl bg-gradient-to-r from-[#7A5FFF] to-[#4BC9F0] text-white px-4 py-2 font-semibold hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7A5FFF] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent">Get Started</a>
        </nav>

        <button className="md:hidden p-2 rounded-lg hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7A5FFF]" aria-label="Open menu">
          <span className="block h-[2px] w-5 bg-white mb-1"></span>
          <span className="block h-[2px] w-5 bg-white"></span>
        </button>
      </div>
    </header>
  );
}


