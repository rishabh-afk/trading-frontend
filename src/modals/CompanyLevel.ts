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

interface ICompanyLevels extends Document {
  company: string; // Name of the company
  high: number; // High price
  low: number; // Low price
  close: number; // Close price
  levels: Levels; // Calculated levels for the company
}

const CompanyLevelsSchema = new Schema<ICompanyLevels>(
  {
    company: { type: String, required: true }, // Unique company name
    high: { type: Number, required: true }, // High price
    low: { type: Number, required: true }, // Low price
    close: { type: Number, required: true }, // Close price
    levels: {
      bc: { type: Number, required: true, default: 0 },
      tc: { type: Number, required: true, default: 0 },
      r1: { type: Number, required: true, default: 0 },
      r2: { type: Number, required: true, default: 0 },
      r3: { type: Number, required: true, default: 0 },
      r4: { type: Number, required: true, default: 0 },
      s1: { type: Number, required: true, default: 0 },
      s2: { type: Number, required: true, default: 0 },
      s3: { type: Number, required: true, default: 0 },
      s4: { type: Number, required: true, default: 0 },
      pivot: { type: Number, required: true, default: 0 },
    },
  },
  { timestamps: true }
);

// Middleware to calculate levels before saving
CompanyLevelsSchema.pre<ICompanyLevels>("save", function (next) {
  const high = this.high;
  const low = this.low;
  const close = this.close;

  // Calculate levels
  const pivot = parseFloat(((high + low + close) / 3).toFixed(2));
  const bc = parseFloat(((high + low) / 2).toFixed(2));
  const tc = parseFloat((pivot + (pivot - bc)).toFixed(2));
  const r1 = parseFloat((2 * pivot - low).toFixed(2));
  const r2 = parseFloat((pivot + (high - low)).toFixed(2));
  const r3 = parseFloat((r1 + (high - low)).toFixed(2));
  const r4 = parseFloat((r2 + (high - low)).toFixed(2));
  const s1 = parseFloat((2 * pivot - high).toFixed(2));
  const s2 = parseFloat((pivot - (high - low)).toFixed(2));
  const s3 = parseFloat((s1 - (high - low)).toFixed(2));
  const s4 = parseFloat((s2 - (high - low)).toFixed(2));

  // Assign calculated levels
  this.levels = { bc, tc, r1, r2, r3, r4, s1, s2, s3, s4, pivot };
  next();
});

const CompanyLevels =
  mongoose.models.CompanyLevels ||
  model<ICompanyLevels>("CompanyLevels", CompanyLevelsSchema);

export default CompanyLevels;
