import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, ShoppingBag, Clock, Eye, X, Save, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Order = {
  id: string;
  order_code: string | null;
  user_id: string;
  product_name: string;
  product_category: string;
  price: number;
  status: string;
  account_info: string | null;
  created_at: string;
};

const formatVND = (n: number) => n.toLocaleString("vi-VN") + "đ";

const AdminOrders = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingAccInfo, setEditingAccInfo] = useState(false);
  const [accInfoDraft, setAccInfoDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    setOrders((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const filtered = orders.filter((o) => {
    const q = search.toUpperCase();
    if (!q) return true;
    return (
      (o.order_code && o.order_code.toUpperCase().includes(q)) ||
      o.product_name.toUpperCase().includes(q) ||
      o.user_id.toUpperCase().includes(q)
    );
  });

  const handleSaveAccInfo = async () => {
    if (!selectedOrder) return;
    setSaving(true);
    const { error } = await supabase.from("orders").update({ account_info: accInfoDraft } as any).eq("id", selectedOrder.id);
    setSaving(false);
    if (error) {
      toast({ title: "Lỗi", description: "Không thể cập nhật.", variant: "destructive" });
    } else {
      toast({ title: "✅ Đã cập nhật thông tin tài khoản!" });
      setSelectedOrder({ ...selectedOrder, account_info: accInfoDraft });
      setEditingAccInfo(false);
      fetchOrders();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="font-display text-2xl font-bold text-primary neon-text">QUẢN LÝ ĐƠN HÀNG</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mã đơn VAK, tên sản phẩm..."
            className="bg-muted border border-border rounded-lg py-2.5 pl-10 pr-4 text-foreground text-sm focus:outline-none focus:border-primary focus:neon-border transition-all w-72"
          />
        </div>
      </div>

      {/* Group orders by order_code */}
      <div className="bg-card border border-border rounded-xl overflow-hidden neon-card">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-semibold text-foreground">Mã đơn</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Sản phẩm</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">SL</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Tổng giá</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Thời gian</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Đang tải...</td></tr>
              ) : groupedOrders.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">
                  {search ? "Không tìm thấy đơn hàng" : "Chưa có đơn hàng"}
                </td></tr>
              ) : (
                groupedOrders.map((group) => (
                  <tr key={group.order_code} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-primary text-xs">{group.order_code}</span>
                    </td>
                    <td className="px-4 py-3 text-foreground font-medium max-w-[200px] truncate">{group.orders[0].product_name}</td>
                    <td className="px-4 py-3 text-foreground font-bold">{group.orders.length}</td>
                    <td className="px-4 py-3 text-destructive font-mono font-bold">{formatVND(group.totalPrice)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(group.orders[0].created_at).toLocaleString("vi-VN")}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setSelectedGroup(group); setEditingAccInfo(false); }}
                        className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order detail modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-lg w-full neon-card animate-slide-up space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-foreground">Chi tiết đơn hàng</h2>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-1 rounded hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Mã đơn</span>
                <span className="font-mono font-bold text-primary">{selectedOrder.order_code || "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Sản phẩm</span>
                <span className="font-medium text-foreground text-right max-w-[60%] truncate">{selectedOrder.product_name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Danh mục</span>
                <span className="text-foreground">{selectedOrder.product_category}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Giá</span>
                <span className="font-bold text-destructive">{formatVND(selectedOrder.price)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-xs text-muted-foreground">{selectedOrder.user_id.slice(0, 12)}...</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Thời gian</span>
                <span className="text-xs text-muted-foreground">{new Date(selectedOrder.created_at).toLocaleString("vi-VN")}</span>
              </div>
            </div>

            {/* Account info - editable */}
            <div className="bg-muted border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-semibold">Thông tin tài khoản:</p>
                {!editingAccInfo && (
                  <button onClick={() => { setEditingAccInfo(true); setAccInfoDraft(selectedOrder.account_info || ""); }}
                    className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <Pencil className="w-3 h-3" /> Sửa
                  </button>
                )}
              </div>
              {editingAccInfo ? (
                <div className="space-y-2">
                  <textarea
                    value={accInfoDraft}
                    onChange={(e) => setAccInfoDraft(e.target.value)}
                    rows={4}
                    placeholder="VD: username:password"
                    className="w-full bg-background border border-border rounded-lg py-2 px-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary transition-all resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSaveAccInfo} disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 gradient-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50">
                      <Save className="w-3 h-3" /> {saving ? "Đang lưu..." : "Lưu"}
                    </button>
                    <button onClick={() => setEditingAccInfo(false)}
                      className="px-3 py-1.5 bg-background text-muted-foreground rounded-lg text-xs font-semibold hover:bg-border transition-colors">
                      Huỷ
                    </button>
                  </div>
                </div>
              ) : (
                selectedOrder.account_info ? (
                  <pre className="text-sm font-mono text-foreground whitespace-pre-wrap break-all">{selectedOrder.account_info}</pre>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Chưa có thông tin. Bấm "Sửa" để thêm.</p>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
