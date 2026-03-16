/**
 * Centralized API Configuration
 *
 * This utility determines the backend API URL dynamically.
 * Priority:
 * 1. LocalStorage override (e.g. `localStorage.setItem('VITE_API_URL_OVERRIDE', 'http://127.0.0.1:5000')`)
 *    Useful for testing a deployed frontend against a local backend without rebuilding.
 * 2. `import.meta.env.VITE_API_URL` (Set via Vercel/environment variables during build)
 * 3. Fallback `http://127.0.0.1:5000` (Local development default)
 */

export const getApiUrl = (): string => {
  // Check for local override first (stripping trailing slashes if present)
  try {
    const override = localStorage.getItem("VITE_API_URL_OVERRIDE");
    if (override) {
      return override.replace(/\/+$/, "");
    }
  } catch (e) {
    // Ignore localStorage errors (e.g., in incognito mode or SSR)
  }

  // Use environment variable if available
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }

  // Fallback
  return "http://127.0.0.1:5000";
};

export const baseUrl = getApiUrl();
export const apiUrl = `${baseUrl}/api`;
