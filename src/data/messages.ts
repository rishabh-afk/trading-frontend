export const strings: { [key: string]: string } = {
    // General success and error messages
    ROUTE_NOT_FOUND: "Route Not Found",
    SUCCESS: "Operation completed successfully.",
    ERROR: "An error occurred. Please try again.",
    SERVER_ERROR: "Server error. Please contact support.",
    BAD_REQUEST: "Bad request. Please review your input.",

    // Authorization and Authentication
    FORBIDDEN: "Access denied.",
    LOGIN_SUCCESS: "Login successful.",
    INVALID_CREDENTIALS: "Invalid username or password.",
    LOGOUT_SUCCESS: "You have been logged out successfully.",
    SESSION_EXPIRED: "Session expired. Please log in again.",
    UNAUTHORIZED: "You are not authorized to perform this action.",

    // Validation
    REQUIRED_FIELD: "This field is required.",
    FIELD_TOO_SHORT: "This field is too short.",
    PASSWORD_MISMATCH: "Passwords do not match.",
    INVALID_EMAIL: "Please enter a valid email address.",
    FIELD_TOO_LONG: "This field exceeds the maximum allowed length.",
    INVALID_PASSWORD: "Password does not meet security requirements.",
    INVALID_INPUT: "Invalid input. Please check your data and try again.",

    // CRUD Operations
    CREATED: "Created successfully.",
    UPDATED: "Updated successfully.",
    DELETED: "Deleted successfully.",
    FETCHED: "Fetched successfully.",
    NOT_FOUND: "The requested entry was not found.",
    NO_ENTRIES: "No entries available at the moment.",
    DUPLICATE_ENTRY: "Duplicate entry found. Please check your data.",

    // Connection and Network
    TIMEOUT: "Request timed out. Please try again later.",
    CONNECTION_LOST: "Connection lost. Trying to reconnect...",
    NETWORK_ERROR: "Network error. Please check your internet connection.",

    // File Handling
    UNSUPPORTED_FILE_TYPE: "Unsupported file type.",
    FILE_UPLOAD_SUCCESS: "File uploaded successfully.",
    FILE_TOO_LARGE: "The file is too large to upload.",
    FILE_UPLOAD_ERROR: "File upload failed. Please try again.",

    // Notifications
    NOTIFICATION_ERROR: "Failed to send notification.",
    NOTIFICATION_SENT: "Notification sent successfully.",

    // Payment and Transactions
    TRANSACTION_FAILED: "Transaction failed.",
    INSUFFICIENT_FUNDS: "Insufficient funds.",
    PAYMENT_SUCCESS: "Payment processed successfully.",
    TRANSACTION_SUCCESS: "Transaction completed successfully.",
    PAYMENT_FAILED: "Payment failed. Please check your details and try again.",

    LOADING: "Loading, please wait...",
    SAVE_ERROR: "Failed to save changes.",
    PROCESSING: "Processing your request...",
    SAVE_SUCCESS: "Changes saved successfully.",
    OPERATION_CANCELLED: "Operation has been cancelled.",

    // JWT ERRORS
    TOKEN_INVALID: "Invalid token. Access denied.",
    TOKEN_MISSING: "Token is missing. Access denied.",
    TOKEN_EXPIRED: "Token has expired. Please log in again.",
    ACCESS_DENIED_JWT: "Access denied. You do not have permission to perform this action.",

    // TRading Messages    
    CALL_BUY: "Buy Call Signal: The current price has crossed above the Top Center (TC) line, indicating a potential upward trend.",
    MONITORING: "Monitoring Signal: The current price is positioned between the Bottom Center (BC) and Top Center (TC) lines, suggesting a period of stability. No immediate action is required.",
    PUT_BUY: "Buy Put Signal: The current price is below the Bottom Center (BC) line, indicating a potential downward trend."
};
