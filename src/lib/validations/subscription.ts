import { z } from "zod";

export const subscriptionSchema = z.object({
  name: z.string().min(2, "Please enter your first name"),
  surname: z.string().min(2, "Please enter your last name"),
  email: z.string().email("Please enter a valid email address"),
  mobile: z.string()
    .transform((val) => {
      // Remove all spaces, dashes, and parentheses
      let cleaned = val.replace(/[\s\-\(\)]/g, '');

      // If mobile starts with 0, convert to +27 format (South African default)
      if (cleaned.startsWith('0') && cleaned.length === 10) {
        return `+27${cleaned.substring(1)}`;
      }

      // If doesn't start with +, add it (assume user typed country code)
      if (!cleaned.startsWith('+') && /^\d+$/.test(cleaned)) {
        return `+${cleaned}`;
      }

      return cleaned;
    })
    .pipe(
      z.string().regex(/^\+\d{7,15}$/, "Please enter a valid international phone number with country code")
    ),
  ageVerified: z.boolean().refine((val) => val === true, {
    message: "You must be 18 or older to subscribe",
  }),
});

export type SubscriptionFormData = z.infer<typeof subscriptionSchema>;