import { isAppError } from "@/lib/errors";
import { getActor } from "@/lib/session";
import { readDeliveryProof } from "@/modules/ordering";

/** Streams a delivery photo to staff and the buyer who ordered it. */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/files/delivery-proofs/[id]">,
) {
  const actor = await getActor();
  if (!actor) return new Response("Not found", { status: 404 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id))
    return new Response("Not found", { status: 404 });

  try {
    const photo = await readDeliveryProof(actor, id);
    return new Response(Buffer.from(photo.bytes), {
      headers: {
        "Content-Type": photo.mimeType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    // Forbidden and missing look the same, so delivery IDs can't be probed.
    if (isAppError(error)) return new Response("Not found", { status: 404 });
    throw error;
  }
}
