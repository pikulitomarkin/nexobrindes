import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import AdminPanel from "@/components/panels/admin-panel";

export default function Dashboard() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminPanel />
    </QueryClientProvider>
  );
}