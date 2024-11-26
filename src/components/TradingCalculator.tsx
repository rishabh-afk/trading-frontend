"use client";
import axios from "axios";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CalculatedPoints from "./CalculatedPoints";

export default function HomeComponent() {
  const [points, setPoints] = useState<any>({});
  const [formData, setFormData] = useState({
    high: 21801.45, // Example high value
    low: 16828.35, // Example low value
    close: 21731.4, // Example close value
    currentPrice: 22000, // Current price for determining action
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: parseFloat(e.target.value),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resp = await axios.post(
        "https://trading-frontend-roan.vercel.app/api/trading/get-action",
        formData
      );
      const { message, data, success } = resp?.data;
      if (success) {
        setPoints(data);
        toast.info(message);
      }
    } catch (error) {
      console.error("ERROR:", error);
      toast.error("An error occurred while processing your request.");
    }
  };

  const buy = async (formData: any) => {
    try {
      const resp = await axios.post(
        "https://trading-frontend-roan.vercel.app/api/trading/get-action",
        formData
      );
      const { message, data, success } = resp?.data;
      if (success) {
        setPoints(data);
        toast.info(message);
      }
    } catch (error) {
      console.error("ERROR:", error);
      toast.error("An error occurred while processing your request.");
    }
  };

  const makeApiCall = async () => {
    try {
      const resp = await axios.post(
        "https://trading-frontend-roan.vercel.app/api/trading/redirect"
      );
      const { ohlc } = resp?.data;
      console.log(ohlc);
      const lastPrice = ohlc["NSE:NIFTY BANK"].last_price;
      const highPrice = ohlc["NSE:NIFTY BANK"].ohlc.high;
      const lowPrice = ohlc["NSE:NIFTY BANK"].ohlc.low;
      const closePrice = ohlc["NSE:NIFTY BANK"].ohlc.close;

      setFormData({
        high: highPrice,
        low: lowPrice,
        close: closePrice,
        currentPrice: lastPrice, // Update current price to the latest fetched value
      });
      buy({
        high: highPrice,
        low: lowPrice,
        close: closePrice,
        currentPrice: lastPrice, // Update current price to the latest fetched value
      });
    } catch (error) {
      console.error("ERROR:", error);
      toast.error("An error occurred while processing your request.");
    }
  };

  useEffect(() => {
    const startTime = new Date();
    startTime.setHours(9, 15, 0, 0); // Set to 9:15 AM

    const endTime = new Date();
    endTime.setHours(23, 30, 0, 0); // Set to 3:30 PM

    const now = new Date();

    let intervalId: NodeJS.Timeout; // Move intervalId declaration here to access in the cleanup

    if (now > startTime && now < endTime) {
      const intervalTime = 1 * 60 * 1000; // 3 minutes in milliseconds
      let currentTime = new Date();

      // If it's already past 9:15, calculate the first interval start time
      let firstIntervalTime = startTime.getTime() - currentTime.getTime();
      if (firstIntervalTime < 0) {
        firstIntervalTime = 0;
      }

      // Start making API calls after 9:15 AM
      intervalId = setInterval(() => {
        // Check if it's past 3:30 PM, stop the interval if it is
        if (new Date() > endTime) {
          clearInterval(intervalId);
          toast.info("End of trading session at 3:30 PM");
          return;
        }
        makeApiCall(); // Make the API call
      }, intervalTime);

      // Initial delay until 9:15 AM
      setTimeout(() => {
        makeApiCall(); // Make the first API call
      }, firstIntervalTime);
    } else {
      toast.info("Trading session starts at 9:15 AM");
    }

    // Cleanup function to clear the interval on component unmount
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const handleLogin = () => {
    window.location.href = "/api/trading/login";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 px-4">
      <div className="flex justify-center items-center mb-10 gap-10">
        <h1 className="text-4xl font-bold text-white animate-fadeIn">
          Trading Prediction
        </h1>
        <button
          onClick={handleLogin}
          className="bg-blue-500 text-white text-lg rounded px-4 py-2"
        >
          Login
        </button>
      </div>
      <div className="flex justify-between gap-5 items-center">
        <CalculatedPoints points={points} />
        <form
          onSubmit={handleSubmit}
          className="bg-white p-4 rounded-lg shadow-lg w-1/2 animate-fadeIn"
        >
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-1">
                High
              </label>
              <input
                type="number"
                name="high"
                value={formData.high}
                onChange={handleChange}
                className="mt-1 p-3 border border-gray-300 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-1">
                Low
              </label>
              <input
                type="number"
                name="low"
                value={formData.low}
                onChange={handleChange}
                className="mt-1 p-3 border border-gray-300 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-1">
                Close
              </label>
              <input
                type="number"
                name="close"
                value={formData.close}
                onChange={handleChange}
                className="mt-1 p-3 border border-gray-300 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-1">
                Current Price
              </label>
              <input
                type="number"
                name="currentPrice"
                value={formData.currentPrice}
                onChange={handleChange}
                className="mt-1 p-3 border border-gray-300 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* <button
            type="submit"
            className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-semibold shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-300 ease-in-out"
          >
            Predict
          </button> */}
        </form>
      </div>
    </div>
  );
}
