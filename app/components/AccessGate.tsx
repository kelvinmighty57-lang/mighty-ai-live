"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface AccessGateProps {
  children: React.ReactNode;
}

export default function AccessGate({ children }: AccessGateProps) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Bypass the user sign-up gate for /admin routes
  const isAdminRoute = pathname?.startsWith("/admin");

  useEffect(() => {
    if (isAdminRoute) {
      setIsAuthenticated(true);
      return;
    }

    const savedUser = localStorage.getItem("mighty_ai_user");
    if (savedUser) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [isAdminRoute]);

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      // Replace this with your NextAuth signIn("google") or Firebase/Clerk Google OAuth call
      localStorage.setItem(
        "mighty_ai_user",
        JSON.stringify({ provider: "google", email: "user@gmail.com" })
      );
      setIsAuthenticated(true);
    } catch {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both your email and password.");
      return;
    }

    if (mode === "signup" && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      // Replace this block with your backend auth API endpoint (/api/auth/login or /api/auth/signup)
      localStorage.setItem(
        "mighty_ai_user",
        JSON.stringify({
          provider: "email",
          name: mode === "signup" ? name : undefined,
          email,
        })
      );
      setIsAuthenticated(true);
    } catch {
      setError("Authentication failed. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (isAdminRoute) {
    return <>{children}</>;
  }

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
        <p className="text-sm text-neutral-400">Loading Mighty AI Live...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/90 p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-bold text-lg">
            M
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Mighty AI Live</h1>
          <p className="mt-1.5 text-sm text-neutral-400">
            {mode === "signup"
              ? "Create an account to access the AI Voice Studio"
              : "Sign in to your Mighty AI Live account"}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="mb-6 grid grid-cols-2 rounded-lg bg-neutral-950 p-1 border border-neutral-800">
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError("");
            }}
            className={`rounded-md py-2 text-xs font-semibold transition ${
              mode === "signup"
                ? "bg-indigo-600 text-white shadow"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError("");
            }}
            className={`rounded-md py-2 text-xs font-semibold transition ${
              mode === "signin"
                ? "bg-indigo-600 text-white shadow"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
        </div>

        {/* Continue with Google (Gmail) */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-700 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100 disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-neutral-800" />
          <span className="text-xs uppercase tracking-wider text-neutral-500">
            or with email
          </span>
          <div className="h-px flex-1 bg-neutral-800" />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-xs font-medium text-neutral-300"
              >
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                required
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs font-medium text-neutral-300"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@gmail.com"
              required
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-medium text-neutral-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : mode === "signup"
              ? "Create Free Account"
              : "Sign In"}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-neutral-500">
          By continuing, you agree to Mighty AI Live&apos;s{" "}
          <Link href="/terms" className="text-neutral-300 underline hover:text-white">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-neutral-300 underline hover:text-white">
            Privacy Policy
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
