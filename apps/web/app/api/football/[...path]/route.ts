import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const allowedGet =
  /^(players|data\/(catalog|coverage|metrics)|players\/statsbomb:player:\d+\/(profile|similar|visuals))$/;
async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const route = path.join("/");
  if (
    request.method === "GET"
      ? !allowedGet.test(route)
      : ![
          "recruitment/fit",
          "players/search",
          "my-club/preview",
          "my-club/analyze",
        ].includes(route)
  ) {
    return NextResponse.json(
      { detail: "Unknown analysis route" },
      { status: 404 },
    );
  }
  const base = process.env.FRP_API_URL || "http://127.0.0.1:8000";
  // Browser POSTs must originate from this frontend. This is not authentication
  // or an abuse-rate limit; the upstream API remains private in deployment.
  if (request.method === "POST") {
    const origin = request.headers.get("origin");
    let sameOrigin = !origin;
    try {
      sameOrigin ||= new URL(origin!).host === request.headers.get("host");
    } catch {
      sameOrigin = false;
    }
    if (!sameOrigin || request.headers.get("sec-fetch-site") === "cross-site")
      return NextResponse.json(
        { detail: "Cross-site analysis request rejected" },
        { status: 403 },
      );
  }
  try {
    let body: Uint8Array<ArrayBuffer> | undefined;
    if (request.method === "POST" && request.body) {
      const limit =
        route === "my-club/preview"
          ? 3 * 1024 * 1024
          : route === "my-club/analyze"
            ? 8 * 1024 * 1024
            : 32000;
      const reader = request.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) {
          await reader.cancel();
          return NextResponse.json(
            { detail: "Request exceeds the allowed size" },
            { status: 413 },
          );
        }
        chunks.push(value);
      }
      body = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.byteLength;
      }
    }
    const result = await fetch(`${base}/${route}${request.nextUrl.search}`, {
      method: request.method,
      body,
      headers: {
        "Content-Type":
          route === "my-club/preview"
            ? "application/octet-stream"
            : "application/json",
      },
      signal: AbortSignal.timeout(route.startsWith("my-club/") ? 15000 : 3500),
      cache: "no-store",
      redirect: "error",
    });
    return new NextResponse(await result.text(), {
      status: result.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      {
        detail:
          "Analysis is temporarily unavailable. Published player analysis remains available.",
      },
      { status: 503 },
    );
  }
}
export const GET = proxy;
export const POST = proxy;
