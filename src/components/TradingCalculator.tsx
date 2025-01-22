"use client";

import axios from "axios";
import Runtimer from "./Runtimer";
import { toast } from "react-toastify";
import LoginButton from "./LoginButton";
import { Suspense, useState } from "react";
import DownloadExcel from "./DownloadExcel";
import "react-toastify/dist/ReactToastify.css";
import CalculatedPoints from "./CalculatedPoints";

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
  { label: "Sensex", value: "BSE:SENSEX" }, // Added Sensex
];
export default function HomeComponent() {
  const [selectedCompany, setSelectedCompany] = useState(companies[0].value);
  const [points, setPoints] = useState<any>({});
  const [formData, setFormData] = useState({
    currentPrice: 24250,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: parseFloat(value) || value,
    });
    if (name === "company") setSelectedCompany(value);
  };

  const buy = async (data: any) => {
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
  const makeApiCall = async (selectedCompany: any) => {
    try {
      if (!selectedCompany) {
        return toast.warn("Please select a company!");
      }
      const response = await axios.post(`${BASEURL}/api/trading/redirect`, {
        companies: [selectedCompany], // Send the selected company to the API
      });
      const { ohlc } = response?.data;
      if (ohlc && ohlc[selectedCompany]) {
        const companyData = ohlc[selectedCompany];

        if (companyData) {
          const lastPrice = companyData.last_price;
          setFormData({ currentPrice: lastPrice });
          await buy({ currentPrice: lastPrice });
        } else toast.error("Selected company's data is unavailable.");
      } else {
        toast.error("Failed to fetch data for the selected company.");
      }
    } catch (error: any) {
      console.error("Error fetching market data:", error);

      // Handle different types of errors and display appropriate messages
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "An unexpected error occurred while fetching market data.";

      toast.error(errorMessage);
    }
  };

  return (
    <div className="flex flex-col p-10 items-center justify-center min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 px-4">
      <div className="flex justify-center items-center mb-8 gap-6">
        <h1 className="text-4xl font-bold text-white animate-fadeIn">
          Trading Prediction
        </h1>
        <Suspense fallback={<div>Loading...</div>}>
          <LoginButton />
        </Suspense>
        <Runtimer selectedCompany={selectedCompany} makeApiCall={makeApiCall} />
        <DownloadExcel selectedCompany={selectedCompany} />
      </div>
      <div className="bg-gray-700 rounded-lg p-6 shadow-lg text-white max-w-md w-full">
        <h2 className="text-lg font-semibold mb-4">Select Company</h2>
        <div className="mb-4">
          <select
            name="company"
            required={true}
            value={selectedCompany}
            onChange={handleChange}
            className="w-full p-3 rounded-md bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {companies.map((company) => (
              <option key={company.value} value={company.value}>
                {company.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => makeApiCall(selectedCompany)}
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
