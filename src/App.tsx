import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
import TopUp from "./pages/TopUp";
import History from "./pages/History";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ClickSparkle from "./components/ClickSparkle";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ClickSparkle />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/nap-tien" element={<TopUp />} />
            <Route path="/lich-su" element={<History />} />
            <Route path="/dang-nhap" element={<Auth />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
