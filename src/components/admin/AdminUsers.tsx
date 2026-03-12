import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Profile = {
  id: string;
  user_id: string;
  display_name: string | null;
  balance: number;
  created_at: string;
};

const AdminUsers = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const updateBalance = async (userId: string, amount: number) => {
    const user = users.find((u) => u.user_id === userId);
    if (!user) return;
    const newBalance = user.balance + amount;
    if (newBalance < 0) return;
    await supabase.from("profiles").update({ balance: newBalance }).eq("user_id", userId);
    fetchUsers();
  };

  const filtered = users.filter((u) =>
    (u.display_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const formatVND = (n: number) => n.toLocaleString("vi-VN") + "đ";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-primary neon-text">QUẢN LÝ NGƯỜI DÙNG</h1>
        <span className="text-sm text-muted-foreground">{users.length} người dùng</span>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm người dùng..."
          className="w-full bg-muted border border-border rounded-lg py-2.5 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:neon-border transition-all text-sm"
        />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden neon-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-semibold text-foreground">Tên</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Số dư</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Ngày tạo</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Đang tải...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Không có người dùng</td></tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-foreground font-medium">{u.display_name || "—"}</td>
                    <td className="px-4 py-3 text-primary font-mono font-bold">{formatVND(u.balance)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString("vi-VN")}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            const amt = prompt("Nhập số tiền cộng thêm:");
                            if (amt && !isNaN(Number(amt))) updateBalance(u.user_id, Number(amt));
                          }}
                          className="px-3 py-1.5 text-xs font-semibold gradient-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
                        >
                          + Cộng tiền
                        </button>
                        <button
                          onClick={() => {
                            const amt = prompt("Nhập số tiền trừ:");
                            if (amt && !isNaN(Number(amt))) updateBalance(u.user_id, -Number(amt));
                          }}
                          className="px-3 py-1.5 text-xs font-semibold bg-destructive text-destructive-foreground rounded-md hover:opacity-90 transition-opacity"
                        >
                          - Trừ tiền
                        </button>
                        <button
                          onClick={async () => {
                            const email = prompt("Nhập email người dùng để gửi link đổi mật khẩu:");
                            if (!email) return;
                            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                              redirectTo: window.location.origin + "/dang-nhap",
                            });
                            if (error) toast({ title: "Lỗi", description: error.message, variant: "destructive" });
                            else toast({ title: "✅ Đã gửi link đổi mật khẩu!" });
                          }}
                          className="px-3 py-1.5 text-xs font-semibold bg-muted text-foreground border border-border rounded-md hover:bg-border transition-colors"
                        >
                          <Mail className="w-3 h-3 inline mr-1" />Đổi MK
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
