"use client";
import axios from 'axios';
import { useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function HomeComponent() {
    const [formData, setFormData] = useState({
        high: 21801.45, // Example high value
        low: 16828.35,  // Example low value
        close: 21731.4, // Example close value
        currentPrice: 22000 // Current price for determining action
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: parseFloat(e.target.value)
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const resp = await axios.post("http://localhost:8000/api/trading/get-action", formData);
            const { message, success } = resp?.data;
            if (success) toast.info(message);
        } catch (error) {
            console.error("ERROR:", error);
            toast.error('An error occurred while processing your request.');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 px-4">
            <h1 className="text-4xl font-bold text-white mb-8 animate-fadeIn">Trading Prediction</h1>

            <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow-lg w-full max-w-lg animate-fadeIn">
                <div className="grid grid-cols-1 gap-3">
                    <div>
                        <label className="block text-lg font-semibold text-gray-700 mb-1">High</label>
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
                        <label className="block text-lg font-semibold text-gray-700 mb-1">Low</label>
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
                        <label className="block text-lg font-semibold text-gray-700 mb-1">Close</label>
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
                        <label className="block text-lg font-semibold text-gray-700 mb-1">Current Price</label>
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

                <button
                    type="submit"
                    className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-semibold shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-300 ease-in-out"
                >
                    Predict
                </button>
            </form>
        </div>
    );
}
