import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

export type Connections = { google:boolean; facebook:boolean; sms:boolean; email:boolean; commerce:boolean };

const KEY = ["connections"] as const;

export function useConnections() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Connections> => {
      try {
        const { data } = await api.get("/connections");
        return data;
      } catch {
        // mock fallback
        const saved = localStorage.getItem("mock_connections");
        return saved ? JSON.parse(saved) : { google:false, facebook:false, sms:false, email:false, commerce:false };
      }
    },
  });

  const mutate = useMutation({
    mutationFn: async (next: Partial<Connections>) => {
      const current = query.data || { google:false, facebook:false, sms:false, email:false, commerce:false };
      const merged = { ...current, ...next };
      localStorage.setItem("mock_connections", JSON.stringify(merged));
      return merged;
    },
    onSuccess: (data) => qc.setQueryData(KEY, data),
  });

  return { ...query, set: mutate.mutate };
}


