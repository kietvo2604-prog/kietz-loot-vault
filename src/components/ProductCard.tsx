import { useState } from "react";
import { ShoppingCart, Eye, Package, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ProductCardProps {
  name: string;
  price: string;
  stock: number;
  description: string;
  category: string;
}

const ProductCard = ({ name, price, stock, description, category }: ProductCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [buying, setBuying] = useState(false);

  // Parse price string like "42.000đ" to number 42000
  const parsePrice = (p: string): number => {
    return parseInt(p.replace(/[^\d]/g, ""), 10) || 0;
  };

  const numericPrice = parsePrice(price);

  const handleBuy = async () => {
    if (!user) {
      toast({ title: "Vui lòng đăng nhập", description: "Bạn cần đăng nhập để mua hàng.", variant: "destructive" });
      return;
    }
    if (stock <= 0) {
      toast({ title: "Hết hàng", description: "Sản phẩm này hiện đã hết hàng.", variant: "destructive" });
      return;
    }

    setBuying(true);

    // Check balance
    const { data: profile } = await supabase
      .from("profiles")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.balance < numericPrice) {
      setBuying(false);
      toast({
        title: "❌ Số dư không đủ",
        description: `Bạn cần ${(numericPrice - (profile?.balance || 0)).toLocaleString("vi-VN")}đ nữa. Vui lòng nạp thêm!`,
        variant: "destructive",
      });
      return;
    }

    // Deduct balance
    const { error: balanceError } = await supabase
      .from("profiles")
      .update({ balance: profile.balance - numericPrice })
      .eq("user_id", user.id);

    if (balanceError) {
      setBuying(false);
      toast({ title: "Lỗi", description: "Không thể xử lý thanh toán. Vui lòng thử lại.", variant: "destructive" });
      return;
    }

    // Create order
    const { error: orderError } = await supabase.from("orders").insert({
      user_id: user.id,
      product_name: name,
      product_category: category,
      price: numericPrice,
    });

    if (orderError) {
      // Refund balance if order creation fails
      await supabase.from("profiles").update({ balance: profile.balance }).eq("user_id", user.id);
      setBuying(false);
      toast({ title: "Lỗi", description: "Không thể tạo đơn hàng. Đã hoàn tiền.", variant: "destructive" });
      return;
    }

    setBuying(false);
    toast({
      title: "✅ Mua hàng thành công!",
      description: `Bạn đã mua "${name}" với giá ${price}. Kiểm tra trong Lịch sử đơn hàng.`,
    });
    setTimeout(() => window.location.reload(), 1500);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 hover:neon-card transition-all duration-300 group">
      {/* Header badge */}
      <div className="gradient-primary px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-bold text-primary-foreground uppercase tracking-wider">{category}</span>
        <div className="flex items-center gap-1">
          <Package className="w-3.5 h-3.5 text-primary-foreground" />
          <span className="text-xs font-bold text-primary-foreground">Kho: {stock}</span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {name}
        </h3>

        <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="font-display text-lg font-bold text-neon-orange">{price}</span>
          <div className="flex gap-2">
            <button className="p-2 rounded-lg bg-muted hover:bg-border transition-colors" title="Chi tiết">
              <Eye className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={handleBuy}
              disabled={buying || stock <= 0}
              className="flex items-center gap-1.5 px-3 py-2 gradient-primary rounded-lg text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {buying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShoppingCart className="w-3.5 h-3.5" />
              )}
              {buying ? "Đang mua..." : stock <= 0 ? "Hết hàng" : "Mua ngay"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
