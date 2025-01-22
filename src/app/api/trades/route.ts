import Trade from "@/modals/Trade";
import { dbConnect } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import CompanyLevels from "@/modals/CompanyLevel";

// Utility to handle responses
const createResponse = (success: boolean, data: any, status: number) =>
  NextResponse.json({ success, ...data }, { status });

// Validation function
const validateTradeInput = ({ price, company }: any) => {
  const errors: string[] = [];
  if (!price) errors.push("Current price is required.");
  if (!company) errors.push("Company name is required.");

  return errors.length ? errors : null;
};

// Create a Trade Entry (POST)
export async function POST(req: Request) {
  try {
    await dbConnect();
    const { price, company } = await req.json();

    // Validate input
    const errors = validateTradeInput({ price, company });
    if (errors) {
      return createResponse(false, { error: errors.join(", ") }, 400);
    }

    // Get today's and yesterday's dates
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const formattedYesterday = yesterday.toISOString().split("T")[0];

    // Fetch historical data from the database
    let historicalData = await CompanyLevels.findOne({
      company,
      createdAt: {
        $gte: new Date(`${formattedYesterday}T00:00:00Z`),
        $lte: new Date(`${formattedYesterday}T23:59:59Z`),
      },
    });
    const { high, low, close } = historicalData;

    const bc = parseFloat(((high + low) / 2).toFixed(2));
    const percentageValue = parseFloat((bc * 0.0006).toFixed(2));
    const bufferValue = Math.round(percentageValue);

    // Create and save the trade
    const trade = new Trade({ high, low, close, price, company, bufferValue });
    trade.calculateLevels();
    trade.generateSignal(bufferValue);

    await trade.save();

    return createResponse(true, { trade }, 201);
  } catch (error: any) {
    console.error("Error creating trade:", error.message);
    return createResponse(
      false,
      { error: error.message || "Error creating trade" },
      500
    );
  }
}

// Get All Trade Entries (GET)
export async function GET(req: Request) {
  try {
    await dbConnect();

    // Extract query parameters
    const url = new URL(req.url);
    const company = url.searchParams.get("company");

    const filter: any = {};
    if (company) filter.company = company;

    const trades = await Trade.find(filter);

    if (!trades.length) {
      return createResponse(false, { message: "No trades found" }, 404);
    }

    return createResponse(true, { trades }, 200);
  } catch (error: any) {
    console.error("Error fetching trades:", error.message);
    return createResponse(
      false,
      { error: error.message || "Error fetching trades" },
      500
    );
  }
}
