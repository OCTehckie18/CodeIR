import toast from "react-hot-toast";

/**
 * Centralized API error handler.
 * Extracts the most meaningful error message and shows it as a toast.
 *
 * @param error     - The caught error (from axios or native throw)
 * @param context   - Human-readable prefix for the console log (e.g. "Deleting submission")
 */
export function handleApiError(error: any, context: string = "Operation"): void {
  const message: string =
    error?.response?.data?.error ||
    error?.message ||
    "An unexpected error occurred.";

  console.error(`[${context}]`, error);
  toast.error(message);
}

/**
 * Show a success toast.
 */
export function showSuccess(message: string): void {
  toast.success(message);
}
