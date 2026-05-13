
## [v1.2.0] - 2025-05-13

### ✨ Features
- **Automatic ATM Transfer Approval**: Users can now automatically approve and credit ATM/wallet transfers instantly
  - New `auto-approve-atm` Supabase function
  - Real-time bonus calculation preview
  - Instant balance credit (no admin needed)
  - Auto-approval stats component for admin monitoring
  
### 🔧 Infrastructure
- Added `auto_approved` and `original_amount` columns to track auto-approved transfers
- New Supabase function with bonus calculation logic
- Auto-approval tracking in database schema

### 📊 Admin Features  
- AdminAutoApprovalStats component to monitor auto-approval metrics
- Track total auto-approved transactions and amounts
- Daily vs total statistics

### 🎯 Benefits
- Faster user experience (instant credit)
- Reduced admin workload
- Transparent bonus calculation
- Better user engagement

For detailed documentation, see: AUTO_APPROVE_ATM_FEATURE.md
