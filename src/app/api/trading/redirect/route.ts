import { KiteConnect } from "kiteconnect";
import { dbConnect } from "@/lib/mongodb";
import Supertrend from "@/modals/Supertrend";
import CompanyLevels from "@/modals/CompanyLevel";
import { NextRequest, NextResponse } from "next/server";
import Trade from "@/modals/Trade";

interface HistoricalData {
  high: number;
  low: number;
  close: number;
}

// Kite SDK instance
const kite = new KiteConnect({
  api_key: process.env.KITE_API_KEY || "",
});

let accessToken: string | null = null;

/**
 * Fetches historical OHLC data for the given company for at least 14 periods.
 */
async function getHistoricalDataFunc(
  instrumentToken: number,
  startDate: string,
  endDate: string,
  period: number = 14
): Promise<HistoricalData[]> {
  try {
    const historicalData: any = await kite.getHistoricalData(
      instrumentToken,
      "3minute",
      startDate,
      endDate
    );

    if (!historicalData || historicalData.length < period) {
      throw new Error(
        "Insufficient historical data for Supertrend calculation."
      );
    }

    // Extract relevant OHLC data
    const formattedData: HistoricalData[] = historicalData.map((data: any) => ({
      low: data.low,
      high: data.high,
      close: data.close,
    }));

    return formattedData;
  } catch (error) {
    console.error("Error fetching historical data:", error);
    return [];
  }
}

/**
 * Calculates the Supertrend indicator based on historical OHLC data.
 */
// function calculateSupertrend(
//   ohlcData: HistoricalData[],
//   period: number = 10,
//   multiplier: number = 3.5
// ) {
//   if (ohlcData.length === 0) {
//     throw new Error("Insufficient historical data for Supertrend calculation.");
//   }

//   let atr: number[] = [];
//   let upperBand: number[] = [];
//   let lowerBand: number[] = [];
//   let supertrend: ("bullish" | "bearish")[] = [];

//   // Calculate ATR (Average True Range)
//   for (let i = 1; i < ohlcData.length; i++) {
//     const prevClose = ohlcData[i - 1].close;
//     const highLow = ohlcData[i].high - ohlcData[i].low;
//     const highPrevClose = Math.abs(ohlcData[i].high - prevClose);
//     const lowPrevClose = Math.abs(ohlcData[i].low - prevClose);

//     const trueRange = Math.max(highLow, highPrevClose, lowPrevClose);
//     atr.push(trueRange);
//   }

//   const smoothedATR = atr.map(
//     (_, i, arr) =>
//       arr.slice(Math.max(0, i - period + 1), i + 1).reduce((a, b) => a + b, 0) /
//       Math.min(period, i + 1)
//   );

//   // Calculate Supertrend
//   for (let i = 0; i < ohlcData.length; i++) {
//     const hl2 = (ohlcData[i].high + ohlcData[i].low) / 2;
//     upperBand[i] = Number((hl2 + multiplier * 5).toFixed(2));
//     // upperBand[i] = Number((hl2 + multiplier * smoothedATR[i - 1]).toFixed(2));
//     lowerBand[i] = Number((hl2 - multiplier * 5).toFixed(2));
//     // lowerBand[i] = Number((hl2 - multiplier * smoothedATR[i - 1]).toFixed(2));

//     if (i === period || supertrend[i - 1] === "bearish") {
//       supertrend[i] = ohlcData[i].close > lowerBand[i] ? "bullish" : "bearish";
//     } else {
//       supertrend[i] = ohlcData[i].close < upperBand[i] ? "bearish" : "bullish";
//     }
//   }

//   return {
//     trend: supertrend[ohlcData.length - 1],
//     upperBand: upperBand[ohlcData.length - 1],
//     lowerBand: lowerBand[ohlcData.length - 1],
//   };
// }

