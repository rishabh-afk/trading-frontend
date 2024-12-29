import { NextRequest, NextResponse } from "next/server";
import { KiteConnect } from "kiteconnect";

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
    const url = "https://trading-frontend-roan.vercel.app";
    return NextResponse.redirect(url ?? "http://localhost:3001");
  } catch (error) {
    console.error("Error handling redirection:", (error as Error).message);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

/**
 * Fetches OHLC data for given instruments using KiteConnect.
 * @param {NextRequest} request - The incoming HTTP POST request object.
 * @returns {Promise<NextResponse>} - JSON response with OHLC data or error.
 */
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

    // Set the stored access token for KiteConnect
    kite.setAccessToken(accessToken);

    // Parse instruments from request body
    // const instrumentslist = await kite.getInstruments();
    // console.log(instrumentslist.slice(0, 10));
    const instruments = ["NSE:NIFTY BANK"];

    // Fetch data using KiteConnect
    const ohlc = await kite.getOHLC(instruments);

    return NextResponse.json({ ohlc }, { status: 200 });
  } catch (error) {
    console.error("Error fetching data:", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch data." },
      { status: 500 }
    );
  }
}
