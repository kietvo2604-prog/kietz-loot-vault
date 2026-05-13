import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Save, Loader2, FileText, Image as ImageIcon, Bold, Italic, Type, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ImagePasteUpload from "@/components/ImagePasteUpload";

type ShopSetting = {
  key: string;
  value: string;
};

const AdminShopSettings = () => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("shop_settings").select("*").then(({ data }) => {
      const map: Record<string, string> = {};
      (data || []).forEach((s: ShopSetting) => { map[s.key] = s.value; });
      setTitle(map["shop_title"] || "");
      setLogoUrl(map["shop_logo_url"] || "");
      if (map["shop_description"]) {
        setDescription(map["shop_description"]);
      } else {
        const lines = [map["shop_subtitle_1"], map["shop_subtitle_2"], map["shop_subtitle_3"]].filter(Boolean);
        setDescription(lines.join("\n"));
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    await Promise.all([
      supabase.from("shop_settings").upsert({ key: "shop_title", value: title, updated_at: now }, { onConflict: "key" }),
      supabase.from("shop_settings").upsert({ key: "shop_description", value: description, updated_at: now }, { onConflict: "key" }),
      supabase.from("shop_settings").upsert({ key: "shop_logo_url", value: logoUrl, updated_at: now }, { onConflict: "key" }),
    ]);
    setSaving(false);
    toast({ title: "✅ Đã lưu cài đặt shop!" });
  };

  // Insert HTML wrapper around current selection in textarea
  const wrap = (before: string, after: string) => {
    const ta = document.getElementById("shop-desc-ta") as HTMLTextAreaElement | null;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = description.slice(start, end) || "text";
    const newVal = description.slice(0, start) + before + sel + after + description.slice(end);
    setDescription(newVal);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + before.length, start + before.length + sel.length); }, 0);
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-primary flex items-center gap-2">
        <FileText className="w-6 h-6" /> MÔ TẢ SHOP & LOGO
      </h1>

      <div className="bg-card border border-border rounded-xl p-4 sm:p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4" /> Logo Shop
          </label>
          <ImagePasteUpload value={logoUrl} onChange={setLogoUrl} placeholder="Dán ảnh logo hoặc nhập link..." label="" />
          <p className="text-xs text-muted-foreground mt-1">Logo này sẽ thay thế icon mặc định ở header.</p>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Tiêu đề shop</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-muted border border-border rounded-lg py-2.5 px-4 text-foreground focus:outline-none focus:border-primary transition-all text-sm" />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Mô tả (hỗ trợ HTML — dùng các nút bên dưới để định dạng)</label>
          <div className="flex flex-wrap gap-1 mb-2 p-2 bg-muted border border-border rounded-lg">
            <button type="button" onClick={() => wrap("<b>", "</b>")} className="p-1.5 rounded hover:bg-card border border-border text-foreground" title="Đậm"><Bold className="w-4 h-4" /></button>
            <button type="button" onClick={() => wrap("<i>", "</i>")} className="p-1.5 rounded hover:bg-card border border-border text-foreground" title="Nghiêng"><Italic className="w-4 h-4" /></button>
            <button type="button" onClick={() => wrap('<span style="font-size:20px">', '</span>')} className="px-2 py-1 rounded hover:bg-card border border-border text-foreground text-xs flex items-center gap-1"><Type className="w-3 h-3" /> Lớn</button>
            <button type="button" onClick={() => wrap('<span style="font-size:14px">', '</span>')} className="px-2 py-1 rounded hover:bg-card border border-border text-foreground text-xs">Nhỏ</button>
            <label className="px-2 py-1 rounded hover:bg-card border border-border text-foreground text-xs flex items-center gap-1 cursor-pointer">
              <Palette className="w-3 h-3" /> Màu
              <input type="color" onChange={(e) => wrap(`<span style="color:${e.target.value}">`, "</span>")} className="w-4 h-4 border-0 p-0 cursor-pointer" />
            </label>
            <button type="button" onClick={() => wrap('<span style="color:#eab308;font-weight:700">', '</span>')} className="px-2 py-1 rounded hover:bg-card border border-border text-yellow-500 text-xs font-bold">Vàng nhấn</button>
            <button type="button" onClick={() => wrap('<span style="color:hsl(var(--primary));font-weight:700">', '</span>')} className="px-2 py-1 rounded hover:bg-card border border-border text-primary text-xs font-bold">Xanh</button>
          </div>
          <textarea id="shop-desc-ta" value={description} onChange={(e) => setDescription(e.target.value)} rows={6}
            placeholder={"🔥 Giao dịch tự động 24/7\n🛡️ Bảo mật tuyệt đối\n💰 Giá cả học sinh"}
            className="w-full bg-muted border border-border rounded-lg py-3 px-4 text-foreground focus:outline-none focus:border-primary transition-all text-sm leading-relaxed resize-y font-mono" />
        </div>

        <div className="bg-muted border border-border rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Xem trước:</p>
          <p className="text-lg font-bold text-foreground">{title}</p>
          <div className="mt-2 space-y-1 text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: description.replace(/\n/g, "<br/>") }} />
        </div>

        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 gradient-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>
    </div>
  );
};

export default AdminShopSettings;
