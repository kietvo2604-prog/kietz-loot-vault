import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ShoppingCart, Loader2, AlertTriangle, Minus, Plus, Tag } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PurchaseConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  price: string;
  numericPrice: number;
  stock: number;
  onConfirm: (quantity: number, discountCode?: string) => void;
  buying: boolean;
}

const formatVND = (n: number) => n.toLocaleString("vi-VN") + "đ";

const PurchaseConfirmDialog = ({ open, onOpenChange, productName, price, numericPrice, stock, onConfirm, buying }: PurchaseConfirmDialogProps) => {
  const [quantity, setQuantity] = useState(1);
  const [discountCode, setDiscountCode] = useState("");
  const [discountInfo, setDiscountInfo] = useState<any>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [codeError, setCodeError] = useState("");

  useEffect(() => {
    if (open) {
      setQuantity(1);
      setDiscountCode("");
      setDiscountInfo(null);
      setCodeError("");
    }
  }, [open]);

  const totalBeforeDiscount = numericPrice * quantity;
  let discountAmount = 0;
  if (discountInfo) {
    if (discountInfo.discount_percent > 0) {
      discountAmount += Math.floor(totalBeforeDiscount * discountInfo.discount_percent / 100);
    }
    if (discountInfo.discount_amount > 0) {
      discountAmount += discountInfo.discount_amount;
    }
  }
  const totalAfterDiscount = Math.max(0, totalBeforeDiscount - discountAmount);

  const handleApplyCode = async () => {
    if (!discountCode.trim()) return;
    setCheckingCode(true);
    setCodeError("");
    setDiscountInfo(null);

    const { data, error } = await supabase
      .from("discount_codes")
      .select("*")
      .eq("code", discountCode.trim().toUpperCase())
      .eq("is_active", true)
      .single();

    setCheckingCode(false);

    if (error || !data) {
      setCodeError("Mã giảm giá không hợp lệ");
      return;
    }

    if (data.max_uses && data.used_count >= data.max_uses) {
      setCodeError("Mã giảm giá đã hết lượt sử dụng");
      return;
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setCodeError("Mã giảm giá đã hết hạn");
      return;
    }

    if (data.min_order_amount > 0 && totalBeforeDiscount < data.min_order_amount) {
      setCodeError(`Đơn tối thiểu ${formatVND(data.min_order_amount)}`);
      return;
    }

    setDiscountInfo(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <AlertTriangle className="w-5 h-5 text-accent" />
            Xác nhận mua hàng
          </DialogTitle>
          <DialogDescription>
            Chọn số lượng và nhập mã giảm giá (nếu có). Số dư sẽ bị trừ ngay lập tức.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="bg-muted border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1 font-semibold">Sản phẩm:</p>
            <p className="text-sm text-foreground font-medium">{productName}</p>
          </div>

          {/* Quantity selector */}
          <div className="bg-muted border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-2 font-semibold">Số lượng: (tối đa {stock})</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-border transition-colors disabled:opacity-50"
              >
                <Minus className="w-4 h-4 text-foreground" />
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(stock, Number(e.target.value) || 1));
                  setQuantity(v);
                }}
                min={1}
                max={stock}
                className="w-16 text-center bg-card border border-border rounded-lg py-1.5 text-foreground font-bold text-sm focus:outline-none focus:border-primary"
              />
              <button
                onClick={() => setQuantity(Math.min(stock, quantity + 1))}
                disabled={quantity >= stock}
                className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-border transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4 text-foreground" />
              </button>
            </div>
          </div>

          {/* Discount code */}
          <div className="bg-muted border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-2 font-semibold flex items-center gap-1">
              <Tag className="w-3 h-3" /> Mã giảm giá
            </p>
            <div className="flex gap-2">
              <input
                value={discountCode}
                onChange={(e) => { setDiscountCode(e.target.value); setDiscountInfo(null); setCodeError(""); }}
                placeholder="Nhập mã..."
                className="flex-1 bg-card border border-border rounded-lg py-2 px-3 text-foreground text-sm uppercase focus:outline-none focus:border-primary"
              />
              <button
                onClick={handleApplyCode}
                disabled={checkingCode || !discountCode.trim()}
                className="px-3 py-2 gradient-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {checkingCode ? "..." : "Áp dụng"}
              </button>
            </div>
            {codeError && <p className="text-xs text-destructive mt-1">{codeError}</p>}
            {discountInfo && (
              <p className="text-xs text-primary mt-1 font-semibold">
                ✅ Giảm {discountInfo.discount_percent > 0 ? `${discountInfo.discount_percent}%` : ""}{discountInfo.discount_percent > 0 && discountInfo.discount_amount > 0 ? " + " : ""}{discountInfo.discount_amount > 0 ? formatVND(discountInfo.discount_amount) : ""}
              </p>
            )}
          </div>

          {/* Total */}
          <div className="bg-muted border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1 font-semibold">Tổng tiền:</p>
            {discountAmount > 0 ? (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground line-through">{formatVND(totalBeforeDiscount)}</p>
                <p className="text-lg font-display font-bold text-primary">{formatVND(totalAfterDiscount)}</p>
                <p className="text-xs text-primary">Tiết kiệm {formatVND(discountAmount)}</p>
              </div>
            ) : (
              <p className="text-lg font-display font-bold text-destructive">{formatVND(totalBeforeDiscount)}</p>
            )}
          </div>
        </div>
        <DialogFooter className="flex gap-2 sm:gap-2">
          <button
            onClick={() => onOpenChange(false)}
            disabled={buying}
            className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-semibold hover:bg-border transition-colors"
          >
            Huỷ bỏ
          </button>
          <button
            onClick={() => { onConfirm(quantity, discountInfo ? discountCode.trim().toUpperCase() : undefined); }}
            disabled={buying}
            className="flex items-center gap-2 px-4 py-2 gradient-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
            {buying ? "Đang xử lý..." : `Xác nhận mua (${quantity})`}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseConfirmDialog;
