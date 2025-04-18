import axios from "axios";
import React from "react";
import { toast } from "react-toastify";

const DownloadExcel = ({ selectedCompany }: { selectedCompany: any }) => {
  const handleDownloadExcel = async () => {
    try {
      selectedCompany = "NSE:LT";
      if (!selectedCompany) return toast.info("Please select a company!");
      const response = await axios.get(
        "/api/generate-excel?company=" + "BSE:SENSEX",
        { responseType: "blob" }
      );

      // Create a URL for the blob
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);

      // Create a link element and trigger a download
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "trades.xlsx"); // Specify the default file name
      document.body.appendChild(link); // Append the link to the body (it won't be visible)
      link.click(); // Programmatically click the link to trigger the download

      // Clean up the URL object after download
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.info("No Data Found");
      // console.error("Error downloading Excel file", error);
    }
  };
  return (
    <button
      onClick={handleDownloadExcel}
      className="bg-green-500 text-white text-lg rounded px-4 py-2"
    >
      Download Trades
    </button>
  );
};

export default DownloadExcel;