function calculateSupertrend(
  ohlcData: HistoricalData[],
  period: number = 10,
  multiplier: number = 3.5
) {
  if (ohlcData.length === 0) {
    throw new Error("Insufficient historical data for Supertrend calculation.");
  }

  let upperBand: number[] = [];
  let lowerBand: number[] = [];
  let supertrend: ("bullish" | "bearish")[] = [];

  // ATR is set to a constant value of 5
  const atr = 5;

  // Calculate Supertrend
  for (let i = 0; i < ohlcData.length; i++) {
    const hl2 = (ohlcData[i].high + ohlcData[i].low) / 2;
    upperBand[i] = Number((hl2 + multiplier * atr).toFixed(2));
    lowerBand[i] = Number((hl2 - multiplier * atr).toFixed(2));

    if (i === period || supertrend[i - 1] === "bearish") {
      supertrend[i] = ohlcData[i].close > lowerBand[i] ? "bullish" : "bearish";
    } else {
      supertrend[i] = ohlcData[i].close < upperBand[i] ? "bearish" : "bullish";
    }
  }

  return {
    trend: supertrend[ohlcData.length - 1],
    upperBand: upperBand[ohlcData.length - 1],
    lowerBand: lowerBand[ohlcData.length - 1],
  };
}

async function saveSupertrendData(
  companyName: string,
  supertrendResult: ReturnType<typeof calculateSupertrend>
) {
  const data = new Supertrend({
    company: companyName,
    ...supertrendResult,
  });

  await data.save();
}

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
        const startDate = formattedYesterday; // "YYYY-MM-DD"
        const endDate = formattedYesterday; // "YYYY-MM-DD"

        const historicalData: any = await kite.getHistoricalData(
          instrumentToken,
          "day",
          startDate,
          endDate
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

export async function DELETE(request: NextRequest): Promise<NextResponse> {
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
      date,
      historical = true,
    }: { companies: string; date: string; historical?: boolean } = body;

    company = company[0];

    if (!company || !date) {
      return NextResponse.json(
        { error: "Company name and date are required in the request body." },
        { status: 400 }
      );
    }

    // Convert date from "DD-MM-YYYY" to "YYYY-MM-DD"
    const [day, month, year] = date.split("-").map(Number);
    const formattedDate = `${year}-${String(month).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;

    const ohlc = await kite.getOHLC([company]);
    const instrumentToken = ohlc[company]?.instrument_token;

    let companyData: HistoricalData | null = null;

    if (historical) {
      const marketCloseTime = new Date();
      marketCloseTime.setHours(17, 30, 0, 0); // 5:30 PM IST

      const currentTime = new Date();
      const isAfterMarketClose = currentTime > marketCloseTime;

      // Check if data already exists in the database
      companyData = await CompanyLevels.findOne({
        company,
        createdAt: {
          $gte: new Date(`${formattedDate}T00:00:00Z`),
          $lte: new Date(`${formattedDate}T23:59:59Z`),
        },
      });

      if (!companyData) {
        // Fetch historical data for the provided date
        const historicalData: any = await kite.getHistoricalData(
          instrumentToken,
          "day",
          formattedDate,
          formattedDate
        );

        if (historicalData && historicalData.length > 0) {
          const { high, low, close } = historicalData[0];

          // Store historical data with the correct timestamp
          companyData = await CompanyLevels.create({
            company,
            high,
            low,
            close,
            createdAt: new Date(`${formattedDate}T23:59:59Z`), // Set createdAt to given date
          });

          console.log(
            `Fetched and stored historical data for ${company} (${formattedDate}).`
          );
        } else if (isAfterMarketClose) {
          return NextResponse.json(
            { error: `Historical data not available for ${date}.` },
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

export async function PATCH(req: Request) {
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
    const { price, company, date } = await req.json();

    // Convert date from "DD-MM-YYYY" to "YYYY-MM-DD"
    const [day, month, year] = date.split("-").map(Number);
    const formattedDate = `${year}-${String(month).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;

    // Fetch historical daily data from the database
    // const historicalData = await CompanyLevels.findOne({
    //   company,
    //   createdAt: {
    //     $gte: new Date(`${formattedDate}T00:00:00Z`),
    //     $lte: new Date(`${formattedDate}T23:59:59Z`),
    //   },
    // });

    // if (!historicalData) {
    //   return NextResponse.json(
    //     { error: "Historical Data not found" },
    //     { status: 400 }
    //   );
    // }

    const ohlcData = await kite.getOHLC([company]);
    const instrumentToken = ohlcData[company]?.instrument_token;

    // Convert to YYYY-MM-DD format
    const [dayl, monthl, yearl] = date.split("-");
    const givenDate = new Date(`${yearl}-${monthl}-${dayl}`);
    givenDate.setDate(givenDate.getDate() - 1);
    const formattedDatel = givenDate.toISOString().split("T")[0];

    const ohlc: any = await kite.getHistoricalData(
      instrumentToken,
      "3minute",
      formattedDate,
      formattedDate
    );

    if (!ohlc || ohlc.length === 0) {
      return NextResponse.json(
        { error: "No 3-minute data found." },
        { status: 400 }
      );
    }
    // Fetch intraday data for the given date
    const historicalData: any = await kite.getHistoricalData(
      instrumentToken,
      "day", // Use 'minute' or 'hour' interval to get exact 3:30 PM data
      formattedDatel,
      formattedDatel
    );

    const trades = [];
    const { high, low, close } = historicalData[0];
    const bc = parseFloat(((high + low) / 2).toFixed(2));
    const percentageValue = parseFloat((bc * 0.0006).toFixed(2));
    const bufferValue = Math.round(percentageValue);
    for (const candle of ohlc) {
      const { open, date } = candle;
      const trade = new Trade({
        high,
        low,
        close,
        company,
        price: open,
        bufferValue,
        createdAt: date,
        updatedAt: date,
      });
      trade.calculateLevels();
      const { signal } = trade.generateSignal(bufferValue);
      if (signal === "Buy" || signal === "Sell") {
        const lastTrade = await Trade.findOne({ company }).sort({
          createdAt: -1,
        });
        if (lastTrade) {
          if (lastTrade.signal !== signal)
            trade.type = lastTrade.type === "Entry" ? "Exit" : "Entry";
          else continue;
        } else trade.type = "Entry";
        await trade.save();
        trades.push(trade);
      }
    }
    return NextResponse.json({ message: "Success" }, { status: 200 });
  } catch (error: any) {
    console.error("Error creating trade:", error.message);
    return NextResponse.json(
      { error: error.message || "Error creating trade" },
      { status: 500 }
    );
  }
}

