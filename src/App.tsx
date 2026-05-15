import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
import TopUpCard from "./pages/TopUpCard";
import TopUpATM from "./pages/TopUpATM";
import History from "./pages/History";
import TopUpHistory from "./pages/TopUpHistory";
import PurchaseHistory from "./pages/PurchaseHistory";
import BalanceHistory from "./pages/BalanceHistory";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import OrderDetail from "./pages/OrderDetail";
import ProductDetail from "./pages/ProductDetail";
import FAQ from "./pages/FAQ";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import CardRegulations from "./pages/CardRegulations";
import WarrantyPolicy from "./pages/WarrantyPolicy";
import CTVDashboard from "./pages/CTVDashboard";
import ResetPassword from "./pages/ResetPassword";
import ClickSparkle from "./components/ClickSparkle";
import TopupNotifier from "./components/TopupNotifier";
import KietzBadge from "./components/KietzBadge";
import PageLoader from "./components/PageLoader";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ClickSparkle />
        <TopupNotifier />
        <KietzBadge />
        <BrowserRouter>
          <PageLoader />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/nap-tien" element={<Navigate to="/nap-the" replace />} />
            <Route path="/nap-the" element={<TopUpCard />} />
            <Route path="/nap-atm" element={<TopUpATM />} />
            <Route path="/lich-su" element={<History />} />
            <Route path="/lich-su-nap" element={<TopUpHistory />} />
            <Route path="/lich-su-mua" element={<PurchaseHistory />} />
            <Route path="/bien-dong-so-du" element={<BalanceHistory />} />
            <Route path="/dang-nhap" element={<Auth />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/don-hang/:id" element={<OrderDetail />} />
            <Route path="/san-pham/:id" element={<ProductDetail />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/trang-ca-nhan" element={<Profile />} />
            <Route path="/quy-dinh-nap-the" element={<CardRegulations />} />
            <Route path="/chinh-sach-bao-hanh" element={<WarrantyPolicy />} />
            <Route path="/ctv" element={<CTVDashboard />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
