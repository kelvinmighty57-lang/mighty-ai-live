import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "vip-users.json");

export const PLANS: Record<
  string,
  { name: string; usd: number; ngn: number; kobo: number; credits: number; minutes: number }
> = {
  TRIAL: { name: "Trial Pass", usd: 20, ngn: 30000, kobo: 3000000, credits: 5000, minutes: 12 },
  STARTER: { name: "Starter", usd: 49, ngn: 73500, kobo: 7350000, credits: 14000, minutes: 35 },
  PRO: { name: "Pro Creator", usd: 99, ngn: 148500, kobo: 14850000, credits: 30000, minutes: 75 },
  STUDIO: { name: "Studio", usd: 249, ngn: 373500, kobo: 37350000, credits: 80000, minutes: 200 },
  ELITE: { name: "Elite VIP", usd: 499, ngn: 748500, kobo: 74850000, credits: 180000, minutes: 450 },
};

export interface UserAccessRecord {
  email: string;
  planName: string;
  planType: "VIP_FREE" | "PAID_PLAN";
  credits: number;
  expiresAt: string | null;
  reference?: string;
  updatedAt: string;
}

function readRecords(): UserAccessRecord[] {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecords(records: UserAccessRecord[]) {
  fs.writeFileSync(DB_PATH, JSON.stringify(records, null, 2), "utf-8");
}

function isRecordActive(rec: UserAccessRecord): boolean {
  if (rec.planType === "VIP_FREE" && rec.expiresAt === null) return true;
  if (rec.credits <= 0) return false;
  if (rec.expiresAt && new Date(rec.expiresAt).getTime() <= Date.now()) return false;
  return true;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email")?.trim().toLowerCase();
  const adminKey = searchParams.get("adminKey")?.trim();
  const records = readRecords();

  if (adminKey) {
    if (adminKey !== (process.env.ADMIN_SECRET || "mightyowner2026")) {
      return NextResponse.json({ error: "Invalid Owner Password." }, { status: 401 });
    }
    return NextResponse.json({ users: records });
  }

  if (!email) {
    return NextResponse.json({ allowed: false }, { status: 400 });
  }

  const found = records.find((r) => r.email === email);
  if (!found || !isRecordActive(found)) {
    return NextResponse.json({
      allowed: false,
      expired: Boolean(found),
      credits: found?.credits || 0,
      expiresAt: found?.expiresAt || null,
    });
  }

  return NextResponse.json({
    allowed: true,
    planName: found.planName,
    planType: found.planType,
    credits: found.credits,
    expiresAt: found.expiresAt,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action as string;
    const email = (body.email as string)?.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const records = readRecords();

    if (action === "grant_vip") {
      if (body.adminKey !== (process.env.ADMIN_SECRET || "mightyowner2026")) {
        return NextResponse.json({ error: "Unauthorized Owner Password." }, { status: 401 });
      }
      const unlimited = Boolean(body.unlimited);
      const selectedPlan = PLANS[body.planId as string] || PLANS.TRIAL;

      const filtered = records.filter((r) => r.email !== email);
      filtered.unshift({
        email,
        planName: unlimited ? "Owner VIP Unlimited" : `${selectedPlan.name} (Free Gift)`,
        planType: "VIP_FREE",
        credits: unlimited ? 999999 : selectedPlan.credits,
        expiresAt: unlimited
          ? null
          : new Date(Date.now() + selectedPlan.minutes * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      });
      writeRecords(filtered);
      return NextResponse.json({ success: true, users: filtered });
    }

    if (action === "revoke") {
      if (body.adminKey !== (process.env.ADMIN_SECRET || "mightyowner2026")) {
        return NextResponse.json({ error: "Unauthorized Owner Password." }, { status: 401 });
      }
      const filtered = records.filter((r) => r.email !== email);
      writeRecords(filtered);
      return NextResponse.json({ success: true, users: filtered });
    }

    if (action === "verify_paystack") {
      const reference = (body.reference as string)?.trim();
      const selectedPlan = PLANS[body.planId as string] || PLANS.TRIAL;
      const secret = process.env.PAYSTACK_SECRET_KEY?.trim();

      if (!reference || !secret) {
        return NextResponse.json(
          { error: "Missing Paystack reference or PAYSTACK_SECRET_KEY." },
          { status: 400 }
        );
      }

      const verifyRes = await fetch(
        `https://paystack.co{encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${secret}` } }
      );
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || verifyData?.data?.status !== "success") {
        return NextResponse.json({ error: "Payment could not be verified." }, { status: 402 });
      }

      const expiresAt = new Date(Date.now() + selectedPlan.minutes * 60 * 1000).toISOString();
      const filtered = records.filter((r) => r.email !== email);
      filtered.unshift({
        email,
        planName: selectedPlan.name,
        planType: "PAID_PLAN",
        credits: selectedPlan.credits,
        expiresAt,
        reference,
        updatedAt: new Date().toISOString(),
      });
      writeRecords(filtered);

      return NextResponse.json({
        allowed: true,
        planName: selectedPlan.name,
        planType: "PAID_PLAN",
        credits: selectedPlan.credits,
        expiresAt,
      });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error." }, { status: 500 });
  }
}
