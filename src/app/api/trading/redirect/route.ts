import Trade from "@/modals/Trade";
import { KiteConnect } from "kiteconnect";
import { dbConnect } from "@/lib/mongodb";
import Supertrend from "@/modals/Supertrend";
import CompanyLevels from "@/modals/CompanyLevel";
import { NextRequest, NextResponse } from "next/server";

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

    return historicalData;
  } catch (error) {
    console.error("Error fetching historical data:", error);
    return [];
  }
}

function calculateTrueRange(high: number, low: number, prevClose: number) {
  return Math.max(
    high - low,
    Math.abs(high - prevClose),
    Math.abs(low - prevClose)
  );
}

function calculateATR(
  data: { high: number; low: number; close: number }[],
  period: number = 14
): (number | null)[] {
  let atrArray: (number | null)[] = new Array(period - 1).fill(null);
  let trArray: number[] = [];

  for (let i = 0; i < data.length; i++) {
    let prevClose = i === 0 ? data[i].close : data[i - 1].close;
    let tr = Number(
      calculateTrueRange(data[i].high, data[i].low, prevClose).toFixed(2)
    );
    trArray.push(tr);

    if (i >= period - 1) {
      let atr =
        trArray
          .slice(i - period + 1, i + 1)
          .reduce((sum, val) => sum + val, 0) / period;
      atrArray.push(Number(atr.toFixed(2)));
    }
  }
  return atrArray;
}

/**
 * Calculates the Supertrend indicator based on historical OHLC data.
 */
