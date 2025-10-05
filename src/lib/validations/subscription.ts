import { z } from "zod";

export const subscriptionSchema = z.object({
  name: z.string().min(2, "Please enter your first name"),
  surname: z.string().min(2, "Please enter your last name"),
  email: z.string().email("Please enter a valid email address"),
  mobile: z.string()
    .transform((val) => {
      // Remove all spaces, dashes, parentheses for consistent formatting
      let cleaned = val.replace(/[\s\-()]/g, "");

      // If mobile starts with 0 (local SA format), convert to +27 format
      if (cleaned.startsWith('0') && cleaned.length === 10) {
        return `+27${cleaned.substring(1)}`;
      }

      // If doesn't start with +, add it (user may have typed country code without +)
      if (cleaned.match(/^\d/) && !cleaned.startsWith('+')) {
        cleaned = `+${cleaned}`;
      }

      return cleaned;
    })
    .pipe(
      z.string().regex(/^\+\d{7,15}$/, "Please enter a valid international phone number (e.g., +27821234567, +12025551234)")
    ),
  ageVerified: z.boolean().refine((val) => val === true, {
    message: "You must be 18 or older to subscribe",
  }),
});

export type SubscriptionFormData = z.infer<typeof subscriptionSchema>;