/**
 * PUT request handler for calculating the Supertrend indicator.
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    if (!accessToken) {
      return NextResponse.json(
        { error: "User not authenticated. Please log in." },
        { status: 401 }
      );
    }

    await dbConnect();
    const body = await request.json();
    let {
      company,
      period = 10,
      multiplier = 3,
    }: { company: string; period?: number; multiplier?: number } = body;

    if (!company) {
      return NextResponse.json(
        { error: "Company name is required." },
        { status: 400 }
      );
    }

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const formattedYesterday = yesterday.toISOString().split("T")[0];

    const ohlc = await kite.getOHLC([company]);
    const instrumentToken = ohlc[company]?.instrument_token;

    if (!instrumentToken) {
      return NextResponse.json(
        { error: "Instrument token not found for the company." },
        { status: 404 }
      );
    }

    // Get the start date (based on 14 candles)
    const startDate = new Date();
    startDate.setMinutes(startDate.getMinutes() - 14 * 3);
    const formattedStartDate = startDate.toISOString().split("T")[0];

    const historicalData: any = await getHistoricalDataFunc(
      instrumentToken,
      formattedYesterday,
      formattedStartDate
    );

    if (!historicalData || historicalData.length < 14) {
      return NextResponse.json(
        { error: "Insufficient historical data for Supertrend calculation." },
        { status: 400 }
      );
    }

    if (!historicalData) {
      return NextResponse.json(
        { error: "Historical data not available." },
        { status: 404 }
      );
    }

    const supertrend: any = calculateSupertrend(
      historicalData,
      historicalData.length,
      multiplier
    );

    await saveSupertrendData(company, {
      ...supertrend,
      currentPrice: ohlc[company]?.last_price,
    });

    return NextResponse.json(
      {
        high: historicalData.high,
        low: historicalData.low,
        close: historicalData.close,
        currentPrice: ohlc[company]?.last_price,
        supertrend,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error in Supertrend API:", error.message);
    return NextResponse.json(
      { error: "An unexpected error occurred.", details: error.message },
      { status: 500 }
    );
  }
}
