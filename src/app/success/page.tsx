"use client";

import { useSearchParams, useRouter } from "next/navigation";
import ParticleBackground from "@/components/subscription/ParticleBackground";
import { CheckCircle } from "lucide-react";
import { useEffect, Suspense } from "react";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get user data from URL params
  const name = searchParams.get("name");
  const email = searchParams.get("email");

  // Redirect to home if no params (direct access to /success)
  useEffect(() => {
    if (!name || !email) {
      router.push("/");
    }
  }, [name, email, router]);

  // Show loading if redirecting
  if (!name || !email) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <ParticleBackground />

      <main className="w-full max-w-2xl flex flex-col items-center justify-center space-y-6 sm:space-y-8 py-12 relative z-10 text-center">
        {/* Success Icon */}
        <div className="relative">
          <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full"></div>
          <CheckCircle className="w-24 h-24 sm:w-32 sm:h-32 text-green-500 relative z-10 animate-pulse" />
        </div>

        {/* Personalized Success Message */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
          Thank you, {name}!
        </h1>

        <p className="text-xl sm:text-2xl text-white font-semibold">
          You're subscribed to Bigg Buzz
        </p>

        {/* Email Confirmation Message */}
        <p className="text-lg sm:text-xl text-gray-300">
          Check your email for confirmation
        </p>

        {/* Additional Info */}
        <div className="mt-8 p-6 bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-800 max-w-md">
          <p className="text-gray-400 text-sm sm:text-base">
            We've sent a confirmation email to{" "}
            <span className="text-orange-400 font-medium">{email}</span>
          </p>
          <p className="text-gray-500 text-xs sm:text-sm mt-2">
            Please verify your email address to complete your subscription.
          </p>
        </div>

        {/* Return Home Button */}
        <button
          onClick={() => router.push("/")}
          className="mt-8 bg-orange-500 text-white font-semibold text-base sm:text-lg px-8 sm:px-12 py-3 sm:py-4 rounded-full glow-pulse hover:scale-105 transition-transform duration-300 ease-in-out min-h-[48px] cursor-pointer"
          type="button"
        >
          Return Home
        </button>
      </main>
    </div>
  );
}

export default function Success() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}