import Decimal from "decimal.js";

import type { Quantity } from "./quantity";

export const CURRENCIES = ["GHS"] as const;
export type Currency = (typeof CURRENCIES)[number];

const MINOR_UNITS_PER_MAJOR: Record<Currency, bigint> = { GHS: BigInt(100) };

/**
 * Money in integer minor units (pesewas for GHS). No floating point anywhere:
 * amounts are bigint, and the only rounding happens in {@link Money.timesQuantity},
 * using round-half-up to the nearest pesewa (ROADMAP §2.4).
 */
export class Money {
  private constructor(
    readonly amountMinor: bigint,
    readonly currency: Currency,
  ) {}

  static ofMinor(
    amountMinor: bigint | number | string,
    currency: Currency = "GHS",
  ): Money {
    if (typeof amountMinor === "number" && !Number.isSafeInteger(amountMinor)) {
      throw new RangeError("Minor-unit amounts must be safe integers");
    }
    return new Money(BigInt(amountMinor), currency);
  }

  /** Parse a major-unit decimal string such as "12.50" (cedis). Rejects sub-pesewa precision. */
  static parse(major: string, currency: Currency = "GHS"): Money {
    if (!/^-?\d+(\.\d{1,2})?$/.test(major.trim())) {
      throw new RangeError(`Not a valid ${currency} amount: "${major}"`);
    }
    const minor = new Decimal(major.trim()).times(
      MINOR_UNITS_PER_MAJOR[currency].toString(),
    );
    return new Money(BigInt(minor.toFixed(0)), currency);
  }

  static zero(currency: Currency = "GHS"): Money {
    return new Money(BigInt(0), currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountMinor + other.amountMinor, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountMinor - other.amountMinor, this.currency);
  }

  /** Unit price × quantity, rounded half-up to the nearest minor unit. */
  timesQuantity(quantity: Quantity): Money {
    const exact = new Decimal(this.amountMinor.toString()).times(
      quantity.toDecimal(),
    );
    const rounded = exact.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
    return new Money(BigInt(rounded.toFixed(0)), this.currency);
  }

  /** Percentage in basis points (1% = 100 bps), rounded half-up — e.g. commission. */
  basisPoints(bps: number): Money {
    if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) {
      throw new RangeError("Basis points must be an integer from 0 to 10000");
    }
    const exact = new Decimal(this.amountMinor.toString())
      .times(bps)
      .dividedBy(10_000);
    return new Money(
      BigInt(exact.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toFixed(0)),
      this.currency,
    );
  }

  isNegative(): boolean {
    return this.amountMinor < BigInt(0);
  }

  equals(other: Money): boolean {
    return (
      this.currency === other.currency && this.amountMinor === other.amountMinor
    );
  }

  /** Major-unit decimal string, e.g. "1250.50". */
  toMajorString(): string {
    return new Decimal(this.amountMinor.toString())
      .dividedBy(MINOR_UNITS_PER_MAJOR[this.currency].toString())
      .toFixed(2);
  }

  /** Display string, e.g. "GH₵ 1,250.50". */
  format(): string {
    const [whole, fraction] = this.toMajorString().replace("-", "").split(".");
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${this.isNegative() ? "-" : ""}GH₵ ${grouped}.${fraction}`;
  }

  /** bigint can't be JSON-serialised, so minor units travel as a string. */
  toJSON(): { amountMinor: string; currency: Currency } {
    return {
      amountMinor: this.amountMinor.toString(),
      currency: this.currency,
    };
  }

  private assertSameCurrency(other: Money) {
    if (other.currency !== this.currency) {
      throw new RangeError(
        `Currency mismatch: ${this.currency} vs ${other.currency}`,
      );
    }
  }
}
