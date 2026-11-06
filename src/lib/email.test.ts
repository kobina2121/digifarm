import { describe, expect, it, vi } from "vitest";

import { createResendTransport } from "./email";

const message = {
  to: "ama@example.com",
  subject: "Your order is on its way",
  text: "Hello Ama",
};

function fakeFetch(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

describe("Resend email transport", () => {
  it("posts the message with the sender and key", async () => {
    const send = fakeFetch(Response.json({ id: "email_1" }));
    const transport = createResendTransport({
      apiKey: "re_test_key",
      from: "DigiFarm <no-reply@digifarm.example>",
      fetch: send,
    });

    await transport.send(message);

    const [url, init] = send.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer re_test_key",
    );
    expect(JSON.parse(String(init?.body))).toEqual({
      from: "DigiFarm <no-reply@digifarm.example>",
      to: ["ama@example.com"],
      subject: "Your order is on its way",
      text: "Hello Ama",
    });
  });

  it("fails with Resend's reason, without the key", async () => {
    const transport = createResendTransport({
      apiKey: "re_secret_key",
      from: "DigiFarm <no-reply@digifarm.example>",
      fetch: fakeFetch(
        Response.json(
          { message: "The digifarm.example domain is not verified." },
          { status: 403 },
        ),
      ),
    });

    const failure = transport.send(message);
    await expect(failure).rejects.toThrow(
      "Resend refused the email (403): The digifarm.example domain is not verified.",
    );
    await expect(failure).rejects.not.toThrow(/re_secret_key/);
  });
});
