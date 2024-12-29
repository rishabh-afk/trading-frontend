import { NextRequest, NextResponse } from "next/server";
import { strings } from "@/data/messages";

// CustomError class for handling custom error messages
class CustomError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// ApiResponse class for structuring the API response
class ApiResponse {
  constructor(
    public success: boolean,
    public data: object,
    public message: string
  ) {}
}

// TradingService class with static methods (should not be exported as part of the route)
class TradingService {
  static async CalculatePoints(
    high: number,
    low: number,
    close: number
  ): Promise<object> {
    const pivot = parseFloat(((high + low + close) / 3).toFixed(3));
    const bc = parseFloat(((high + low) / 2).toFixed(3));
    const tc = parseFloat((pivot - bc + pivot).toFixed(3));
    const r1 = parseFloat((2 * pivot - low).toFixed(3));
    const r2 = parseFloat((pivot + (high - low)).toFixed(3));
    const r3 = parseFloat((r1 + (high - low)).toFixed(3));
    const r4 = parseFloat((r2 + (high - low)).toFixed(3));
    const s1 = parseFloat((2 * pivot - high).toFixed(3));
    const s2 = parseFloat((pivot - (high - low)).toFixed(3));
    const s3 = parseFloat((s1 - (high - low)).toFixed(3));
    const s4 = parseFloat((s2 - (high - low)).toFixed(3));

    return {
      pivot,
      bc,
      tc,
      r1,
      r2,
      r3,
      r4,
      s1,
      s2,
      s3,
      s4,
    };
  }

  static async DetermineAction(
    price: number,
    close: number,
    tc: number,
    pivot: number,
    bc: number
  ): Promise<object> {
    console.log(
      `Price: ${price}, 
       Close: ${close}, 
       TC: ${tc.toFixed(3)}, 
       BC: ${bc.toFixed(3)},
       Pivot: ${pivot.toFixed(3)}`
    );
    let message = "";
    if (price <= tc && price < pivot) message = strings.SELL_OFF;
    else if (price > tc && price <= tc + 15) message = strings.CALL_BUY;
    else if (price > tc + 15)
      message = "Price is above TC + 15. Consider taking action.";
    else if (price >= bc && price <= tc) message = strings.MONITORING;
    else if (price < bc && price <= bc - 15) message = strings.PUT_BUY;
    else if (price < bc - 15)
      message = "Price is below BC - 15. Consider taking action.";
    return { message: message };
  }
}

// Route handler function (exported as part of the Next.js route)
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { high, low, close, currentPrice } = await request.json();

    // Check if required fields are present
    if (
      high === undefined ||
      low === undefined ||
      close === undefined ||
      currentPrice === undefined
    ) {
      throw new CustomError(
        "Missing required fields: high, low, close, currentPrice",
        400
      );
    }

    // Calculate the trading points using TradingService
    const points: any = await TradingService.CalculatePoints(high, low, close);

    // Determine action based on the current price
    const resp: any = await TradingService.DetermineAction(
      currentPrice,
      close,
      points.tc ?? 0,
      points.pivot ?? 0,
      points.bc ?? 0
    );

    const response = new ApiResponse(true, points, resp?.message);
    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    if (error instanceof CustomError) {
      const response = new ApiResponse(false, {}, error.message);
      return NextResponse.json(response, { status: error.status });
    } else {
      // Handle unexpected errors
      const response = new ApiResponse(
        false,
        { error: error.message },
        strings.ERROR
      );
      return NextResponse.json(response, { status: 500 });
    }
  }
}
