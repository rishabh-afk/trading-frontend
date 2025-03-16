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
  this.entryTime = new Date(createdAt.getTime() + 3 * 60 * 1000);
  this.exitTime = new Date(createdAt.getTime() + 3 * 60 * 1000);
  next();
});

// Method to calculate levels
TradeSchema.methods.calculateLevels = function (): Levels {
  const pivot = parseFloat(
    ((this.high + this.low + this.close) / 3).toFixed(2)
  );
  const bc = parseFloat(((this.high + this.low) / 2).toFixed(2));
  const tc = parseFloat((pivot - bc + pivot).toFixed(2));
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
  const { bc, tc, r1, r2, r3, r4, s1, s2, s3, s4 } = levels;

  const BUFFER = bufferValue;
  let signal = "No Action";
  let reason = "Price is in a neutral zone.";

  // If price is above TC and within TC + BUFFER, Buy
  if (price >= tc && price <= tc + BUFFER) {
    signal = "Buy";
    reason = "Price is above TC within buffer.";
  }
  // If price is below BC and within BC - BUFFER, Sell
  else if (price <= bc && price >= bc - BUFFER) {
    signal = "Sell";
    reason = "Price is below BC within buffer.";
  }
  // If price is between TC and BC, No Action
  else if (price < tc && price > bc) {
    signal = "Exit";
    reason = "Price is within CPR range.";
  }

  const levelsMap = { r1, r2, r3, r4, s1, s2, s3, s4 };

  Object.entries(levelsMap).forEach(([levelName, level]) => {
    if (price > level && price <= level + BUFFER) {
      signal = "Buy";
      reason = `Price is above ${levelName} (${level}) within buffer.`;
    } else if (price < level && price >= level - BUFFER) {
      signal = "Sell";
      reason = `Price is below ${levelName} (${level}) within buffer.`;
    }
  });

  this.signal = signal;
  this.reason = reason;
  return { signal, reason };
};

TradeSchema.methods.exitSignal = function (
  currentSignal: string,
  bufferValue: any,
  open: any
): {
  signal: string;
  reason: string;
} {
  const BUFFER = bufferValue;
  const { price, levels } = this;
  const { r1, r2, r3, r4, s1, s2, s3, s4 } = levels;

  let signal = "No Action";
  let reason = "No trend change detected.";

  const levelsMap = { r1, r2, r3, r4, s1, s2, s3, s4 };

  Object.entries(levelsMap).forEach(([levelName, level]) => {
    if (currentSignal === "Buy" && open > level && price < level - BUFFER) {
      signal = "Exit";
      reason = `Price has crossed below the ${levelName} level (${level.toFixed(
        2
      )}) and moved further down by more than the buffer (${BUFFER.toFixed(
        2
      )}). Exiting Buy position.`;
    } else if (
      currentSignal === "Sell" &&
      open < level &&
      price > level + BUFFER
    ) {
      signal = "Exit";
      reason = `Price has crossed above the ${levelName} level (${level.toFixed(
        2
      )}) and moved further up by more than the buffer (${BUFFER.toFixed(
        2
      )}). Exiting Sell position.`;
    }
  });
  return { signal, reason };
};

const Trade = mongoose.models.Trade || model<ITrade>("Trade", TradeSchema);
export default Trade;
