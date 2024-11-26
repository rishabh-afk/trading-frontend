import { NextResponse } from "next/server";
import { KiteConnect } from "kiteconnect";

/**
 * Kite SDK instance
 */
const kite = new KiteConnect({
  api_key: process.env.KITE_API_KEY || "",
});

/**
 * Generates a Kite login URL and redirects the user to it.
 * @param request - The incoming HTTP request object.
 * @returns {NextResponse} - A redirection to the Kite login URL or an error response.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    // Get the login URL from Kite SDK
    const loginUrl = kite.getLoginURL();

    if (!loginUrl) {
      throw new Error("Failed to generate login URL. Login URL is undefined.");
    }

    // Redirect to the generated login URL
    return NextResponse.redirect(loginUrl);
  } catch (error) {
    const errorMessage = (error as Error).message;

    // Log the error for debugging purposes
    console.error(
      "Error generating or redirecting to Login URL:",
      errorMessage
    );

    // Return a 500 error response with the error message
    return NextResponse.json(
      {
        error: "Unable to generate login URL",
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
