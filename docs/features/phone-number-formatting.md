# Phone Number Formatting & Validation

## Overview

This feature ensures phone numbers are captured and stored in the correct E.164 international format, regardless of how users input them. This is critical for SMS delivery, OTP verification, and international compatibility.

## Problem Statement

Users input phone numbers in various formats:
- With leading zeros: `0505489909` (Israel)
- Without leading zeros: `505489909`
- With formatting: `050-548-9909`
- International format: `+972505489909`

**Challenge**: SMS services require E.164 format (`+[country_code][subscriber_number]`) for reliable delivery. Incorrect formatting causes:
- Failed OTP delivery
- Malformed database records
- User frustration and dropped registrations

## E.164 Format Standard

E.164 is the international telephone numbering plan standard:

```
+[country_code][subscriber_number]
```

**Examples**:
- Israel: `+972505489909` (not `+9720505489909`)
- US: `+14155552671` (not `+014155552671`)
- UK: `+447911123456` (not `+4407911123456`)

### Leading Zero Rules

Many countries use a leading `0` for domestic dialing that must be removed for international format:

| Country | Domestic | International | Remove Leading 0 |
|---------|----------|---------------|------------------|
| Israel | 050-548-9909 | +972505489909 | ✓ |
| South Africa | 082 123 4567 | +27821234567 | ✓ |
| UK | 07911 123456 | +447911123456 | ✓ |
| France | 06 12 34 56 78 | +33612345678 | ✓ |
| Germany | 0151 23456789 | +4915123456789 | ✓ |
| Australia | 04 1234 5678 | +61412345678 | ✓ |

**Important**: US/Canada do NOT use leading zeros.

## Supported Countries (Leading Zero Removal)

The system automatically removes leading zeros for these 14 countries:

1. **South Africa** (+27)
2. **Israel** (+972)
3. **United Kingdom** (+44)
4. **France** (+33)
5. **Italy** (+39)
6. **Germany** (+49)
7. **Netherlands** (+31)
8. **Belgium** (+32)
9. **Switzerland** (+41)
10. **Austria** (+43)
11. **Japan** (+81)
12. **South Korea** (+82)
13. **Australia** (+61)
14. **New Zealand** (+64)

## Technical Implementation

### Client-Side Component

**File**: `src/components/ui/phone-input.tsx`

#### Country Selection with shadcn/ui Best Practices

```tsx
<Popover open={isOpen} onOpenChange={setIsOpen}>
  <PopoverTrigger asChild>
    <Button
      variant="outline"
      role="combobox"
      aria-expanded={isOpen}
      className="w-[140px] justify-between bg-[#1a1a1a] border-gray-700"
    >
      <span className="flex items-center">
        <span className="mr-2">{selectedCountry.flag}</span>
        <span>{selectedCountry.code}</span>
      </span>
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-[300px] p-0 bg-[#1a1a1a] border-gray-700">
    <Command className="bg-[#1a1a1a]">
      <CommandInput
        placeholder="Search country..."
        className="text-white"
      />
      <CommandList className="max-h-[300px]">
        <CommandEmpty className="text-gray-400">No country found.</CommandEmpty>
        <CommandGroup>
          {COUNTRIES.map((country) => (
            <CommandItem
              key={country.code + country.name}
              value={`${country.name} ${country.code}`}
              onSelect={() => handleCountrySelect(country)}
              onClick={() => handleCountrySelect(country)}
              className="text-white hover:bg-gray-700 cursor-pointer"
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  selectedCountry.name === country.name
                    ? "opacity-100"
                    : "opacity-0"
                )}
              />
              <span className="mr-2">{country.flag}</span>
              <span className="flex-1">{country.name}</span>
              <span className="text-gray-400">{country.code}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

**Key shadcn/ui Best Practices**:
1. ✓ Both `onSelect` (keyboard) and `onClick` (mouse) handlers
2. ✓ Proper ARIA attributes (`role="combobox"`, `aria-expanded`)
3. ✓ Check mark uses `selectedCountry.name` to handle duplicate dial codes
4. ✓ Searchable with `CommandInput`
5. ✓ Accessible with keyboard navigation

#### Leading Zero Removal Logic

```tsx
const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  let input = e.target.value.replace(/\D/g, ""); // Remove non-digits

  // Remove leading zero for specific countries
  if (input.startsWith("0")) {
    const countriesWithLeadingZero = [
      "+27", "+972", "+44", "+33", "+39", "+49", "+31", "+32",
      "+41", "+43", "+81", "+82", "+61", "+64"
    ];

    if (countriesWithLeadingZero.includes(selectedCountry.code)) {
      input = input.slice(1); // Remove the leading 0
    }
  }

  setLocalValue(input);

  // Construct full E.164 number
  const fullNumber = `${selectedCountry.code}${input}`;
  onChange?.(fullNumber);
};
```

#### Handling Duplicate Country Codes

Some countries share dial codes (NANP, Russia/Kazakhstan):

```tsx
// NANP (+1) - Specific area codes come BEFORE generic +1
{ name: "Bahamas", code: "+1242", flag: "🇧🇸" },
{ name: "Barbados", code: "+1246", flag: "🇧🇧" },
// ... more NANP countries with specific codes ...

