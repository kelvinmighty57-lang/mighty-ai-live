"use client";

import React, { useState } from "react";
import Link from "next/link";

interface UserAccessRecord {
  email: string;
  planName?: string;
  planType: "VIP_FREE" | "PAID_PLAN";
  credits: number;
  expiresAt: string | null;
  updatedAt: string;
}

export default function OwnerAdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [targetEmail, setTargetEmail] = useState("");
  const [grantMode, setGrantMode] = useState<"custom" | "unlimited">("custom");
  const [customCredits, setCustomCredits] = useState("5000");
  const [customMinutes, setCustomMinutes] = useState("12");
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<UserAccessRecord[]>(new Array());
  const [statusMsg, setStatusMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg("");
    try {
      const res = await fetch(`/api/access?adminKey=${encodeURIComponent(adminKey)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Wrong Owner PIN");
      setUsers(data.users || new Array());
      setUnlocked(true);
    } catch (err: any) {
      setStatusMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/access?adminKey=${encodeURIComponent(adminKey)}`);
      const data = await res.json();
      if (res.ok) setUsers(data.users || new Array());
    } finally {
      setLoading(false);
    }
  };

  const handleGrantFree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmail.trim()) return;
    setLoading(true);
    setStatusMsg("");
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grant_vip",
          adminKey,
          email: targetEmail.trim(),
          unlimited: grantMode === "unlimited",
          customCredits: Number(customCredits || 5000),
          customMinutes: Number(customMinutes || 0),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to grant access");
      setUsers(data.users || new Array());
      setStatusMsg(
        grantMode === "unlimited"
          ? `Granted Unlimited Free VIP to ${targetEmail.trim()}!`
          : `Granted ${Number(customCredits).toLocaleString()} Credits (${
              Number(customMinutes) > 0 ? `${customMinutes} Mins` : "No Time Limit"
            }) to ${targetEmail.trim()}!`
      );
      setTargetEmail("");
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (emailToRevoke: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", adminKey, email: emailToRevoke }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke");
      setUsers(data.users || new Array());
      setStatusMsg(`Revoked access for ${emailToRevoke}`);
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const paidCount = users.filter((u) => u.planType === "PAID_PLAN").length;
  const vipCount = users.filter((u) => u.planType === "VIP_FREE").length;
  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );
  return (
    <div className="min-h-screen bg-[#0a0c12] text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold">
              OWNER ADMIN
            </span>
            <h1 className="text-2xl font-bold mt-1">MIGHTY AI LIVE — Control Center</h1>
            <p className="text-xs text-zinc-400">
              Grant any custom credit amount & duration to any user, or manage paid subscribers
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unlocked && (
              <button onClick={handleRefresh} className="px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-xs font-medium">
                ↻ Refresh
              </button>
            )}
            <Link href="/" className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold">
              ← Back to Studio
            </Link>
          </div>
        </div>

        {!unlocked ? (
          <form onSubmit={handleLogin} className="bg-[#11141d] border border-zinc-800 rounded-2xl p-7 max-w-md mx-auto space-y-4">
            <h2 className="text-lg font-semibold">Owner Sign In</h2>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Enter your Owner PIN..."
              className="w-full bg-[#0a0c12] border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm"
              required
            />
            {statusMsg && <p className="text-xs text-red-400">{statusMsg}</p>}
            <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm">
              {loading ? "Verifying..." : "Unlock Admin Board"}
            </button>
          </form>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#11141d] border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-400">Total Users</p>
                <p className="text-2xl font-bold mt-1">{users.length}</p>
              </div>
              <div className="bg-[#11141d] border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-400">Paid Subscribers</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{paidCount}</p>
              </div>
              <div className="bg-[#11141d] border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-400">Owner Free Grants</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">{vipCount}</p>
              </div>
              <div className="bg-[#11141d] border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-400">Base Rate</p>
                <p className="text-2xl font-bold text-indigo-400 mt-1">$20 / 5k cr</p>
              </div>
            </div>

            <form onSubmit={handleGrantFree} className="bg-[#11141d] border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">Grant Custom Credits or Unlimited VIP</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setGrantMode("custom")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                      grantMode === "custom" ? "bg-indigo-600 border-indigo-500 text-white" : "bg-[#0a0c12] border-zinc-700 text-zinc-400"
                    }`}
                  >
                    Custom Credit Amount
                  </button>
                  <button
                    type="button"
                    onClick={() => setGrantMode("unlimited")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                      grantMode === "unlimited" ? "bg-amber-600 border-amber-500 text-white" : "bg-[#0a0c12] border-zinc-700 text-zinc-400"
                    }`}
                  >
                    Unlimited VIP
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className={grantMode === "custom" ? "sm:col-span-5" : "sm:col-span-9"}>
                  <label className="block text-[11px] text-zinc-400 mb-1">User Email</label>
                  <input
                    type="email"
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-[#0a0c12] border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm"
                    required
                  />
                </div>

                {grantMode === "custom" && (
                  <>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-zinc-400 mb-1">Credit Points</label>
                      <input
                        type="number"
                        min={1}
                        value={customCredits}
                        onChange={(e) => setCustomCredits(e.target.value)}
                        placeholder="5000"
                        className="w-full bg-[#0a0c12] border border-zinc-700 rounded-lg px-3 py-2.5 text-sm"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-zinc-400 mb-1">Mins (0 = No Expiry)</label>
                      <input
                        type="number"
                        min={0}
                        value={customMinutes}
                        onChange={(e) => setCustomMinutes(e.target.value)}
                        placeholder="12"
                        className="w-full bg-[#0a0c12] border border-zinc-700 rounded-lg px-3 py-2.5 text-sm"
                      />
                    </div>
                  </>
                )}

                <div className="sm:col-span-3">
                  <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs whitespace-nowrap">
                    + Grant Free Access
                  </button>
                </div>
              </div>
            </form>

            {statusMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-700 text-emerald-300 text-xs">{statusMsg}</div>
            )}

            <div className="bg-[#11141d] border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold text-sm">User Directory ({filteredUsers.length})</h2>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by email..."
                  className="bg-[#0a0c12] border border-zinc-700 rounded-lg px-3 py-1.5 text-xs w-60"
                />
              </div>

              {filteredUsers.length === 0 ? (
                <p className="text-xs text-zinc-500 py-4 text-center">No users found yet.</p>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((u) => {
                    const isUnlimited = u.planType === "VIP_FREE" && u.expiresAt === null && u.credits >= 999999;
                    return (
                      <div key={u.email} className="flex flex-wrap items-center justify-between gap-2 bg-[#0a0c12] border border-zinc-800 rounded-xl px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold">{u.email}</p>
                          <p className="text-xs text-zinc-400">
                            {isUnlimited
                              ? "Owner VIP Free • Unlimited Credits & Time"
                              : `${u.credits.toLocaleString()} Credits • ${
                                  u.expiresAt ? `Expires: ${new Date(u.expiresAt).toLocaleTimeString()}` : "No Time Expiry"
                                }`}
                          </p>
                        </div>
                        <button onClick={() => handleRevoke(u.email)} className="px-3 py-1 rounded bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs font-semibold">
                          Revoke
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
