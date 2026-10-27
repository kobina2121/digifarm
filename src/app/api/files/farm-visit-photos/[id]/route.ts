import { isAppError } from "@/lib/errors";
import { getActor } from "@/lib/session";
import { readFarmVisitPhoto } from "@/modules/suppliers";

/** Streams a private farm-visit photo to authorized staff only. */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/files/farm-visit-photos/[id]">,
) {
  const actor = await getActor();
  if (!actor) return new Response("Not found", { status: 404 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id))
    return new Response("Not found", { status: 404 });

  try {
    const photo = await readFarmVisitPhoto(actor, id);
    return new Response(Buffer.from(photo.bytes), {
      headers: {
        "Content-Type": photo.mimeType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    // Forbidden and missing look the same, so photo IDs can't be probed.
    if (isAppError(error)) return new Response("Not found", { status: 404 });
    throw error;
  }
}
