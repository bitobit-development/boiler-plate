"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import ParticleBackground from "@/components/subscription/ParticleBackground";
import { useState, useEffect } from "react";
import { subscribeAction } from "@/app/actions/subscribe";
import { subscriptionSchema, type SubscriptionFormData } from "@/lib/validations/subscription";
import { toast } from "sonner";

export default function Subscribe() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: SubscriptionFormData) => {
    setIsSubmitting(true);

    try {
      // Call the Server Action
      const result = await subscribeAction(data);

      if (result.success) {
        // Store masked phone for display on OTP page
        if (result.maskedPhone) {
          sessionStorage.setItem('maskedPhone', result.maskedPhone);
        }

        // Navigate to OTP verification page with session ID
        router.push(`/verify-otp?session=${result.subscriberId}`);
      } else {
        // Handle errors
        setIsSubmitting(false);

        if (result.field) {
          // Show inline error below the specific field
          setError(result.field as keyof SubscriptionFormData, {
            type: "server",
            message: result.error,
          });
        } else {
          // Show toast for system errors (no specific field)
          toast.error(result.error, {
            description: "Please try again in a moment.",
          });
        }
      }
    } catch (error) {
      // Handle network errors or unexpected issues
      setIsSubmitting(false);
      toast.error("Unable to connect to the server", {
        description: "Please check your connection and try again.",
      });
    }
  };

  // Prevent navigation during submission
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSubmitting) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isSubmitting]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <ParticleBackground />

      <main className="w-full max-w-2xl pt-6 sm:pt-8 pb-12 sm:pb-16 relative z-10">
        {/* Logo */}
        <div className="w-full max-w-xs mx-auto mb-8">
          <Image
            src="/bigg-buzz-logo.jpg"
            alt="Bigg Buzz Logo"
            width={300}
            height={300}
            priority
            className="w-full h-auto rounded-lg"
          />
        </div>

        {/* Form Container */}
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-gray-800">
          <h1 className="text-3xl sm:text-4xl font-bold text-white text-center mb-8">
            Subscribe to Bigg Buzz
          </h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* ARIA Live Region for Errors */}
            {Object.keys(errors).length > 0 && (
              <div role="alert" aria-live="polite" className="sr-only">
                Form has {Object.keys(errors).length} error(s). Please check the fields.
              </div>
            )}

            <fieldset
              disabled={isSubmitting}
              className={`space-y-6 ${isSubmitting ? "opacity-60 pointer-events-none" : ""}`}
            >
              {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-white font-medium mb-3">
                First Name
              </label>
              <input
                id="name"
                type="text"
                placeholder="First Name"
                {...register("name")}
                onChange={(e) => {
                  register("name").onChange(e);
                  if (errors.name) {
                    clearErrors("name");
                  }
                }}
                className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 transition-all duration-200"
                aria-invalid={errors.name ? "true" : "false"}
                aria-describedby={errors.name ? "name-error" : undefined}
              />
              {errors.name && (
                <p id="name-error" className="mt-3 text-sm text-red-500" role="alert">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Surname Field */}
            <div>
              <label htmlFor="surname" className="block text-white font-medium mb-3">
                Last Name
              </label>
              <input
                id="surname"
                type="text"
                placeholder="Last Name"
                {...register("surname")}
                onChange={(e) => {
                  register("surname").onChange(e);
                  if (errors.surname) {
                    clearErrors("surname");
                  }
                }}
                className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 transition-all duration-200"
                aria-invalid={errors.surname ? "true" : "false"}
                aria-describedby={errors.surname ? "surname-error" : undefined}
              />
              {errors.surname && (
                <p id="surname-error" className="mt-3 text-sm text-red-500" role="alert">
                  {errors.surname.message}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-white font-medium mb-3">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="your@email.com"
                {...register("email")}
                onChange={(e) => {
                  register("email").onChange(e);
                  if (errors.email) {
                    clearErrors("email");
                  }
                }}
                className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 transition-all duration-200"
                aria-invalid={errors.email ? "true" : "false"}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <p id="email-error" className="mt-3 text-sm text-red-500" role="alert">
                  {errors.email.message}
                </p>
              )}
              {errors.email?.type === "server" && (
                <p className="mt-1 text-xs text-gray-400">
                  Already have an account? Contact support.
                </p>
              )}
            </div>

            {/* Mobile Number Field */}
            <div>
              <label htmlFor="mobile" className="block text-white font-medium mb-3">
                Mobile Number
              </label>
              <input
                id="mobile"
                type="tel"
                placeholder="+27821234567 or +12025551234"
                {...register("mobile")}
                onChange={(e) => {
                  register("mobile").onChange(e);
                  if (errors.mobile) {
                    clearErrors("mobile");
                  }
                }}
                className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 transition-all duration-200"
                aria-invalid={errors.mobile ? "true" : "false"}
                aria-describedby={errors.mobile ? "mobile-error mobile-hint" : "mobile-hint"}
              />
              <p id="mobile-hint" className="mt-2 text-xs text-gray-400">
                Include country code (e.g., +27 for South Africa, +1 for USA)
              </p>
              {errors.mobile && (
                <p id="mobile-error" className="mt-3 text-sm text-red-500" role="alert">
                  {errors.mobile.message}
                </p>
              )}
            </div>

            {/* Age Verification Checkbox */}
            <div>
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="ageVerified"
                    type="checkbox"
                    {...register("ageVerified")}
                    onChange={(e) => {
                      register("ageVerified").onChange(e);
                      if (errors.ageVerified) {
                        clearErrors("ageVerified");
                      }
                    }}
                    className="w-5 h-5 bg-gray-800 border-gray-700 rounded focus:ring-2 focus:ring-orange-500 cursor-pointer accent-orange-500"
                    aria-invalid={errors.ageVerified ? "true" : "false"}
                    aria-describedby={errors.ageVerified ? "age-error" : undefined}
                  />
                </div>
                <label htmlFor="ageVerified" className="ml-3 text-white cursor-pointer">
                  I confirm I am 18 years or older
                </label>
              </div>
              {errors.ageVerified && (
                <p id="age-error" className="mt-3 text-sm text-red-500" role="alert">
                  {errors.ageVerified.message}
                </p>
              )}
            </div>
            </fieldset>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-orange-500 text-white font-semibold text-lg px-12 py-4 rounded-full glow-pulse hover:scale-105 transition-transform duration-300 ease-in-out min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Submitting...
                </span>
              ) : (
                "Submit"
              )}
            </button>
          </form>
        </div>

        {/* Helper text - optional, remove if not needed */}
        <p className="text-center text-gray-400 text-sm mt-6">
          Join our exclusive community for the latest updates and offers
        </p>
      </main>
    </div>
  );
}