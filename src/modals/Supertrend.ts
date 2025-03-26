import mongoose, { Schema, model, Document } from "mongoose";

interface ISupertrend extends Document {
  company: string;
  trend: "bullish" | "bearish";
  createdAt: Date;
  currentPrice: number;
  low: number;
  high: number;
  open: number;
  close: number;
  date: Date;
}

const SupertrendSchema = new Schema<ISupertrend>(
  {
    company: { type: String, required: true },
    low: { type: Number, required: true },
    open: { type: Number, required: true },
    date: { type: Date, required: true },
    high: { type: Number, required: true },
    close: { type: Number, required: true },
    trend: { type: String, enum: ["bullish", "bearish"], required: true },
    currentPrice: { type: Number, required: true },
  },
  { timestamps: true }
);

SupertrendSchema.pre("save", function (next) {
  const date = this.date || new Date();
  this.date = new Date(date.getTime() + 3 * 60 * 1000);
  next();
});

const Supertrend =
  mongoose.models.Supertrend ||
  model<ISupertrend>("Supertrend", SupertrendSchema);

export default Supertrend;
