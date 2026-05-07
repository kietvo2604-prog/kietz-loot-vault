# SQL Data File Update Summary

## Overview
File `data.sql` has been successfully updated with your user credentials and conflict prevention.

## Changes Made

### 1. User ID Replacement
- **New User ID**: `0337b983-ad78-4468-95e3-a71f71ec65db`
- **Old User IDs Replaced**: 5 different user IDs
  - `1dd905b0-091b-4a55-af6d-942f4c899821`
  - `a1100216-a53c-495f-8282-03609d746014`
  - `cc862fac-84ce-478d-847f-e358b11c4125`
  - `43185243-29ae-4869-8599-a2295a2c1ea9`
  - `2e1c82f7-aef4-4c0e-b159-30dac7d67c5b`
- **Total Occurrences Replaced**: 623

### 2. Conflict Resolution
- **Added**: `ON CONFLICT DO NOTHING` clause to all INSERT statements
- **Total INSERT Statements Updated**: 2,886
- **Purpose**: Prevents errors when trying to insert duplicate records (useful for idempotent operations)

## File Details
- **File Size**: 959 KB
- **Total Lines**: 3,097
- **Location**: `/vercel/share/v0-project/data.sql`

## Usage

To import this data into your Supabase database:

```bash
# Option 1: Using psql with Supabase connection
psql "postgresql://[user]:[password]@[host]/postgres" -f data.sql

# Option 2: Via Supabase SQL Editor
# Copy-paste the contents of data.sql into Supabase's SQL Editor and execute

# Option 3: Via Supabase CLI
supabase db push --file data.sql
```

## Database Tables Included

The file contains data for:
- `categories` - Product categories
- `ctv_assignments` - CTV (content creator) assignments
- `discount_codes` - Discount/promo codes
- `orders` - Customer orders
- `product_accounts` - Product account details
- `products` - Product listings
- `profiles` - User profiles
- `shop_settings` - Shop configuration
- `topup_requests` - Top-up requests
- `user_roles` - User role assignments

## Safety Features

✅ **Duplicate Prevention**: All INSERT statements now have `ON CONFLICT DO NOTHING`, so running this script multiple times is safe

✅ **User Isolation**: All data is now associated with your user ID (`0337b983-ad78-4468-95e3-a71f71ec65db`)

✅ **Data Integrity**: No schema changes were made, only data values updated

## Next Steps

1. Back up your Supabase database before importing
2. Review the data file to ensure all values look correct
3. Execute the SQL file in your Supabase SQL Editor
4. Verify that data was imported correctly by checking row counts in each table

---
**Generated**: May 7, 2026
**User ID**: `0337b983-ad78-4468-95e3-a71f71ec65db`
