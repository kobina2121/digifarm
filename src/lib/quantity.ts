import Decimal from "decimal.js";

/** Quantities are stored as Decimal(14,3): up to 3 decimal places (e.g. 2.5 tonnes). */
export const QUANTITY_SCALE = 3;
const MAX_QUANTITY = new Decimal("99999999999.999");

export class Quantity {
  private constructor(private readonly value: Decimal) {}

  static parse(input: string | number | Decimal): Quantity {
    let value: Decimal;
    try {
      value = new Decimal(input);
    } catch {
      throw new RangeError(`Not a valid quantity: ${String(input)}`);
    }
    if (!value.isFinite()) throw new RangeError("Quantity must be finite");
    if (value.isNegative()) throw new RangeError("Quantity cannot be negative");
    if (value.decimalPlaces() > QUANTITY_SCALE) {
      throw new RangeError(
        `Quantity allows at most ${QUANTITY_SCALE} decimal places`,
      );
    }
    if (value.greaterThan(MAX_QUANTITY))
      throw new RangeError("Quantity is too large");
    return new Quantity(value);
  }

  static zero(): Quantity {
    return new Quantity(new Decimal(0));
  }

  toDecimal(): Decimal {
    return this.value;
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  add(other: Quantity): Quantity {
    return Quantity.parse(this.value.plus(other.value));
  }

  subtract(other: Quantity): Quantity {
    return Quantity.parse(this.value.minus(other.value));
  }

  compare(other: Quantity): -1 | 0 | 1 {
    return this.value.comparedTo(other.value) as -1 | 0 | 1;
  }

  /** Canonical string, e.g. "2.5" — what goes over the wire and into the database. */
  toString(): string {
    return this.value.toFixed();
  }

  toJSON(): string {
    return this.toString();
  }
}
