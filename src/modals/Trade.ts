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
  close: number;
  price: number;
  signal: string;
  levels: Levels;
  entryTime: Date;
  company: string;
  exitTime: Date | null;
  calculateLevels: () => Levels;
  generateSignal: () => string;
}

const TradeSchema = new Schema<ITrade>(
  {
    low: { type: Number, required: true },
    signal: { type: String, default: "" },
    high: { type: Number, required: true },
    close: { type: Number, required: true },
    price: { type: Number, required: true },
    exitTime: { type: Date, default: null },
    company: { type: String, required: true },
    entryTime: { type: Date, default: Date.now },
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

// Method to generate a signal
TradeSchema.methods.generateSignal = function (): string {
  const { price, levels } = this;
  const { pivot, bc, tc, r1, r2, r3, r4, s1, s2, s3, s4 } = levels;

  const BUFFER = 15; // Buffer value
  let signal = "";

  if (price > r4) signal = "Price is above R4. Strong bullish signal.";
  else if (price > r3 && price <= r4)
    signal = "Price is between R3 and R4. Approaching strong bullish pressure.";
  else if (price > r3 - BUFFER && price <= r3)
    signal = "Price is within R3 ± BUFFER. High bullish potential.";
  else if (price > r2 && price <= r3)
    signal = "Price is between R2 and R3. Moderate bullish trend.";
  else if (price > r2 - BUFFER && price <= r2)
    signal = "Price is within R2 ± BUFFER. Approaching moderate bullish zone.";
  else if (price > r1 && price <= r2)
    signal = "Price is between R1 and R2. Weak bullish trend.";
  else if (price > r1 - BUFFER && price <= r1)
    signal = "Price is within R1 ± BUFFER. Approaching weak bullish zone.";
  else if (price < s4) signal = "Price is below S4. Strong bearish signal.";
  else if (price >= s4 && price < s3)
    signal = "Price is between S4 and S3. Strong bearish pressure.";
  else if (price >= s3 && price < s3 + BUFFER)
    signal = "Price is within S3 ± BUFFER. High bearish potential.";
  else if (price >= s3 && price < s2)
    signal = "Price is between S3 and S2. Moderate bearish trend.";
  else if (price >= s2 && price < s2 + BUFFER)
    signal = "Price is within S2 ± BUFFER. Approaching moderate bearish zone.";
  else if (price >= s2 && price < s1)
    signal = "Price is between S2 and S1. Weak bearish trend.";
  else if (price >= s1 && price < s1 + BUFFER)
    signal = "Price is within S1 ± BUFFER. Approaching weak bearish zone.";
  else if (price <= tc && price < pivot)
    signal = "Price is below Pivot and TC. Sell-off detected.";
  else if (price > tc && price <= tc + BUFFER)
    signal = "Price is within TC ± BUFFER. Call buy opportunity.";
  else if (price > tc + BUFFER)
    signal = "Price is above TC + BUFFER. Strong call signal.";
  else if (price >= bc && price <= tc)
    signal = "Price is within BC and TC. Monitoring for trends.";
  else if (price < bc && price >= bc - BUFFER)
    signal = "Price is within BC ± BUFFER. Put buy opportunity.";
  else if (price < bc - BUFFER)
    signal = "Price is below BC - BUFFER. Strong put signal.";

  // Fallback signal
  if (!signal) signal = "No specific signal detected. Monitoring the market.";

  this.signal = signal;
  return signal;
};

const Trade = mongoose.models.Trade || model<ITrade>("Trade", TradeSchema);
export default Trade;
