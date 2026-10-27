import { describe, expect, it } from "vitest";

import { sha256Hex, sniffImageType } from "./images";

const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));

describe("sniffImageType", () => {
  it("recognises JPEG, PNG and WebP by content", () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))?.mime).toBe(
      "image/jpeg",
    );
    expect(
      sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))
        ?.mime,
    ).toBe("image/png");
    expect(
      sniffImageType(bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP")))
        ?.mime,
    ).toBe("image/webp");
  });

  it("rejects other content, whatever it is named", () => {
    expect(sniffImageType(bytes(...ascii("<svg onload=alert(1)>")))).toBeNull();
    expect(sniffImageType(bytes(...ascii("%PDF-1.7")))).toBeNull();
    expect(sniffImageType(bytes(...ascii("GIF89a")))).toBeNull();
    expect(sniffImageType(bytes())).toBeNull();
  });

  it("hashes content", () => {
    expect(sha256Hex(bytes(...ascii("abc")))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
