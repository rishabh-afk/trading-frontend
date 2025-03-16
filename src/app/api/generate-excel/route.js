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
    endOfDay.setUTCHours(22 - 5, 30 - 30, 0, 0); // Adjust to UTC (IST - 5:30)

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

    const formatToIST = (date) => {
      if (!date) return "N/A";
      return new Date(date).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      });
    };

    // Define header row with styles
    worksheet
      .addRow([
        // "Company",
        // "High",
        // "Low",
        // "Close",
        "BUY / SELL / EXIT (No Trade Zone)",
        "Entry Reason",
        "Entry Time",
        "Entry Price",
        "Exit Reason",
        "Exit Time",
        "Exit Price",
        "Profit / Loss",
        // "Pivot",
        // "BC",
        // "TC",
        // "R1",
        // "R2",
        // "R3",
        // "R4",
        // "S1",
        // "S2",
        // "S3",
        // "S4",
        // "Buffer",
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

    function processTrades(trades) {
      const results = [];

      for (let i = 0; i < trades.length - 1; i++) {
        const entry = trades[i];
        const exit = trades[i + 1];

        if (entry.signal === "Exit") {
          // results.push({
          //   signal: "Exit",
          //   entry_reason: entry.reason,
          //   entry_time: formatToIST(entry.entryTime),
          //   entry_price: entry.price,
          //   exit_reason: "No Trade Zone",
          //   exit_time: "No Trade Zone",
          //   exit_price: "No Trade Zone",
          //   profit_loss: "No Trade Zone",
          // });
          continue;
        }

        if (entry.signal === "Buy") {
          if (exit.signal === "Exit") {
            results.push({
              signal: "Buy",
              entry_reason: entry.reason,
              entry_time: formatToIST(entry.entryTime),
              entry_price: entry.price,
              exit_reason: exit.reason,
              exit_time: formatToIST(exit.entryTime),
              exit_price: exit.price,
              profit_loss: (exit.price - entry.price).toFixed(2),
            });
          } else if (exit.signal === "Sell") {
            results.push({
              signal: "Buy",
              entry_reason: entry.reason,
              entry_time: formatToIST(entry.entryTime),
              entry_price: entry.price,
              exit_reason: exit.reason,
              exit_time: formatToIST(exit.entryTime),
              exit_price: exit.price,
              profit_loss: (exit.price - entry.price).toFixed(2),
            });
          }
        } else if (entry.signal === "Sell") {
          if (exit.signal === "Exit") {
            results.push({
              signal: "Sell",
              entry_reason: entry.reason,
              entry_time: formatToIST(entry.entryTime),
              entry_price: entry.price,
              exit_reason: exit.reason,
              exit_time: formatToIST(exit.entryTime),
              exit_price: exit.price,
              profit_loss: (entry.price - exit.price).toFixed(2),
            });
          } else if (exit.signal === "Buy") {
            results.push({
              signal: "Sell",
              entry_reason: entry.reason,
              entry_time: formatToIST(entry.entryTime),
              entry_price: entry.price,
              exit_reason: exit.reason,
              exit_time: formatToIST(exit.entryTime),
              exit_price: exit.price,
              profit_loss: (entry.price - exit.price).toFixed(2),
            });
          }
        }
      }

      // Handle last trade if it's an exit or pending trade
      // const lastTrade = trades[trades.length - 1];
      // if (lastTrade.signal === "Exit") {
      // results.push({
      //   signal: "Exit",
      //   entry_reason: lastTrade.reason,
      //   entry_time: formatToIST(lastTrade.entryTime),
      //   entry_price: lastTrade.price,
      //   exit_reason: "No Trade Zone",
      //   exit_time: "No Trade Zone",
      //   exit_price: "No Trade Zone",
      //   profit_loss: "No Trade Zone",
      // });
      // } else if (trades.length % 2 !== 0) {
      //   results.push({
      //     signal: lastTrade.signal,
      //     entry_reason: lastTrade.reason,
      //     entry_time: formatToIST(lastTrade.entryTime),
      //     entry_price: lastTrade.price,
      //     exit_reason: "Pending",
      //     exit_time: "Pending",
      //     exit_price: "Pending",
      //     profit_loss: "Pending",
      //   });
      // }

      // if (trades.length % 2 !== 0) {
      const lastTrade = trades[trades.length - 1];
      results.push({
        signal: lastTrade.signal,
        entry_reason: lastTrade.reason,
        entry_time: formatToIST(lastTrade.entryTime),
        entry_price: lastTrade.price,
        exit_reason: "",
        exit_time: "",
        exit_price: "",
        profit_loss: "",
      });
      // }

      return results;
    }

    const groupedEntries = processTrades(trades);

    // Add data rows
    groupedEntries.forEach((trade) => {
      worksheet.addRow([
        trade.signal,
        trade.entry_reason,
        trade.entry_time,
        trade.entry_price,
        trade.exit_reason,
        trade.exit_time,
        trade.exit_price,
        trade.profit_loss,
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
