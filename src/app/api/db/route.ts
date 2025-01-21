import { dbConnect } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Connect to the database
    await dbConnect();

    // Return a success response
    return NextResponse.json(
      {
        status: "success",
        message: "Successfully connected to the database",
      },
      { status: 200 } // Explicitly setting HTTP status code
    );
  } catch (error) {
    console.error("Database connection error:", error);

    // Return a detailed error response
    return NextResponse.json(
      {
        status: "error",
        message: "Unable to connect to the database",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
