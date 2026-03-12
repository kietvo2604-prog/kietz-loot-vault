import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import CategoryTabs from "@/components/CategoryTabs";
import ProductSection from "@/components/ProductSection";
import PolicySection from "@/components/PolicySection";
import TopUpGuide from "@/components/TopUpGuide";
import TopUpLeaderboard from "@/components/TopUpLeaderboard";
import RecentPurchases from "@/components/RecentPurchases";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  description: string | null;
  category: string;
  image_url: string | null;
}

type Category = { id: string; name: string; slug: string };

const Index = () => {
  const [searchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = searchParams.get("search");
    if (s) setSearchQuery(s);
  }, [searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      const [prodRes, catRes] = await Promise.all([
        supabase.from("products").select("*").eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("categories").select("*").order("sort_order"),
      ]);
      setProducts((prodRes.data as Product[]) || []);
      setCategories((catRes.data as Category[]) || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Build slug map from categories
  const slugMap: Record<string, string> = {};
  categories.forEach(c => { slugMap[c.name] = c.slug; });

  // Filter by search
  const filtered = searchQuery.trim()
    ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase()))
    : products;

  const grouped: Record<string, Product[]> = {};
  filtered.forEach((p) => {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  });

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <Header />

      <main className="container mx-auto px-4 py-6 space-y-8">
        <AnnouncementBanner />

        {/* Leaderboard */}
        <TopUpLeaderboard />

        {/* Search */}
        <div className="relative max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Tìm kiếm sản phẩm..."
            className="w-full bg-muted border border-border rounded-lg py-2.5 pl-4 pr-10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">✕</button>
          )}
        </div>

        <CategoryTabs activeCategory={activeCategory} onCategoryChange={setActiveCategory} />

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            {searchQuery ? `Không tìm thấy sản phẩm "${searchQuery}"` : "Chưa có sản phẩm nào."}
          </div>
        ) : (
          Object.entries(grouped).map(([category, prods]) => {
            const catSlug = slugMap[category] || category.toLowerCase().replace(/\s+/g, "");
            if (activeCategory !== "all" && activeCategory !== catSlug) return null;
            return (
              <ProductSection
                key={category}
                title={category.toUpperCase()}
                products={prods.map((p) => ({
                  id: p.id,
                  name: p.name,
                  price: p.price.toLocaleString("vi-VN") + "đ",
                  numericPrice: p.price,
                  stock: p.stock,
                  description: p.description || "",
                  category: p.category,
                  imageUrl: p.image_url || undefined,
                }))}
              />
            );
          })
        )}

        {/* Recent purchases */}
        <RecentPurchases />

        <div className="grid lg:grid-cols-2 gap-8">
          <PolicySection />
          <TopUpGuide />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
