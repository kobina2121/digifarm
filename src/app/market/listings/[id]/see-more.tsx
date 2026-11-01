"use client";

import { useState } from "react";

/** A description clipped to three lines, with "See more" when it's longer. */
export function SeeMore({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 160;
  return (
    <p className="whitespace-pre-line text-muted-foreground">
      <span className={open || !long ? "block" : "line-clamp-3 block"}>
        {text}
      </span>
      {long ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="font-semibold text-field-green-dark"
        >
          {open ? "See less" : "See more"}
        </button>
      ) : null}
    </p>
  );
}