function calculateSupertrend(data: any[], period = 14, multiplier = 3) {
  let atrArray = calculateATR(data, period);
  let supertrendData: any[] = new Array(data.length).fill(null);

  let prevSupertrend = null;
  let trend = "neutral"; // Default trend

  for (let i = 0; i < data.length; i++) {
    if (atrArray[i] === null) continue; // Skip until ATR is available

    let midPoint = (data[i].high + data[i].low) / 2;
    let atr = atrArray[i] as number;

    let upperBand = Number((midPoint + multiplier * atr).toFixed(2));
    let lowerBand = Number((midPoint - multiplier * atr).toFixed(2));

    if (i === period - 1) {
      trend = data[i].close > upperBand ? "bullish" : "bearish";
      prevSupertrend = trend === "bullish" ? lowerBand : upperBand;
    } else if (i > period - 1) {
      if (data[i].close > prevSupertrend!) {
        trend = "bullish";
        prevSupertrend = lowerBand;
      } else if (data[i].close < prevSupertrend!) {
        trend = "bearish";
        prevSupertrend = upperBand;
      }
    }

    supertrendData[i] = {
      value: prevSupertrend,
      trend: trend,
      ...data[i],
    };
  }

  return supertrendData.slice(-1); // Return the latest Supertrend value
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

    const ohlcData = await kite.getOHLC([company]);
    const instrumentToken = ohlcData[company]?.instrument_token;

    // Convert to YYYY-MM-DD format
    const daten = "14-03-2025";
    const [dayl, monthl, yearl] = daten.split("-");
    const givenDate = new Date(`${yearl}-${monthl}-${dayl}`);
    givenDate.setDate(givenDate.getDate() - 1);
    const formattedDatel = givenDate.toISOString().split("T")[0];

    let ohlc: any = await kite.getHistoricalData(
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

    // ohlc = ohlc.slice(5);

    const formatToIST = (date: any) => {
      if (!date) return "N/A";
      return new Date(date).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      });
    };

    for (const candle of ohlc) {
      const {
        open,
        high: highAmount,
        low: lowAmount,
        close: closeAmount,
        date,
      } = candle;
      // console.log(formatToIST(date), open, lowAmount, highAmount, closeAmount);
      const trade = new Trade({
        high,
        low,
        close,
        company,
        bufferValue,
        createdAt: date,
        updatedAt: date,
        price: closeAmount,
      });
      trade.calculateLevels();

      const { signal } = trade.generateSignal(bufferValue);
      const lastTrade = await Trade.findOne({ company }).sort({
        createdAt: -1,
      });
      if (lastTrade) {
        // if (signal !== "No Action" && lastTrade.signal !== signal)
        //   console.log(trade.levels, closeAmount, signal, formatToIST(date));
        const { signal: exitSignal, reason } = trade.exitSignal(
          lastTrade.signal,
          bufferValue,
          open
        );
        if (
          signal !== "Exit" &&
          exitSignal === "Exit" &&
          signal !== "No Action" &&
          lastTrade.signal !== "Exit" &&
          lastTrade.signal !== signal
        ) {
          trade.signal = exitSignal;
          trade.type = exitSignal;
          trade.reason = reason;
          await trade.save();
          trades.push(trade);
          continue;
        }
      }
      if (signal === "Buy" || signal === "Sell" || signal === "Exit") {
        if (lastTrade) {
          if (lastTrade.signal !== signal) {
            if (signal === "Exit") trade.type = "Exit";
            else trade.type = lastTrade.type === "Entry" ? "Exit" : "Entry";
          } else continue;
        } else {
          if (signal !== "Exit") trade.type = "Entry";
          else continue;
        }
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
    // let {
    //   date,
    //   company,
    //   prevdate,
    //   period = 5,
    //   multiplier = 3,
    // }: {
    //   date: any;
    //   prevdate: any;
    //   company: string;
    //   period?: number;
    //   multiplier?: number;
    // } = body;

    // if (!company) {
    //   return NextResponse.json(
    //     { error: "Company name is required." },
    //     { status: 400 }
    //   );
    // }

    // const ohlc = await kite.getOHLC([company]);
    // const instrumentToken = ohlc[company]?.instrument_token;

    // if (!instrumentToken) {
    //   return NextResponse.json(
    //     { error: "Instrument token not found for the company." },
    //     { status: 404 }
    //   );
    // }

    // let historicalData: any = await getHistoricalDataFunc(
    //   instrumentToken,
    //   date,
    //   date
    // );

    // if (!historicalData) {
    //   return NextResponse.json(
    //     { error: "Historical data not available." },
    //     { status: 404 }
    //   );
    // }

    const orderData = {
      price: 1,
      quantity: 10,
      product: "MIS",
      exchange: "BSE",
      validity: "DAY",
      order_type: "MARKET",
      trigger_price: 1615,
      tradingsymbol: "INFY",
      transaction_type: "BUY",
    };

    const orderParams: any = {
      exchange: "NSE",
      price: orderData.price || 0,
      product: orderData.product,
      quantity: orderData.quantity,
      order_type: orderData.order_type,
      validity: orderData.validity || "DAY",
      tradingsymbol: orderData.tradingsymbol,
      trigger_price: orderData.trigger_price || 0,
      transaction_type: orderData.transaction_type,
      amo: true,
    };

    const orderResponse = await kite.placeOrder("regular", {
      ...orderParams,
      amo: true,
    });
    console.log(orderResponse);

    // Function to fetch previous day's data
    // const fetchPreviousDayData = async (attemptDate: any) => {
    //   return await getHistoricalDataFunc(
    //     instrumentToken,
    //     attemptDate,
    //     attemptDate
    //   );
    // };

    // for (let i = 0; i < historicalData.length; i++) {
    //   let fetchedData: any[] = [];

    //   if (i < period) {
    //     let prevData = (await fetchPreviousDayData(prevdate)) ?? [];
    //     let currentData = historicalData.slice(0, i);

    //     const remainingNeeded = period - currentData.length;
    //     if (remainingNeeded > 0 && prevData.length > 0) {
    //       prevData = prevData.slice(-remainingNeeded);
    //     }

    //     if (prevData.length === 0) break; // Ensure we have enough data

    //     fetchedData = [...prevData, ...currentData];
    //   } else {
    //     fetchedData = historicalData.slice(i - period, i);
    //   }

    //   // process my data
    //   const supertrend: any = calculateSupertrend(
    //     [...fetchedData, ...fetchedData],
    //     period,
    //     multiplier
    //   );
    //   if (supertrend && supertrend.length > 0) {
    //     const lastTrade = await Supertrend.findOne({ company }).sort({
    //       createdAt: -1,
    //     });
    //     if (!lastTrade || lastTrade?.trend !== supertrend[0]?.trend)
    //       await saveSupertrendData(company, {
    //         ...supertrend[0],
    //         currentPrice: supertrend[0]?.close,
    //       });
    //   }
    // }
    return NextResponse.json({ message: "success" }, { status: 200 });
  } catch (error: any) {
    console.error("Error in Supertrend API:", error.message);
    return NextResponse.json(
      { error: "An unexpected error occurred.", details: error.message },
      { status: 500 }
    );
  }
}
