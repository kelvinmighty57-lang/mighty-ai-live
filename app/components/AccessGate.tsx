"use client";

import React, { useState, useEffect } from "react";
import Script from "next/script";
import Link from "next/link";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: Record<string, any>) => { openIframe: () => void };
    };
  }
}

const PLAN_CARDS = [
  { id: "TRIAL", tier: "TRIAL PASS", price: "$20", ngn: "₦30,000", credits: "5,000 Credits", mins: "12 Mins Live", kobo: 3000000, badge: "" },
  { id: "STARTER", tier: "STARTER", price: "$49", ngn: "₦73,500", credits: "14,000 Credits", mins: "35 Mins Live", kobo: 7350000, badge: "+14% Bonus" },
  { id: "PRO", tier: "PRO CREATOR", price: "$99", ngn: "₦148,500", credits: "30,000 Credits", mins: "75 Mins Live", kobo: 14850000, badge: "MOST POPULAR" },
  { id: "STUDIO", tier: "STUDIO", price: "$249", ngn: "₦373,500", credits: "80,000 Credits", mins: "200 Mins Live", kobo: 37350000, badge: "+28% Bonus" },
  { id: "ELITE", tier: "ELITE VIP", price: "$499", ngn: "₦748,500", credits: "180,000 Credits", mins: "450 Mins Live", kobo: 74850000, badge: "+44% Bonus" },
];

