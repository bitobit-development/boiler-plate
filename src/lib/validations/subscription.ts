import { z } from "zod";

export const subscriptionSchema = z.object({
  name: z.string().min(2, "Please enter your first name"),
  surname: z.string().min(2, "Please enter your last name"),
  email: z.string().email("Please enter a valid email address"),
  mobile: z.string()
    .min(1, "Please enter your mobile number")
    .transform((val) => {
      // Remove all non-digit characters except +
      const cleaned = val.replace(/[^\d+]/g, '');

      // If mobile starts with 0, convert to +27 format (SA backward compatibility)
      if (cleaned.startsWith('0') && cleaned.length === 10) {
        return `+27${cleaned.substring(1)}`;
      }

      // If doesn't start with +, add it
      if (!cleaned.startsWith('+')) {
        return `+${cleaned}`;
      }

      return cleaned;
    })
    .pipe(
      z.string().regex(/^\+\d{7,15}$/, "Please enter a valid international phone number")
    ),
  ageVerified: z.boolean().refine((val) => val === true, {
    message: "You must be 18 or older to subscribe",
  }),
});

export type SubscriptionFormData = z.infer<typeof subscriptionSchema>;