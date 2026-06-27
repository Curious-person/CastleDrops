"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { login } from "@/app/actions/auth";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    const result = await login(form);
    
    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      router.push("/orders");
    }
  }

  return (
    <div className="min-h-screen flex bg-[#e7f6fc]">
      {/* ─── Left Panel ─── */}
      <div className="flex flex-1 flex-col justify-between px-8 py-10 sm:px-12 lg:px-16 bg-white">
        {/* Logo */}
        <div>
          <div className="flex items-center gap-2">
            <Image
              src="/images/logo.png"
              alt="Castle Drops Logo"
              width={40}
              height={40}
              className="w-10 h-auto"
              priority
            />
            <div className="flex flex-col">
              <span className="font-bold text-base text-[#2FA9D9] leading-tight">Castle Drops</span>
              <span className="text-[10px] text-[#2FA9D9] font-semibold uppercase tracking-wider">Water Station</span>
            </div>
          </div>
        </div>

        {/* Form area — vertically centred */}
        <div className="w-full max-w-sm mx-auto space-y-8">
          {/* Heading */}
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-gray-900">
              Log in to your account
            </h1>
            <p className="text-sm text-gray-500">
              Please enter your details to continue.
            </p>
          </div>

          {error && (
            <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="pl-9 h-10 border-gray-200 focus-visible:border-[#2FA9D9] focus-visible:ring-[#2FA9D9]/20"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="pl-9 pr-10 h-10 border-gray-200 focus-visible:border-[#2FA9D9] focus-visible:ring-[#2FA9D9]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <button
                type="button"
                className="text-sm text-[#2FA9D9] hover:text-[#2FA9D9]/80 font-medium transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading}
              className={cn(
                "w-full h-10 bg-[#2FA9D9] hover:bg-[#2FA9D9]/90 text-white font-semibold rounded-lg transition-all",
                isLoading && "opacity-75 cursor-not-allowed"
              )}
            >
              {isLoading ? "Logging in…" : "Log in"}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400 text-center">
          &copy; {new Date().getFullYear()} Castle Drops. All rights reserved.
        </p>
      </div>

      {/* ─── Right Panel ─── */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-[#e7f6fc] border-l border-sky-100">
        {/* Placeholder container — replace with image/illustration later */}
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-sky-200 w-[80%] h-[80%] text-center p-12">
          <div className="w-16 h-16 rounded-full bg-sky-100 border-2 border-dashed border-sky-300 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 text-sky-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3 10.5h18M3 7.5h18M3 4.5h18"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-sky-500">Image / Illustration</p>
          <p className="text-xs text-sky-400 max-w-[200px]">
            Drop your marketing image or hero illustration here.
          </p>
        </div>
      </div>
    </div>
  );
}
