"use client";

import Image from "next/image";
import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Lock, Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { login, sendPasswordResetEmail } from "@/app/actions/auth";

// ─── Validation Schemas ───────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address")
});

type LoginFormValues = z.infer<typeof loginSchema>;
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
type ActiveView = 'login' | 'forgot-password' | 'forgot-password-success';

function LoginFormContent() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [view, setView] = useState<ActiveView>('login');
  const [submittedEmail, setSubmittedEmail] = useState("");
  
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read params for redirects from callback
  const errorParam = searchParams.get("error");
  const resetSuccessParam = searchParams.get("resetSuccess");

  useEffect(() => {
    if (errorParam) {
      setError(errorParam);
    }
    if (resetSuccessParam) {
      setSuccessMessage("Your password has been successfully reset. Please log in with your new password.");
    }
  }, [errorParam, resetSuccessParam]);

  // Forms
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  const forgotForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" }
  });

  // Handlers
  async function handleLoginSubmit(data: LoginFormValues) {
    setIsLoading(true);
    setError("");
    setSuccessMessage("");
    
    const result = await login(data);
    
    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      router.push("/orders");
    }
  }

  async function handleForgotPasswordSubmit(data: ForgotPasswordFormValues) {
    setIsLoading(true);
    setError("");
    setSuccessMessage("");
    
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const result = await sendPasswordResetEmail(data.email, origin);
    
    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      setSubmittedEmail(data.email);
      setIsLoading(false);
      setView('forgot-password-success');
    }
  }

  const navigateToLogin = () => {
    setError("");
    setSuccessMessage("");
    setView('login');
    // Clear URL parameters
    router.replace("/login");
  };

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

        {/* Dynamic Form Area — vertically centred */}
        <div className="w-full max-w-sm mx-auto space-y-8">
          
          {/* ────────────────── 1. LOGIN VIEW ────────────────── */}
          {view === 'login' && (
            <>
              {/* Heading */}
              <div className="space-y-1.5">
                <h1 className="text-2xl font-bold text-gray-900">
                  Log in to your account
                </h1>
                <p className="text-sm text-gray-500">
                  Please enter your details to continue.
                </p>
              </div>

              {/* Status messages */}
              {error && (
                <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="p-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
                  {successMessage}
                </div>
              )}

              {/* Form */}
              <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-5">
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
                      placeholder="Enter your email"
                      disabled={isLoading}
                      {...loginForm.register("email")}
                      className={cn(
                        "pl-9 h-10 border-gray-200 focus-visible:border-[#2FA9D9] focus-visible:ring-[#2FA9D9]/20",
                        loginForm.formState.errors.email && "border-rose-300 focus-visible:border-rose-500 focus-visible:ring-rose-500/20"
                      )}
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="text-xs text-rose-600 font-medium">{loginForm.formState.errors.email.message}</p>
                  )}
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
                      placeholder="Enter your password"
                      disabled={isLoading}
                      {...loginForm.register("password")}
                      className={cn(
                        "pl-9 pr-10 h-10 border-gray-200 focus-visible:border-[#2FA9D9] focus-visible:ring-[#2FA9D9]/20",
                        loginForm.formState.errors.password && "border-rose-300 focus-visible:border-rose-500 focus-visible:ring-rose-500/20"
                      )}
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
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-rose-600 font-medium">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                {/* Forgot password */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setSuccessMessage("");
                      setView('forgot-password');
                    }}
                    className="text-sm text-[#2FA9D9] hover:text-[#2FA9D9]/80 font-medium transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className={cn(
                    "w-full h-10 bg-[#2FA9D9] hover:bg-[#2FA9D9]/90 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2",
                    isLoading && "opacity-75 cursor-not-allowed"
                  )}
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isLoading ? "Logging in…" : "Log in"}
                </Button>
              </form>
            </>
          )}

          {/* ────────────────── 2. FORGOT PASSWORD VIEW ────────────────── */}
          {view === 'forgot-password' && (
            <>
              {/* Heading */}
              <div className="space-y-1.5">
                <h1 className="text-2xl font-bold text-gray-900">
                  Forgot password?
                </h1>
                <p className="text-sm text-gray-500">
                  No worries, enter your email and we will send you a link to reset your password.
                </p>
              </div>

              {/* Status messages */}
              {error && (
                <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={forgotForm.handleSubmit(handleForgotPasswordSubmit)} className="space-y-5">
                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email" className="text-sm font-medium text-gray-700">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="Enter your email"
                      disabled={isLoading}
                      {...forgotForm.register("email")}
                      className={cn(
                        "pl-9 h-10 border-gray-200 focus-visible:border-[#2FA9D9] focus-visible:ring-[#2FA9D9]/20",
                        forgotForm.formState.errors.email && "border-rose-300 focus-visible:border-rose-500 focus-visible:ring-rose-500/20"
                      )}
                    />
                  </div>
                  {forgotForm.formState.errors.email && (
                    <p className="text-xs text-rose-600 font-medium">{forgotForm.formState.errors.email.message}</p>
                  )}
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className={cn(
                    "w-full h-10 bg-[#2FA9D9] hover:bg-[#2FA9D9]/90 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2",
                    isLoading && "opacity-75 cursor-not-allowed"
                  )}
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isLoading ? "Sending recovery link…" : "Send recovery link"}
                </Button>

                {/* Back to Login link */}
                <button
                  type="button"
                  onClick={navigateToLogin}
                  className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium cursor-pointer py-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to login
                </button>
              </form>
            </>
          )}

          {/* ────────────────── 3. SUCCESS VIEW ────────────────── */}
          {view === 'forgot-password-success' && (
            <div className="space-y-6">
              {/* Heading */}
              <div className="space-y-1.5 text-center sm:text-left">
                <h1 className="text-2xl font-bold text-gray-900">
                  Check your email
                </h1>
                <p className="text-sm text-gray-500">
                  We have sent password recovery instructions to your email.
                </p>
              </div>

              {/* Status Alert Banner */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex gap-3 text-emerald-800 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold">Reset Link Sent</p>
                  <p className="text-emerald-700 text-xs">
                    A recovery link has been sent to <span className="font-medium text-emerald-800">{submittedEmail}</span>. Please click the link to reset your credentials.
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <Button
                onClick={navigateToLogin}
                className="w-full h-10 bg-[#2FA9D9] hover:bg-[#2FA9D9]/90 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                Back to login
              </Button>
            </div>
          )}

        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400 text-center">
          &copy; {new Date().getFullYear()} Castle Drops. All rights reserved.
        </p>
      </div>

      {/* ─── Right Panel ─── */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-[#e7f6fc] border-l border-sky-100">
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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#e7f6fc]">
        <div className="text-gray-500 text-sm">Loading…</div>
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}
