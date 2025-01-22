import ExcelJS from "exceljs";
import Trade from "@/modals/Trade";
import { dbConnect } from "@/lib/mongodb";
import { NextResponse } from "next/server";

/**
 * Generate Excel File for Trade Data
 * @param {Request} request
 * @returns {Promise<NextResponse>}
 */
export async function GET(request) {
  try {
    // Connect to the database
    await dbConnect();

    // Extract company filter from query
    const { searchParams } = new URL(request.url);
    const company = searchParams.get("company");
    if (!company) {
      return NextResponse.json(
        {
          success: false,
          error: "Company name is required as a query parameter.",
        },
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

    // Find trades for the specified company within active market hours
    const trades = await Trade.find({
      company: company,
      // createdAt: {
      //   $gte: startOfDay,
      //   $lte: endOfDay,
      // },
    });

    if (trades.length === 0) {
      return NextResponse.json(
        { success: false, error: "No trades found for the specified company." },
        { status: 404 }
      );
    }

    const sanitizeSheetName = (name) => {
      return name.replace(/[\\\/\*\?\:\[\]]/g, "_");
    };

    // Create a new Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(
      sanitizeSheetName(`Trades-${company}`)
    );

    // Define header row with styles
    worksheet
      .addRow([
        "Company",
        "High",
        "Low",
        "Close",
        "Price",
        "Signal",
        "Entry Time",
        "Exit Time",
        "Pivot",
        "BC",
        "TC",
        "R1",
        "R2",
        "R3",
        "R4",
        "S1",
        "S2",
        "S3",
        "S4",
        "Buffer",
      ])
      .eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD700" }, // Gold color
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

    const formatToIST = (date) => {
      if (!date) return "N/A";
      return new Date(date).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      });
    };

    // Add data rows
    trades.forEach((trade) => {
      worksheet.addRow([
        trade.company,
        trade.high,
        trade.low,
        trade.close,
        trade.price,
        trade.signal,
        formatToIST(trade.entryTime),
        formatToIST(trade.exitTime),
        trade.levels.pivot,
        trade.levels.bc,
        trade.levels.tc,
        trade.levels.r1,
        trade.levels.r2,
        trade.levels.r3,
        trade.levels.r4,
        trade.levels.s1,
        trade.levels.s2,
        trade.levels.s3,
        trade.levels.s4,
        trade.bufferValue ?? "N/A",
      ]);
    });

    // Apply formatting for all data rows
    worksheet.eachRow((row, rowIndex) => {
      if (rowIndex > 1) {
        row.eachCell((cell) => {
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };

          // Conditional formatting for levels
          if (
            [
              "Pivot",
              "BC",
              "TC",
              "R1",
              "R2",
              "R3",
              "R4",
              "S1",
              "S2",
              "S3",
              "S4",
            ].includes(cell.value)
          ) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "E0FFFF" }, // Light Cyan for levels
            };
          }
        });
      }
    });

    // Adjust column widths
    worksheet.columns.forEach((column) => {
      column.width = 20; // Set a standard column width
    });

    // Generate Excel file buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Return the Excel file as a response
    return new NextResponse(buffer, {
      headers: {
        "Content-Disposition": `attachment; filename="Trades_${company}.xlsx"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    console.error("Error generating Excel file:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error.message || "An error occurred while generating the Excel file.",
      },
      { status: 500 }
    );
  }
}
