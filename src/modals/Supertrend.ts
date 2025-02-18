import mongoose, { Schema, model, Document } from "mongoose";

interface ISupertrend extends Document {
  company: string;
  trend: "bullish" | "bearish";
  upperBand: number;
  lowerBand: number;
  createdAt: Date;
  currentPrice: number;
}

const SupertrendSchema = new Schema<ISupertrend>(
  {
    company: { type: String, required: true },
    trend: { type: String, enum: ["bullish", "bearish"], required: true },
    upperBand: { type: Number, required: true },
    lowerBand: { type: Number, required: true },
    currentPrice: { type: Number, required: true },
  },
  { timestamps: true }
);

const Supertrend =
  mongoose.models.Supertrend ||
  model<ISupertrend>("Supertrend", SupertrendSchema);

export default Supertrend;
