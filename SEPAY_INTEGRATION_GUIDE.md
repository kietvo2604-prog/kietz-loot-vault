# Sepay Integration Guide

## Overview

Sepay QR code generation is now fully integrated into ShopKietZ. When users sign up, they automatically get a dynamic MB Bank QR code generated via Sepay API.

## Configuration

### Sepay Account Details
```
Account ID: 58848
API Key: L8RMFVLQ3E1Z0ESVN8BIUCMFSPQJXVBDOWBAMDJWG24A9GP3QHY0BKXZUHTIPWOL
```

### MB Bank Details
```
Bank: MB Bank
Account Number: 0987672604
Account Holder: VO ANH KIET
```

## How It Works

### 1. **Signup Flow**
When a user creates a new account:
- User completes signup in `/auth`
- Auth system creates user and profile with transfer_code
- `auto-generate-qr` function is called after signup
- Sepay API generates MB Bank QR code
- QR code URL is stored in database (`bank_qr_code` column)

### 2. **TopUp Page**
When user visits `/topup`:
- System checks if `bank_qr_code` exists in database
- If exists: Display Sepay QR code from database
- If not: Trigger on-demand QR generation
- QR code shows with "Sepay QR" badge
- Transfer code is displayed below QR code

### 3. **Database Schema**
New columns added to `profiles` table:
```sql
- bank_qr_code: TEXT (URL of generated QR code)
- bank_account: VARCHAR(20) (e.g., "0987672604")
- bank_name: VARCHAR(10) (default: "MB")
- account_holder: VARCHAR(100) (e.g., "VO ANH KIET")
- qr_generated_at: TIMESTAMP (when QR was generated)
```

## Files Modified/Created

### New Files
- `/supabase/functions/generate-sepay-qr/index.ts` - Sepay QR generation function
- `/supabase/migrations/20250513_add_sepay_qr_columns.sql` - Database schema updates

### Modified Files
- `/src/pages/Auth.tsx` - Auto-trigger QR generation on signup
- `/src/pages/TopUp.tsx` - Display Sepay QR code, remove ZaloPay

## API Endpoint

The Sepay QR generation function is called via:
```typescript
supabase.functions.invoke("generate-sepay-qr", {
  body: {
    user_id: "user-uuid",
    transfer_code: "KIETZ_ABC123...",
    amount: 50000 // optional
  }
})
```

### Response
```json
{
  "success": true,
  "qr_url": "https://api.sepay.vn/...",
  "bank": "MB",
  "account": "0987672604",
  "account_name": "VO ANH KIET",
  "transfer_code": "KIETZ_ABC123..."
}
```

## Sepay QR URL Format

The function generates Sepay QR codes using:
```
https://api.sepay.vn/api/qrcode/generate?
  bank=MB&
  account=0987672604&
  accountName=VO ANH KIET&
  desc=TRANSFER_CODE&
  amount=AMOUNT (optional)
```

## Deployment Steps

1. **Apply Database Migration**
   ```bash
   # In Supabase console or via CLI:
   supabase db reset  # or supabase migration up
   ```

2. **Deploy Sepay Function**
   ```bash
   # Function is deployed via Vercel/Supabase
   supabase functions deploy generate-sepay-qr
   ```

3. **Set Environment Variables** (if needed)
   - Sepay API key is embedded in the function
   - No additional env vars needed for now

4. **Test**
   - Create new account at `/auth`
   - Wait for QR code generation
   - Visit `/topup` to see MB Bank Sepay QR
   - Verify QR code is displayed correctly

## Troubleshooting

### QR Code Not Generated
1. Check browser console for errors
2. Verify Sepay API key is correct
3. Check Supabase function logs
4. Ensure user has valid transfer_code

### Sepay API Error
- Check if Sepay API is responding
- Verify Account ID: 58848
- Verify API Key is valid
- Check network request in browser DevTools

### QR Code URL Invalid
- Ensure Sepay API returns valid QR image URL
- Check if image URL is accessible
- Test URL directly in browser

## Manual QR Generation

To manually generate QR for existing user:
```typescript
const { data } = await supabase.functions.invoke("generate-sepay-qr", {
  body: {
    user_id: "user-id",
    transfer_code: "KIETZ_...",
  }
});
```

## Features

✅ Automatic QR generation on signup
✅ Dynamic QR code display in TopUp
✅ Transfer code shown alongside QR
✅ Sepay API integration
✅ MB Bank details hardcoded for security
✅ QR loading state indicator
✅ Fallback to on-demand generation

## Security Notes

- Sepay API key is stored in Supabase Edge Functions (secure)
- API key is not exposed to client-side code
- MB Bank account details are hardcoded (immutable)
- All requests go through Supabase Edge Functions layer

## Future Enhancements

- Support multiple bank accounts
- QR code refresh/regenerate button
- QR code history tracking
- Sepay webhook integration for payment verification
- Dynamic transfer code generation

## Related Documentation

- [Sepay API Docs](https://sepay.vn/api)
- [Supabase Functions](https://supabase.com/docs/guides/functions)
- [ShopKietZ TopUp Flow](./AUTO_APPROVE_ATM_FEATURE.md)
