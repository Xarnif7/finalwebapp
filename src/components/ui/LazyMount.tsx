import React, { useEffect, useRef, useState } from "react";

export default function LazyMount({ placeholder, children }: { placeholder?: React.ReactNode; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      });
    }, { rootMargin: '200px' });
    obs.observe(node);
    return () => obs.disconnect();
  }, []);
  return <div ref={ref}>{visible ? children : (placeholder ?? null)}</div>;
}