// Generic +1 countries come LAST
{ name: "United States", code: "+1", flag: "🇺🇸" },
{ name: "Canada", code: "+1", flag: "🇨🇦" },

// Russia comes before Kazakhstan (more common)
{ name: "Russia", code: "+7", flag: "🇷🇺" },
{ name: "Kazakhstan", code: "+7", flag: "🇰🇿" },
```

### Server-Side Validation

**File**: `src/lib/utils/phone-validation.ts` (planned)

```typescript
import parsePhoneNumber, { isValidPhoneNumber } from 'libphonenumber-js';

export interface PhoneValidationResult {
  isValid: boolean;
  e164: string | null;
  country: string | null;
  error?: string;
}

export function validateAndFormatPhone(
  phoneInput: string,
  countryCode: string
): PhoneValidationResult {
  try {
    // Remove all non-digits
    let cleaned = phoneInput.replace(/\D/g, '');

    // Handle leading zero removal for specific countries
    const countriesWithLeadingZero = [
      '27', '972', '44', '33', '39', '49', '31', '32',
      '41', '43', '81', '82', '61', '64'
    ];

    const numericCountryCode = countryCode.replace('+', '');

    if (cleaned.startsWith('0') &&
        countriesWithLeadingZero.includes(numericCountryCode)) {
      cleaned = cleaned.slice(1);
    }

    // Construct E.164 format
    const e164Number = `+${numericCountryCode}${cleaned}`;

    // Validate using libphonenumber-js
    if (!isValidPhoneNumber(e164Number)) {
      return {
        isValid: false,
        e164: null,
        country: null,
        error: 'Invalid phone number format'
      };
    }

    const parsed = parsePhoneNumber(e164Number);

    return {
      isValid: true,
      e164: parsed.number,
      country: parsed.country || null,
    };
  } catch (error) {
    return {
      isValid: false,
      e164: null,
      country: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

### Subscribe Action Integration

**File**: `src/app/actions/subscribe.ts` (planned enhancement)

```typescript
import { validateAndFormatPhone } from '@/lib/utils/phone-validation';

export async function subscribe(formData: FormData) {
  const mobile = formData.get('mobile') as string;
  const countryCode = formData.get('countryCode') as string;

  // Validate and format phone number
  const validation = validateAndFormatPhone(mobile, countryCode);

  if (!validation.isValid) {
    return {
      success: false,
      error: validation.error || 'Invalid phone number'
    };
  }

  // Use E.164 format for database storage
  const result = await db.insert(subscribers).values({
    mobile: validation.e164, // Guaranteed E.164 format
    // ... other fields
  });

  // Send OTP with correctly formatted number
  await sendOTP(validation.e164);

  return { success: true };
}
```

## Database Cleanup

### Finding Malformed Numbers

**Script**: `scripts/find-malformed-phone-numbers.ts` (planned)

```typescript
import { db } from "../src/lib/db";
import { subscribers } from "../src/lib/db/schema";
import { isValidPhoneNumber } from 'libphonenumber-js';

async function findMalformedNumbers() {
  const allSubscribers = await db
    .select({
      id: subscribers.id,
      mobile: subscribers.mobile,
      name: subscribers.name,
      email: subscribers.email,
    })
    .from(subscribers);

  const malformed = allSubscribers.filter(sub => {
    if (!sub.mobile) return false;

    // Check if it's valid E.164
    if (!isValidPhoneNumber(sub.mobile)) {
      return true;
    }

    // Check for double-zero patterns (e.g., +9720)
    if (sub.mobile.match(/\+\d{2,3}0\d{9}/)) {
      return true;
    }

    return false;
  });

  console.log(`Found ${malformed.length} malformed numbers:`);
  malformed.forEach(sub => {
    console.log({
      id: sub.id,
      mobile: sub.mobile,
      name: sub.name,
      email: sub.email,
    });
  });
}
```

### Fixing Malformed Numbers

**Script**: `scripts/fix-malformed-phone-numbers.ts` (planned)

```typescript
import { db } from "../src/lib/db";
import { subscribers } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";
import parsePhoneNumber from 'libphonenumber-js';

async function fixMalformedNumbers() {
  // Example: Fix Israeli numbers with extra zero
  // From: +9720505489909
  // To:   +972505489909

  const israeliSubs = await db
    .select()
    .from(subscribers)
    .where(like(subscribers.mobile, "%9720%"));

  for (const sub of israeliSubs) {
    if (sub.mobile.match(/\+9720\d{9}/)) {
      const fixed = sub.mobile.replace('+9720', '+972');

      await db
        .update(subscribers)
        .set({ mobile: fixed })
        .where(eq(subscribers.id, sub.id));

      console.log(`Fixed: ${sub.mobile} → ${fixed}`);
    }
  }
}
```

## Testing Guide

### Manual Testing Checklist

**Israeli Number (+972)**:
- [ ] Input `0505489909` → Should format to `+972505489909`
- [ ] Input `505489909` → Should format to `+972505489909`
- [ ] Input `050-548-9909` → Should format to `+972505489909`
- [ ] Verify OTP SMS is received

**US Number (+1)**:
- [ ] Input `4155552671` → Should format to `+14155552671`
- [ ] Input `(415) 555-2671` → Should format to `+14155552671`
- [ ] Leading zero should NOT be removed

**UK Number (+44)**:
- [ ] Input `07911123456` → Should format to `+447911123456`
- [ ] Input `7911123456` → Should format to `+447911123456`

### Automated Testing

**File**: `src/lib/utils/__tests__/phone-validation.test.ts` (planned)

```typescript
import { validateAndFormatPhone } from '../phone-validation';

describe('Phone Validation', () => {
  describe('Israeli Numbers (+972)', () => {
    it('removes leading zero from local format', () => {
      const result = validateAndFormatPhone('0505489909', '+972');
      expect(result.isValid).toBe(true);
      expect(result.e164).toBe('+972505489909');
    });

    it('handles input without leading zero', () => {
      const result = validateAndFormatPhone('505489909', '+972');
      expect(result.isValid).toBe(true);
      expect(result.e164).toBe('+972505489909');
    });
  });

  describe('US Numbers (+1)', () => {
    it('does NOT remove leading zero', () => {
      const result = validateAndFormatPhone('4155552671', '+1');
      expect(result.isValid).toBe(true);
      expect(result.e164).toBe('+14155552671');
    });
  });

  describe('Duplicate Country Codes', () => {
    it('correctly validates US and Canada (+1)', () => {
      const us = validateAndFormatPhone('4155552671', '+1');
      const canada = validateAndFormatPhone('4165551234', '+1');

      expect(us.isValid).toBe(true);
      expect(canada.isValid).toBe(true);
    });
  });
});
```

## Troubleshooting

### Common Issues

**Issue**: OTP not received
- **Check**: Database has correct E.164 format (`+[country][number]`)
- **Fix**: Run `scripts/fix-malformed-phone-numbers.ts`

**Issue**: Wrong flag displayed after selection
- **Cause**: Check mark compared `code` instead of `name` for duplicate dial codes
- **Fix**: Use `selectedCountry.name === country.name` (lines 353 in phone-input.tsx)

**Issue**: Can search but can't click to select country
- **Cause**: Missing `onClick` handler on CommandItem
- **Fix**: Added both `onSelect` and `onClick` handlers (lines 348-350)

**Issue**: Leading zero not removed
- **Check**: Country code is in `countriesWithLeadingZero` array
- **Add**: Update array in both client and server validation utilities

## Future Enhancements

### Phase 1: Popular Countries Section ⏳
- Add "Popular" section at top of country list
- Customize based on user's location/IP
- Quick access to US, UK, Canada, Australia

### Phase 2: Visual Feedback ⏳
- Show real-time E.164 preview below input
- Display example format for selected country
- Visual indicator when number is valid

### Phase 3: Smart Detection ⏳
- Auto-detect country from partial input
- Suggest country based on number pattern
- Handle country code in input field

### Phase 4: Enhanced Validation ⏳
- Add `libphonenumber-js` for robust validation
- Validate number length for each country
- Detect mobile vs landline numbers

## Related Files

- `src/components/ui/phone-input.tsx` - Main component (lines 298-320 for leading zero logic)
- `src/app/actions/subscribe.ts` - Server action for subscription
- `src/lib/db/schema.ts` - Database schema (subscribers.mobile field)
- `scripts/delete-israeli-test-subscriber.ts` - Example cleanup script
- `scripts/find-israeli-subscribers.ts` - Example search script

## References

- [E.164 Standard](https://en.wikipedia.org/wiki/E.164)
- [libphonenumber-js](https://www.npmjs.com/package/libphonenumber-js)
- [shadcn/ui Command Component](https://ui.shadcn.com/docs/components/command)
- [shadcn/ui Popover Component](https://ui.shadcn.com/docs/components/popover)
- [NANP (North American Numbering Plan)](https://en.wikipedia.org/wiki/North_American_Numbering_Plan)

---

**Last Updated**: 2025-10-06
**Version**: 1.0
**Status**: ✓ Client-side implemented | ⏳ Server-side pending
