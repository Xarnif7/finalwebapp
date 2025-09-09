import React from "react";

export default function GlowCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-2xl p-[1px] bg-[conic-gradient(var(--tw-gradient-stops))] from-[#7A5FFF] via-[#4BC9F0] to-[#7A5FFF]">
      <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-[0_6px_24px_rgba(16,24,40,.06)]">
        {children}
      </div>
    </div>
  );
}


