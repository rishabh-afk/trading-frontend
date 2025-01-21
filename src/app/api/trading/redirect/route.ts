import { KiteConnect } from "kiteconnect";
import { dbConnect } from "@/lib/mongodb";
import CompanyLevels from "@/modals/CompanyLevel";
import { NextRequest, NextResponse } from "next/server";

interface HistoricalData {
  high: number;
  low: number;
  close: number;
}

interface OhlcResponse {
  high: number;
  low: number;
  close: number;
  currentPrice: number;
  levels: {
    pivot: number;
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
  };
}

// Kite SDK instance
const kite = new KiteConnect({
  api_key: process.env.KITE_API_KEY || "",
});

let accessToken: string | null = null;

/**
 * Handles the redirection after login to generate a session and fetch user profile.
 * @param {NextRequest} request - The incoming HTTP GET request object.
 * @returns {Promise<NextResponse>} - JSON response with success or error.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const request_token = searchParams.get("request_token");

    // Validate query parameters
    if (!request_token) {
      console.error("Invalid or missing request token.");
      return NextResponse.json(
        { error: "Invalid or missing request token." },
        { status: 400 }
      );
    }

    // Step 1: Generate session
    const session = await kite.generateSession(
      request_token,
      process.env.KITE_API_SECRET || ""
    );

    if (!session || !session.access_token) {
      console.error("Failed to generate session or missing access token.");
      return NextResponse.json(
        { error: "Failed to generate session." },
        { status: 500 }
      );
    }

    // Step 2: Set access token
    accessToken = session.access_token;
    kite.setAccessToken(session.access_token);

    // Step 3: Fetch user profile
    const profile = await kite.getProfile();
    if (!profile) {
      console.error("Failed to fetch user profile.");
      return NextResponse.json(
        { error: "Failed to fetch user profile." },
        { status: 500 }
      );
    }
    let url = process.env.NEXT_PUBLIC_API_URL;
    if (url) return NextResponse.redirect(url + "?loggedIn=true");
    else {
      url = "https://trading-frontend-roan.vercel.app";
      return NextResponse.redirect(url);
    }
  } catch (error) {
    console.error("Error handling redirection:", (error as Error).message);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    if (!accessToken) {
      const loginUrl = kite.getLoginURL();
      if (!loginUrl) {
        return NextResponse.json(
          { error: "Failed to generate login URL." },
          { status: 500 }
        );
      }
      return NextResponse.redirect(loginUrl);
    }

    await dbConnect();
    const body = await request.json();
    let {
      companies: company,
      historical = true,
    }: { companies: string; historical?: boolean } = body;

    company = company[0];

    if (!company) {
      return NextResponse.json(
        { error: "Company name is required in the request body." },
        { status: 400 }
      );
    }

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const ohlc = await kite.getOHLC([company]);
    const instrumentToken = ohlc[company]?.instrument_token;
    const formattedYesterday = yesterday.toISOString().split("T")[0];

    let companyData: HistoricalData | null = null;

    if (historical) {
      const marketCloseTime = new Date();
      marketCloseTime.setHours(17, 30, 0, 0); // 5:30 PM IST

      const currentTime = new Date();
      const isAfterMarketClose = currentTime > marketCloseTime;

      companyData = await CompanyLevels.findOne({
        company,
        createdAt: {
          $gte: new Date(`${formattedYesterday}T00:00:00Z`),
          $lte: new Date(`${formattedYesterday}T23:59:59Z`),
        },
      });
      if (!companyData) {
        // Fetch yesterday's historical data if not found in the database
        const historicalData: any = await kite.getHistoricalData(
          instrumentToken,
          "day",
          formattedYesterday,
          formattedYesterday
        );

        if (historicalData && historicalData.length > 0) {
          const { high, low, close } = historicalData[0];

          // Store yesterday's data with the correct timestamp
          companyData = await CompanyLevels.create({
            company,
            high,
            low,
            close,
            createdAt: new Date(`${formattedYesterday}T23:59:59Z`), // Set createdAt to yesterday
          });

          console.log(
            `Fetched and stored historical data for ${company} (yesterday).`
          );
        } else if (isAfterMarketClose) {
          return NextResponse.json(
            { error: "Historical data not available for yesterday." },
            { status: 404 }
          );
        }
      }
    }
    return NextResponse.json({ ohlc }, { status: 200 });
  } catch (error: any) {
    console.error("Error in POST API:", error.message);
    return NextResponse.json(
      { error: "An unexpected error occurred.", details: error.message },
      { status: 500 }
    );
  }
}
