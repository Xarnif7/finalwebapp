import React, { createContext, useContext, useState, useCallback } from "react";

type Toast = { id: number; type: 'success'|'warn'|'error'; message: string };

const ToastCtx = createContext<{ push: (t: Omit<Toast,'id'>) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast,'id'>) => {
    const id = Date.now();
    setList(s => [...s, { id, ...t }]);
    setTimeout(() => setList(s => s.filter(x => x.id !== id)), 4000);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-[80]">
        {list.map(t => (
          <div key={t.id} className={`rounded-xl px-4 py-2 text-white shadow ${t.type==='success'?'bg-[#10B981]':t.type==='warn'?'bg-[#F59E0B]':'bg-[#EF4444]'}`}>{t.message}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(){
  const ctx = useContext(ToastCtx);
  if(!ctx) throw new Error('ToastProvider missing');
  return ctx;
}


