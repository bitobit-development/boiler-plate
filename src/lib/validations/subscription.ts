import { z } from "zod";

export const subscriptionSchema = z.object({
  name: z.string().min(2, "Please enter your first name"),
  surname: z.string().min(2, "Please enter your last name"),
  email: z.string().email("Please enter a valid email address"),
  mobile: z.string()
    .transform((val) => {
      // Remove all spaces and dashes for consistency
      const cleaned = val.replace(/[\s-]/g, '');

      // If mobile starts with 0, convert to +27 format (South African default)
      if (cleaned.startsWith('0') && cleaned.length === 10) {
        return `+27${cleaned.substring(1)}`;
      }
      // If already has + prefix, keep it
      if (cleaned.startsWith('+')) {
        return cleaned;
      }
      // If no + prefix and doesn't start with 0, assume it needs + prefix
      if (/^\d+$/.test(cleaned)) {
        return `+${cleaned}`;
      }
      // Otherwise return as-is for validation error
      return cleaned;
    })
    .pipe(
      z.string().regex(/^\+\d{7,15}$/, "Please enter a valid international mobile number (e.g., +27821234567, +1234567890)")
    ),
  ageVerified: z.boolean().refine((val) => val === true, {
    message: "You must be 18 or older to subscribe",
  }),
});

export type SubscriptionFormData = z.infer<typeof subscriptionSchema>;