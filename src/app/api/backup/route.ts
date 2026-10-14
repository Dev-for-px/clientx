import { NextResponse, type NextRequest } from "next/server";
import { backupToSheet } from "@/lib/sheets";
import { append } from "@/lib/db";
import { safeEqual } from "@/lib/crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Chamado pela Vercel Cron todo dia. Exige o CRON_SECRET.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET ?? "";
  const auth = req.headers.get("authorization") ?? "";
  if (secret.length < 32 || !safeEqual(auth, `Bearer ${secret}`)) {
    return new NextResponse("Not found", { status: 404 });
  }
  try {
    const counts = await backupToSheet();
    await append("Log", { quando: new Date().toISOString(), quem: "sistema", acao: "backup_ok", detalhe: JSON.stringify(counts), ip_hash: "" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    await append("Log", { quando: new Date().toISOString(), quem: "sistema", acao: "backup_falhou", detalhe: (e instanceof Error ? e.message : String(e)).slice(0, 300), ip_hash: "" });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
