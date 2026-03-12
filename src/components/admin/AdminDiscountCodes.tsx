import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Pencil, Tag } from "lucide-react";

type DiscountCode = {
  id: string;
  code: string;
  discount_percent: number;
  discount_amount: number;
  max_uses: number | null;
  used_count: number;
  min_order_amount: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
};

const formatVND = (n: number) => n.toLocaleString("vi-VN") + "đ";

const AdminDiscountCodes = () => {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DiscountCode | null>(null);
  const [form, setForm] = useState({
    code: "",
    discount_percent: 0,
    discount_amount: 0,
    max_uses: "",
    min_order_amount: 0,
    is_active: true,
    expires_at: "",
  });

  const fetchCodes = async () => {
    setLoading(true);
    const { data } = await supabase.from("discount_codes").select("*").order("created_at", { ascending: false });
    setCodes((data as DiscountCode[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchCodes(); }, []);

  const resetForm = () => {
    setForm({ code: "", discount_percent: 0, discount_amount: 0, max_uses: "", min_order_amount: 0, is_active: true, expires_at: "" });
    setEditing(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.code.trim()) return;
    const payload: any = {
      code: form.code.trim().toUpperCase(),
      discount_percent: form.discount_percent,
      discount_amount: form.discount_amount,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      min_order_amount: form.min_order_amount,
      is_active: form.is_active,
      expires_at: form.expires_at || null,
    };
    if (editing) {
      await supabase.from("discount_codes").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("discount_codes").insert(payload);
    }
    resetForm();
    fetchCodes();
  };

  const handleEdit = (c: DiscountCode) => {
    setForm({
      code: c.code,
      discount_percent: c.discount_percent,
      discount_amount: c.discount_amount,
      max_uses: c.max_uses?.toString() || "",
      min_order_amount: c.min_order_amount,
      is_active: c.is_active,
      expires_at: c.expires_at ? c.expires_at.slice(0, 16) : "",
    });
    setEditing(c);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá mã giảm giá này?")) return;
    await supabase.from("discount_codes").delete().eq("id", id);
    fetchCodes();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-primary neon-text">MÃ GIẢM GIÁ</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 gradient-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Thêm mã
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-6 neon-card animate-slide-up space-y-4">
          <h2 className="font-bold text-foreground">{editing ? "Sửa mã" : "Thêm mã giảm giá mới"}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Mã code</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="VD: GIAM50K"
                className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground focus:outline-none focus:border-primary transition-all text-sm uppercase" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Giảm theo %</label>
              <input type="number" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: Number(e.target.value) })}
                className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground focus:outline-none focus:border-primary transition-all text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Giảm cố định (VNĐ)</label>
              <input type="number" value={form.discount_amount} onChange={(e) => setForm({ ...form, discount_amount: Number(e.target.value) })}
                className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground focus:outline-none focus:border-primary transition-all text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Số lượt dùng tối đa (trống = không giới hạn)</label>
              <input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground focus:outline-none focus:border-primary transition-all text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Đơn tối thiểu (VNĐ)</label>
              <input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: Number(e.target.value) })}
                className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground focus:outline-none focus:border-primary transition-all text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Hết hạn (để trống = vĩnh viễn)</label>
              <input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground focus:outline-none focus:border-primary transition-all text-sm" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
            Kích hoạt
          </label>
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-6 py-2.5 gradient-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
              {editing ? "Cập nhật" : "Thêm"}
            </button>
            <button onClick={resetForm} className="px-6 py-2.5 bg-muted text-muted-foreground rounded-lg text-sm font-semibold hover:bg-border transition-colors">Huỷ</button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden neon-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-semibold text-foreground">Mã</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Giảm</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Đã dùng</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Trạng thái</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Đang tải...</td></tr>
              ) : codes.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Chưa có mã giảm giá</td></tr>
              ) : codes.map((c) => (
                <tr key={c.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-primary">{c.code}</td>
                  <td className="px-4 py-3 text-foreground">
                    {c.discount_percent > 0 && <span>{c.discount_percent}%</span>}
                    {c.discount_percent > 0 && c.discount_amount > 0 && " + "}
                    {c.discount_amount > 0 && <span>{formatVND(c.discount_amount)}</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.used_count}{c.max_uses ? `/${c.max_uses}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${c.is_active ? "bg-primary/10 text-primary border-primary/30" : "bg-muted text-muted-foreground border-border"}`}>
                      {c.is_active ? "Hoạt động" : "Tắt"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(c)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg hover:bg-muted transition-colors text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDiscountCodes;
