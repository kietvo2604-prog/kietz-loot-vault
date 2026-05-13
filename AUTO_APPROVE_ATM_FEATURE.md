# Tính Năng Tự Động Duyệt ATM (Auto-Approve ATM Feature)

## Tổng Quan

Tính năng này cho phép người dùng **tự động phê duyệt** các giao dịch chuyển khoản ATM/Ví điện tử **ngay lập tức**, mà không cần chờ quản trị viên phê duyệt thủ công.

## Cách Hoạt Động

### 1. Luồng Người Dùng (User Flow)

```
Người dùng chuyển khoản ATM
    ↓
Hệ thống tạo topup_request (status: pending)
    ↓
Người dùng nhìn thấy thông báo "Đã chuyển khoản?"
    ↓
Nhập số tiền đã chuyển
    ↓
Bấm "Phê duyệt tự động → Cộng tiền ngay"
    ↓
Gọi function 'auto-approve-atm'
    ↓
Hệ thống tính bonus (< 50k: +10%, >= 50k: +5%)
    ↓
Cập nhật balance + Đánh dấu auto_approved = true
    ↓
Hiển thị thông báo thành công
```

### 2. Các Thành Phần

#### A. Supabase Function: `auto-approve-atm`
**Tệp:** `supabase/functions/auto-approve-atm/index.ts`

**Chức năng:**
- Nhận ID của topup_request và số tiền chuyển
- Kiểm tra xem request có ở trạng thái pending không
- Tính bonus: < 50k → +10%, >= 50k → +5%
- Cập nhật topup_request với status=approved, auto_approved=true
- Cộng tiền vào balance của người dùng
- Trả về kết quả thành công/thất bại

**Tham số đầu vào:**
```typescript
{
  topup_request_id: string,      // UUID của topup_request
  transfer_amount: number         // Số tiền chuyển (ví dụ: 50000)
}
```

**Phản hồi:**
```typescript
{
  success: boolean,
  topup_request_id: string,
  user: string,
  original_amount: number,
  bonus_rate: string,             // "10%" hoặc "5%"
  bonus_amount: number,
  credit_amount: number,          // Số tiền thực tế nhận được
  new_balance: number
}
```

#### B. UI Component: TopUp.tsx (ATM Tab)

**Vị trí:** `src/pages/TopUp.tsx` - ATM/Ví Điện Tử tab

**Thêm những phần tử mới:**
- Input field để nhập số tiền chuyển
- Preview bonus calculation real-time
- Button "Phê duyệt tự động → Cộng tiền ngay"
- Loading state + error handling

**States mới:**
```typescript
const [atmAmount, setAtmAmount] = useState("");
const [approveLoading, setApproveLoading] = useState(false);
const [pendingAtmRequest, setPendingAtmRequest] = useState<TopupRequest | null>(null);
```

**Hàm mới:**
```typescript
const handleAutoApproveAtm = async () => {
  // Validate input
  // Call supabase.functions.invoke("auto-approve-atm", ...)
  // Handle success/error
  // Refresh topups list
}
```

#### C. Database Schema

**Migrations:** `supabase/migrations/20250513_add_auto_approval_tracking.sql`

**Cột mới trong topup_requests:**
```sql
- auto_approved BOOLEAN DEFAULT false
- original_amount INTEGER
```

**Ý nghĩa:**
- `auto_approved`: Đánh dấu request này được phê duyệt tự động hay không
- `original_amount`: Số tiền gốc trước khi cộng bonus (dùng cho ATM transfers)

#### D. Admin Stats Component

**Tệp:** `src/components/admin/AdminAutoApprovalStats.tsx`

**Chức năng:**
- Hiển thị số lượng giao dịch tự động phê duyệt
- Tính tổng tiền từ tất cả auto-approve
- Thống kê hôm nay vs tổng cộng
- Giám sát hiệu suất của tính năng

## Ưu Điểm

