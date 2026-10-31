import { PUBLIC_IMAGE_KEY, publicStorage } from "@/lib/storage";

/**
 * Public product photos. Keys are random and files never change, so browsers
 * and CDNs may keep them for a year.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/media/listings/[file]">,
) {
  const { file } = await params;
  const key = `listings/${file}`;
  if (!PUBLIC_IMAGE_KEY.test(key)) {
    return new Response("Not found", { status: 404 });
  }
  let bytes: Uint8Array;
  try {
    bytes = await publicStorage().get(key);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