export default function AccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [planName, setPlanName] = useState("");
  const [planType, setPlanType] = useState<string | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [checking, setChecking] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  if (pathname === "/admin") {
    return <>{children}</>;
  }

  useEffect(() => {
    const saved = localStorage.getItem("mighty_user_email");
    if (saved) {
      setEmail(saved);
      verifyEmailAccess(saved);
    } else {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!unlocked || !expiresAt) {
      setSecondsLeft(null);
      return;
    }
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
      if (diff <= 0) {
        setUnlocked(false);
        setErrorMsg("Your session time has expired. Choose a plan below to continue.");
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [unlocked, expiresAt]);

  const verifyEmailAccess = async (targetEmail: string) => {
    setChecking(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/access?email=${encodeURIComponent(targetEmail.trim())}`);
      const data = await res.json();
      if (data.allowed) {
        localStorage.setItem("mighty_user_email", targetEmail.trim().toLowerCase());
        setUnlocked(true);
        setPlanName(data.planName || "Active Plan");
        setPlanType(data.planType);
        setCredits(data.credits ?? 5000);
        setExpiresAt(data.expiresAt || null);
      } else {
        setUnlocked(false);
        setErrorMsg(
          data.expired
            ? "Your pass has expired. Choose any plan below to renew."
            : "Enter your email and choose a plan below to unlock the studio."
        );
      }
    } catch {
      setErrorMsg("Unable to verify access right now.");
    } finally {
      setChecking(false);
    }
  };

  const handlePayPlan = (plan: (typeof PLAN_CARDS)[number]) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMsg("Please enter your email address at the top first.");
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
    const currency = process.env.NEXT_PUBLIC_PLAN_CURRENCY || "NGN";

    if (!publicKey || !window.PaystackPop) {
      setErrorMsg("Paystack checkout is loading or NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY is missing.");
      return;
    }

    const handler = window.PaystackPop.setup({
      key: publicKey,
      email: cleanEmail,
      amount: plan.kobo,
      currency,
      ref: `MIGHTY_${plan.id}_${Date.now()}`,
      callback: async (response: { reference: string }) => {
        setChecking(true);
        try {
          const res = await fetch("/api/access", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "verify_paystack",
              email: cleanEmail,
              planId: plan.id,
              reference: response.reference,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.allowed) throw new Error(data.error || "Verification failed.");
          localStorage.setItem("mighty_user_email", cleanEmail);
          setUnlocked(true);
          setPlanName(data.planName);
          setPlanType(data.planType);
          setCredits(data.credits);
          setExpiresAt(data.expiresAt);
        } catch (err: any) {
          setErrorMsg(err.message);
        } finally {
          setChecking(false);
        }
      },
      onClose: () => setErrorMsg("Payment window closed before completion."),
    });

    handler.openIframe();
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };
  if (unlocked) {
    const isUnlimited = planType === "VIP_FREE" && expiresAt === null;
    return (
      <div>
        <div className="bg-[#0d0f17] border-b border-zinc-800 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 text-zinc-300">
          <div className="flex flex-wrap items-center gap-3">
            <span>User: <strong className="text-white">{email}</strong></span>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-semibold">
              {isUnlimited ? "Owner VIP Unlimited" : `${planName} • ${credits.toLocaleString()} Credits`}
            </span>
            {!isUnlimited && secondsLeft !== null && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold">
                Time Left: {formatTimer(secondsLeft)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-indigo-400 hover:underline">Owner Admin</Link>
            <button onClick={() => { localStorage.removeItem("mighty_user_email"); setUnlocked(false); }} className="text-zinc-400 hover:text-white">
              Sign Out
            </button>
          </div>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0c12] text-white p-6 flex flex-col justify-center">
      <Script src="https://paystack.co" strategy="lazyOnload" />
      <div className="max-w-6xl mx-auto w-full space-y-6">
        <div className="text-center space-y-2">
          <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
            MIGHTY AI LIVE — CREDITS & BILLING
          </span>
          <h1 className="text-3xl font-bold">Choose Your Live Studio Plan</h1>
          <p className="text-xs text-zinc-400">Real-Time AI Face Swap + 36-Language Cloned Voice Translator</p>
        </div>

        <div className="max-w-lg mx-auto flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address first..."
            className="flex-1 bg-[#11141d] border border-zinc-700 rounded-lg px-4 py-2.5 text-sm"
          />
          <button
            type="button"
            onClick={() => verifyEmailAccess(email)}
            disabled={checking || !email.trim()}
            className="px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold whitespace-nowrap"
          >
            {checking ? "Checking..." : "Already VIP / Paid? Unlock"}
          </button>
        </div>

        {errorMsg && (
          <div className="max-w-lg mx-auto p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-xs text-center">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-2">
          {PLAN_CARDS.map((p) => {
            const isPopular = p.badge === "MOST POPULAR";
            return (
              <div
                key={p.id}
                className={`relative bg-[#11141d] rounded-2xl p-5 flex flex-col justify-between border ${
                  isPopular ? "border-indigo-500 shadow-lg shadow-indigo-500/15" : "border-zinc-800"
                }`}
              >
                {p.badge && (
                  <span
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                      isPopular ? "bg-indigo-600 text-white" : "bg-emerald-900/90 text-emerald-300 border border-emerald-700"
                    }`}
                  >
                    {p.badge}
                  </span>
                )}

                <div className="text-center space-y-2">
                  <p className="text-xs font-bold tracking-wider text-zinc-400">{p.tier}</p>
                  <p className="text-3xl font-extrabold">{p.price}</p>
                  <p className="text-[11px] text-zinc-400">{p.ngn} bank transfer</p>
                  <div className="pt-1">
                    <span className="inline-block px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                      {p.credits}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-400 font-medium pt-1">⏱ {p.mins}</p>
                  <ul className="text-[11px] text-zinc-300 space-y-1.5 pt-3 text-left border-t border-zinc-800/80">
                    <li>✓ Live Face & Video Studio</li>
                    <li>✓ 36-Language Voice Clone</li>
                    <li>✓ OBS & Streaming Ready</li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handlePayPlan(p)}
                  className={`mt-5 w-full py-2.5 rounded-lg text-xs font-semibold transition ${
                    isPopular
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                      : "bg-[#1a1f2e] hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
                  }`}
                >
                  Subscribe Now
                </button>
              </div>
            );
          })}
        </div>

        <div className="text-center pt-2">
          <Link href="/admin" className="text-xs text-zinc-500 hover:text-zinc-300">
            Owner Admin Board →
          </Link>
        </div>
      </div>
    </div>
  );
}
