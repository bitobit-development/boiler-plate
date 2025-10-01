"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import ParticleBackground from "@/components/subscription/ParticleBackground";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <ParticleBackground />

      <main className="w-full max-w-4xl flex flex-col items-center justify-center space-y-8 sm:space-y-12 py-12 sm:py-16 relative z-10">
        {/* Logo */}
        <div className="w-full max-w-md">
          <Image
            src="/bigg-buzz-logo.jpg"
            alt="Bigg Buzz Logo"
            width={400}
            height={400}
            priority
            className="w-full h-auto rounded-lg"
          />
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white text-center tracking-tight">
          Join the Buzz
        </h1>

        {/* Subscribe Button */}
        <button
          onClick={() => router.push("/subscribe")}
          className="bg-orange-500 text-white font-semibold text-lg sm:text-xl px-12 sm:px-16 py-4 sm:py-5 rounded-full glow-pulse hover:scale-105 transition-transform duration-300 ease-in-out min-h-[48px] cursor-pointer"
          type="button"
        >
          Subscribe
        </button>
      </main>
    </div>
  );
}
