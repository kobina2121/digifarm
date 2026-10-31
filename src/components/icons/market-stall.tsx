import type { SVGProps } from "react";

/**
 * Market stall: striped awning, produce pile, a crate of carrots and the
 * counter. Redrawn on Lucide's 24px grid so it sits with the other tab icons
 * and takes the current text colour.
 */
export function MarketStallIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3.6 1.2h16.8l2.4 4H1.2z" />
      <path d="M7.4 1.2 6 5.2M10.8 1.2 10.2 5.2M13.2 1.2l.6 4M16.6 1.2l1.4 4" />
      <path d="M1.5 5.2v1.4a2.25 1.3 0 0 0 4.2 0 2.1 1.3 0 0 0 4.2 0 2.1 1.3 0 0 0 4.2 0 2.1 1.3 0 0 0 4.2 0 2.25 1.3 0 0 0 4.2 0V5.2" />
      <path d="M2.6 8.3V16M21.4 8.3V16" />
      <rect x="1.2" y="16" width="21.6" height="6.8" rx=".4" />
      <circle cx="5.4" cy="14.3" r="1.5" />
      <circle cx="8.6" cy="14.3" r="1.5" />
      <circle cx="7" cy="11.8" r="1.5" />
      <path d="M13.2 13h6.8v3h-6.8zM15 13v-2.4M18.2 13v-2.4M15 10.6l1-1.4M18.2 10.6l1-1.4" />
      <path d="M9.8 20.6c1.6.9 3.5.2 4.8-1.6l.6-.9-1.2-.2c-1.9-.2-3.7.8-4.2 2.7zM15.2 18.1l1.1-.9" />
    </svg>
  );
}
