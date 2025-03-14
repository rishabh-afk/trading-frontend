"use client";

import axios from "axios";
import Runtimer from "./Runtimer";
import { toast } from "react-toastify";
import LoginButton from "./LoginButton";
import DownloadExcel from "./DownloadExcel";
import "react-toastify/dist/ReactToastify.css";
import CalculatedPoints from "./CalculatedPoints";
import { Suspense, useRef, useState } from "react";
import DownloadSupertrendExcel from "./DownloadSupertrendExcel";

const BASEURL =
  process.env.NEXT_PUBLIC_API_URL || "https://trading-frontend-roan.vercel.app";

const companies = [
  { label: "TCS", value: "NSE:TCS" },
  { label: "Infosys", value: "NSE:INFY" },
  { label: "Nifty 50", value: "NSE:NIFTY 50" },
  { label: "Reliance", value: "NSE:RELIANCE" },
  { label: "Larsen & Toubro", value: "NSE:LT" },
  { label: "HDFC Bank", value: "NSE:HDFCBANK" },
  { label: "ICICI Bank", value: "NSE:ICICIBANK" },
  { label: "Nifty Bank", value: "NSE:NIFTY BANK" },
  { label: "State Bank of India", value: "NSE:SBIN" },
  { label: "Kotak Mahindra Bank", value: "NSE:KOTAKBANK" },
  { label: "Sensex", value: "BSE:SENSEX" },
];

export default function HomeComponent() {
  const [points, setPoints] = useState<any>({});
  const selectRef = useRef<HTMLSelectElement>(null);

  const buy = async (data: any, selectedCompany: string) => {
    try {
      const response = await axios.post(`${BASEURL}/api/trades`, {
        price: data.currentPrice,
        company: selectedCompany,
      });
      const { message, trade, success } = response?.data;
      if (success) {
        setPoints(trade?.levels);
        toast.success(message);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to execute trade.");
    }
  };

  const makeApiCall = async () => {
    const selectedCompany = selectRef.current?.value;
    if (!selectedCompany) return toast.warn("Please select a company!");
    try {
      // const response = await axios.post(`${BASEURL}/api/trading/redirect`, {
      //   companies: [selectedCompany],
      // });
      // const { ohlc } = response?.data;
      // if (ohlc && ohlc[selectedCompany]) {
      //   const lastPrice = ohlc[selectedCompany].last_price;
      //   await buy({ currentPrice: lastPrice }, selectedCompany);
      // } else toast.error("Selected company's data is unavailable.");
      // const response2 = await axios.put(`${BASEURL}/api/trading/redirect`, {
      //   company: selectedCompany,
      // });
      // if (response2.data) showSupertrendToast(response2.data);
      const response = await axios.patch(`${BASEURL}/api/trading/redirect`, {
        company: selectedCompany,
        date: "12-03-2025",
      });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Error fetching market data."
      );
    }
  };

  // const showSupertrendToast = (data: {
  //   currentPrice: number;
  //   supertrend: { trend: string; upperBand: number; lowerBand: number };
  // }) => {
  //   const { currentPrice, supertrend } = data;
  //   const trendColor = supertrend.trend === "bullish" ? "#22C55E" : "#EF4444";
  //   toast(
  //     `📊 Supertrend Alert: ${supertrend.trend.toUpperCase()}\nCurrent Price: ₹${currentPrice}\nUpper Band: ₹${
  //       supertrend.upperBand
  //     }\nLower Band: ₹${supertrend.lowerBand}`,
  //     {
  //       position: "top-right",
  //       autoClose: 5000,
  //       theme: "dark",
  //       style: { backgroundColor: trendColor, color: "#fff" },
  //     }
  //   );
  // };

  return (
    <div className="flex flex-col p-10 items-center justify-center min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 px-4">
      <div className="flex justify-center items-center mb-8 gap-6">
        <h1 className="text-4xl font-bold text-white">Trading Prediction</h1>
        <Suspense fallback={<div>Loading...</div>}>
          <LoginButton />
        </Suspense>
        <Runtimer
          makeApiCall={makeApiCall}
          selectedCompany={selectRef.current?.value}
        />
        <DownloadExcel selectedCompany={selectRef.current?.value} />
        <DownloadSupertrendExcel selectedCompany={selectRef.current?.value} />
      </div>
      <div className="bg-gray-700 rounded-lg p-6 shadow-lg text-white max-w-md w-full">
        <h2 className="text-lg font-semibold mb-4">Select Company</h2>
        <div className="mb-4">
          <select
            ref={selectRef}
            className="w-full p-3 rounded-md bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a company</option>
            {companies.map((company) => (
              <option key={company.value} value={company.value}>
                {company.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={makeApiCall}
          className="mt-2 w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-md shadow-md transition duration-200"
        >
          Fetch & Execute Trade
        </button>
      </div>
      <div className="mt-10 w-full mx-auto">
        <CalculatedPoints points={points} />
      </div>
    </div>
  );
}
