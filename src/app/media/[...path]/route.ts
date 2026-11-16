import { NextRequest, NextResponse } from "next/server";
import { getStorageDriver } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const key = path.map(decodeURIComponent).join("/");

  // Protection contre le path traversal
  if (key.includes("..") || key.startsWith("/") || key.includes("\\")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const driver = getStorageDriver();
  const buffer = await driver.get(key);

  if (!buffer) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const contentType = key.endsWith(".webp")
    ? "image/webp"
    : key.endsWith(".png")
    ? "image/png"
    : key.endsWith(".jpg") || key.endsWith(".jpeg")
    ? "image/jpeg"
    : "application/octet-stream";

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

