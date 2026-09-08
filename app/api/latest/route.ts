import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(
      `https://mfc-d1-api.derylchrist08.workers.dev/latest`,
      {
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Worker responded with status ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch latest" }, { status: 500 });
  }
}
