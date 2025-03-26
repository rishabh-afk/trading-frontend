import ExcelJS from "exceljs";
import { dbConnect } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Supertrend from "@/modals/Supertrend";

export async function GET(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const company = searchParams.get("company");
    if (!company) {
      return NextResponse.json(
        { success: false, error: "Company name is required." },
        { status: 400 }
      );
    }

    const today = new Date();

    // Set start of the day for 9:15 AM IST
    const startOfDay = new Date(today);
    startOfDay.setUTCHours(9 - 5, 15 - 30, 0, 0); // Adjust to UTC (IST - 5:30)

    // Set end of the day for 3:30 PM IST
    const endOfDay = new Date(today);
    endOfDay.setUTCHours(15 - 5, 30 - 30, 0, 0); // Adjust to UTC (IST - 5:30)

    const supertrendData = await Supertrend.find({
      company: company,
    });

    if (supertrendData.length === 0) {
      return NextResponse.json(
        { success: false, error: "No Supertrend data found." },
        { status: 404 }
      );
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(
      company.replace(/[^a-zA-Z0-9]/g, "_")
    );

    worksheet.addRow([
      "Company",
      "Trend",
      "date",
      "High",
      "Low",
      "close",
      "Open",
    ]).font = { bold: true };

    const formatToIST = (date) => {
      if (!date) return "N/A";
      return new Date(date).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      });
    };

    supertrendData.forEach((data) => {
      worksheet.addRow([
        data.company,
        data.trend,
        formatToIST(data.date),
        data.high,
        data.high,
        data.low,
        data.open,
        data.close,
      ]);
    });

    worksheet.columns.forEach((column) => (column.width = 20));

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Disposition": `attachment; filename="Supertrend_${company}.xlsx"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    console.error("Error generating Excel file:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error generating Excel file.",
      },
      { status: 500 }
    );
  }
}
