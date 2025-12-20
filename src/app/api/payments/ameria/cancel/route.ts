import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { paymentId }: { paymentId?: string } = await req.json();

    if (!paymentId) {
      return NextResponse.json({ error: "paymentId required" }, { status: 400 });
    }

    const base = process.env.AMERIA_VPOS_BASE;
    const Username = process.env.AMERIA_USERNAME;
    const Password = process.env.AMERIA_PASSWORD;

    if (!base || !Username || !Password) {
      return NextResponse.json(
        { error: "Не заданы AMERIA_* в .env" },
        { status: 500 }
      );
    }

    const r = await fetch(`${base}/api/VPOS/CancelPayment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        PaymentID: paymentId,
        Username,
        Password,
      }),
      cache: "no-store",
    });

    const data = await r.json();
    return NextResponse.json({ ok: r.ok, cancel: data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
