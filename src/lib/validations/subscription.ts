import { z } from "zod";

export const subscriptionSchema = z.object({
  name: z.string().min(2, "Please enter your first name"),
  surname: z.string().min(2, "Please enter your last name"),
  email: z.string().email("Please enter a valid email address"),
  mobile: z.string()
    .transform((val) => {
      // If mobile starts with 0, convert to +27 format
      if (val.startsWith('0') && val.length === 10) {
        return `+27${val.substring(1)}`;
      }
      // If already has +27, keep it
      if (val.startsWith('+27')) {
        return val;
      }
      // Otherwise return as-is for validation error
      return val;
    })
    .pipe(
      z.string().regex(/^\+27\d{9}$/, "Please enter a valid South African mobile number")
    ),
  ageVerified: z.boolean().refine((val) => val === true, {
    message: "You must be 18 or older to subscribe",
  }),
});

export type SubscriptionFormData = z.infer<typeof subscriptionSchema>;