1. **Instant Credit** - Người dùng nhận tiền ngay lập tức
2. **No Admin Wait** - Không cần chờ admin phê duyệt
3. **Auto Bonus** - Hệ thống tự động tính toán bonus
4. **Tracking** - Quản lý có thể theo dõi tất cả auto-approvals
5. **Flexible** - Có thể disable tính năng nếu cần

## Cách Sử Dụng

### Từ Phía Người Dùng:

1. Vào tab "ATM / Ví Điện Tử"
2. Sao chép nội dung chuyển khoản
3. Chuyển tiền qua ATM/ZaloPay
4. Quay lại app, tìm section "Đã chuyển khoản?"
5. Nhập số tiền đã chuyển
6. Bấm "Phê duyệt tự động → Cộng tiền ngay"
7. Chờ xử lý (mất vài giây)
8. Nhận thông báo thành công + tiền được cộng

### Từ Phía Admin:

1. Vào Admin Dashboard
2. Xem AdminAutoApprovalStats component
3. Theo dõi:
   - Tổng số giao dịch auto-approved
   - Tổng tiền từ auto-approve
   - Thống kê hôm nay

## Điều Kiện & Ràng Buộc

### Khi Auto-Approve Thành Công:
- ✅ topup_request phải có status = "pending"
- ✅ transfer_amount phải > 0
- ✅ Người dùng phải tồn tại
- ✅ Tiền được cộng vào balance ngay

### Khi Bị Lỗi:
- ❌ Request đã được xử lý (status ≠ pending) → Lỗi
- ❌ Số tiền không hợp lệ → Lỗi
- ❌ Người dùng không tồn tại → Lỗi

## Bonus Calculation

```
Nếu số tiền < 50,000đ:
  bonus = 10%
  credit = amount + (amount * 0.10)

Nếu số tiền >= 50,000đ:
  bonus = 5%
  credit = amount + (amount * 0.05)

Ví dụ:
  - Chuyển 30,000đ → Nhận 33,000đ (+10%)
  - Chuyển 100,000đ → Nhận 105,000đ (+5%)
```

## Testing

### Cách Test Tính Năng:

1. **Tạo Pending Request:**
   ```typescript
   const { data } = await supabase.from("topup_requests").insert({
     user_id: user.id,
     amount: 50000,
     method: "Chuyển khoản ATM/ZaloPay",
     status: "pending"
   }).select("id").single();
   ```

2. **Gọi Auto-Approve Function:**
   ```typescript
   const { data, error } = await supabase.functions.invoke("auto-approve-atm", {
     body: { 
       topup_request_id: data.id, 
       transfer_amount: 50000 
     }
   });
   ```

3. **Kiểm tra Kết Quả:**
   - topup_requests.status = "approved" ✅
   - topup_requests.auto_approved = true ✅
   - profiles.balance được cộng ✅
   - Trả về success: true ✅

## Cải Tiến Tương Lai

1. **Webhook Integration** - Tự động trigger khi nhận được callback từ ngân hàng
2. **Ocr Integration** - Nhận diện tự động số tiền từ ảnh chuyển khoản
3. **Rate Limiting** - Giới hạn số lần approve trong 1 ngày
4. **Amount Verification** - Kiểm tra match giữa số tiền chuyển và expected
5. **Fraud Detection** - Phát hiện giao dịch bất thường

## Troubleshooting

### Problem: "Không có yêu cầu chuyển khoản chờ xử lý"
- **Nguyên nhân**: Người dùng không có pending ATM request
- **Giải pháp**: Tạo request chuyển khoản trước, hoặc chuyển khoản thực tế

### Problem: "Lỗi không xác định"
- **Nguyên nhân**: Function gặp lỗi server
- **Giải pháp**: Kiểm tra logs Supabase, validate input

### Problem: Tiền không được cộng mặc dù phê duyệt thành công
- **Nguyên nhân**: Database transaction failed
- **Giải pháp**: Kiểm tra RLS policies, user permissions

## Liên Hệ & Support

Nếu có vấn đề với tính năng này, vui lòng:
1. Kiểm tra browser console logs
2. Kiểm tra Supabase function logs
3. Kiểm tra database RLS policies
4. Contact admin với chi tiết lỗi
