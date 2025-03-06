import mongoose, { Schema, model, Document } from "mongoose";

interface Levels {
  bc: number;
  tc: number;
  r1: number;
  r2: number;
  r3: number;
  r4: number;
  s1: number;
  s2: number;
  s3: number;
  s4: number;
  pivot: number;
}

interface ITrade extends Document {
  low: number;
  high: number;
  type: string;
  close: number;
  price: number;
  signal: string;
  reason: string;
  levels: Levels;
  exitTime: Date;
  entryTime: Date;
  company: string;
  createdAt?: Date;
  bufferValue: number;
  calculateLevels: () => Levels;
  generateSignal: () => string;
}

const TradeSchema = new Schema<ITrade>(
  {
    type: { type: String, default: "" },
    low: { type: Number, required: true },
    signal: { type: String, default: "" },
    reason: { type: String, default: "" },
    high: { type: Number, required: true },
    close: { type: Number, required: true },
    price: { type: Number, required: true },
    exitTime: { type: Date, default: null },
    entryTime: { type: Date, default: null },
    company: { type: String, required: true },
    bufferValue: { type: Number, required: true },
    levels: {
      bc: { type: Number, default: 0 },
      tc: { type: Number, default: 0 },
      r1: { type: Number, default: 0 },
      r2: { type: Number, default: 0 },
      r3: { type: Number, default: 0 },
      r4: { type: Number, default: 0 },
      s1: { type: Number, default: 0 },
      s2: { type: Number, default: 0 },
      s3: { type: Number, default: 0 },
      s4: { type: Number, default: 0 },
      pivot: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// Pre-save hook to set entryTime and adjust exitTime
TradeSchema.pre("save", function (next) {
  const createdAt = this.createdAt || new Date();
  this.entryTime = new Date(createdAt);
  this.exitTime = new Date(createdAt.getTime() + 3 * 60 * 1000);
  next();
});

// Method to calculate levels
TradeSchema.methods.calculateLevels = function (): Levels {
  const pivot = parseFloat(
    ((this.high + this.low + this.close) / 3).toFixed(2)
  );
  const bc = parseFloat(((this.high + this.low) / 2).toFixed(2));
  const tc = parseFloat((pivot + (pivot - bc)).toFixed(2));
  const r1 = parseFloat((2 * pivot - this.low).toFixed(2));
  const r2 = parseFloat((pivot + (this.high - this.low)).toFixed(2));
  const r3 = parseFloat((r1 + (this.high - this.low)).toFixed(2));
  const r4 = parseFloat((r2 + (this.high - this.low)).toFixed(2));
  const s1 = parseFloat((2 * pivot - this.high).toFixed(2));
  const s2 = parseFloat((pivot - (this.high - this.low)).toFixed(2));
  const s3 = parseFloat((s1 - (this.high - this.low)).toFixed(2));
  const s4 = parseFloat((s2 - (this.high - this.low)).toFixed(2));

  this.levels = { pivot, bc, tc, r1, r2, r3, r4, s1, s2, s3, s4 };
  return this.levels;
};

TradeSchema.methods.generateSignal = function (bufferValue: any): {
  signal: string;
  reason: string;
} {
  const { price, levels } = this;
  const { pivot, bc, tc, r1, r2, r3, r4, s1, s2, s3, s4 } = levels;

  const BUFFER = bufferValue ?? 15;
  let signal = "No Action";
  let reason = "Price is in a neutral zone.";

  // If price is above TC + BUFFER, check R1 → R2 → R3 → R4
  if (price > tc + BUFFER) {
    if (price > r1 && price <= r1 + BUFFER) {
      signal = "Buy";
      reason = "Price is between R1 and R1 + BUFFER.";
    } else if (price > r2 && price <= r2 + BUFFER) {
      signal = "Buy";
      reason = "Price is between R2 and R2 + BUFFER.";
    } else if (price > r3 && price <= r3 + BUFFER) {
      signal = "Buy";
      reason = "Price is between R3 and R3 + BUFFER.";
    } else if (price > r4 && price <= r4 + BUFFER) {
      signal = "Buy";
      reason = "Price is between R4 and R4 + BUFFER.";
    } else {
      signal = "No Action";
      reason = "Price is outside buffer.";
    }
  }
  // If price is below BC - BUFFER, check S1 → S2 → S3 → S4
  else if (price < bc - BUFFER) {
    if (price < s1 && price >= s1 - BUFFER) {
      signal = "Sell";
      reason = "Price is between S1 and S1 - BUFFER.";
    } else if (price < s2 && price >= s2 - BUFFER) {
      signal = "Sell";
      reason = "Price is between S2 and S2 - BUFFER.";
    } else if (price < s3 && price >= s3 - BUFFER) {
      signal = "Sell";
      reason = "Price is between S3 and S3 - BUFFER.";
    } else if (price < s4 && price >= s4 - BUFFER) {
      signal = "Sell";
      reason = "Price is between S4 and S4 - BUFFER.";
    } else {
      signal = "No Action";
      reason = "Price is outside buffer.";
    }
  }
  // If price is within TC and BC
  else if (price > bc && price < tc) {
    signal = "No Action";
    reason = "Price is within CPR range.";
  }
  // If price is exactly at TC or BC
  else if (price === tc) {
    signal = "No Action";
    reason = "Price is exactly at TC.";
  } else if (price > tc && price <= tc + BUFFER) {
    signal = "Buy";
    reason = "Price is slightly above TC within buffer.";
  } else if (price === bc) {
    signal = "No Action";
    reason = "Price is exactly at BC.";
  } else if (price < bc && price >= bc - BUFFER) {
    signal = "Sell";
    reason = "Price is slightly below BC within buffer.";
  }

  this.signal = signal;
  this.reason = reason;
  return { signal, reason };
};
const Trade = mongoose.models.Trade || model<ITrade>("Trade", TradeSchema);
export default Trade;
