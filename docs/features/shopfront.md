# POS Kiosk System - Feature Documentation

## Overview

The POS Kiosk System is a point-of-sale solution designed for in-store cannabis retail operations. It provides shop staff (tellers) with a streamlined interface for processing sales, verifying customers, and maintaining compliance with regulatory requirements.

## User Credentials

**Shop User Account:**
- Email: `foodtruck@biggbuzz.com`
- Password: `Tsitsi2025!!`
- Role: `shop_user`
- Access: POS Kiosk only (/pos route)

## System Architecture

### Authentication
- Uses existing admin authentication system
- Extended with `shop_user` role
- Session-based JWT tokens
- Device fingerprinting for kiosk security

### Key Features

1. **Split-Screen Interface**
   - Left side (60%): Product catalog with categories
   - Right side (40%): Shopping cart and checkout

2. **Customer Verification**
   - Search by mobile number
   - Select from customer list
   - Status validation before purchase

3. **OTP Activation**
   - Automatic SMS sending for inactive customers
   - 6-digit OTP verification
   - 10-minute expiration window
   - 3 attempt limit

4. **OTP Override**
   - Available when SMS fails
   - Predefined reason selection:
     - SMS delivery failure
     - Network issues
     - Customer phone issues
     - International number
     - Elderly assistance
     - Disability accommodation
     - Technical error
     - Manager approval
   - Complete audit logging

5. **Order Processing**
   - Real-time inventory checking
   - Tax calculation (15% VAT)
   - Multiple payment methods (cash, card, EFT, voucher)
   - Order confirmation with unique number

6. **Audit Trail**
   - All actions logged for compliance
   - Immutable transaction records
   - OTP override justifications
   - Complete order history

## Database Schema

### New Tables

**orders**
- Stores all POS and future online orders
- Links to customers and shop users
- Maintains order items, totals, and status

**otp_override_logs**
- Records all OTP override instances
- Captures reason and explanation
- Links to order and shop user

**kiosk_sessions**
- Tracks active kiosk sessions
- Records device information
- Monitors sales activity

## User Workflows

### Standard Sale Flow
1. Teller logs into POS system
2. Adds products to cart
3. Selects or searches for customer
4. Verifies customer is active
5. Processes payment
6. Confirms order completion

### Customer Activation Flow
1. Customer found but inactive
2. System sends OTP to customer's mobile
3. Customer provides OTP to teller
4. Teller enters OTP
5. System activates customer
6. Sale proceeds normally

### OTP Override Flow
1. OTP sending fails or customer not receiving
2. Teller selects "Override OTP"
3. Chooses reason from dropdown
4. Provides additional explanation if needed
5. System logs override
6. Customer activated for purchase

## Technical Implementation

### Routes
- `/pos` - Main kiosk interface
- `/pos/login` - Shop user authentication
- `/pos/orders` - Order history
- `/pos/settings` - Kiosk configuration

### Components
- `POSLayout` - Theme wrapper with admin styling
- `ProductCatalog` - Product browsing and filtering
- `CartPanel` - Shopping cart management
- `CustomerVerification` - Customer lookup and validation
- `OTPModal` - OTP entry and override interface
- `CheckoutProcess` - Payment and order completion

### Server Actions
- `verifyCustomer()` - Customer status check
- `sendOTP()` - SMS OTP generation
- `validateOTP()` - OTP verification
- `overrideOTP()` - Override with logging
- `processOrder()` - Order creation and inventory update

## Security Measures

1. **Access Control**
   - Shop users restricted to POS routes only
   - No access to admin functions
   - Role-based permissions enforced

2. **Data Protection**
   - Customer PII masked in UI
   - Encrypted OTP storage
   - Secure session management

3. **Audit Compliance**
   - Every action logged with timestamp
   - User identification on all operations
   - Immutable audit trail

## Performance Targets

- Page load: < 2 seconds
- Product search: < 500ms
- Cart updates: < 100ms
- Order processing: < 3 seconds
- OTP sending: < 2 seconds

## Future Enhancements

1. **Offline Mode** - Queue orders when network unavailable
2. **Barcode Scanning** - Quick product addition
3. **Receipt Printing** - Hardware integration
4. **Loyalty Program** - Points and rewards
5. **Multi-location** - Support for multiple stores

## Support & Troubleshooting

### Common Issues

**Customer not receiving OTP:**
- Check mobile number is correct
- Verify network connectivity
- Use OTP override if persistent

**Product not available:**
- Check inventory levels
- Verify product status is active
- Contact admin for stock updates

**Session timeout:**
- Re-login with shop credentials
- Check "Remember me" for extended sessions
- Report frequent timeouts to admin

## Contact

For technical support or feature requests, contact the development team through the admin dashboard support channel.