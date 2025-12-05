// src/hooks/use-fetch.js
import { useState } from "react";
import { toast } from "sonner";

/**
 * Minimal useFetch hook:
 * - returns the value from cb (so callers can inspect it)
 * - parses Response objects (fetch) into JSON if needed
 * - sets loading / error state correctly
 * - re-throws errors so callers can handle them too
 */
const useFetch = (cb) => {
  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(false); // default false
  const [error, setError] = useState(null);

  const fn = async (...args) => {
    setLoading(true);
    setError(null);

    try {
      // Call the provided callback (cb) with arguments
      let response = await cb(...args);

      // If the callback returned a fetch Response object, parse it to JSON.
      // Many helpers return a Response; others already return parsed JSON.
      // We detect by checking for .json function.
      if (response && typeof response.json === "function") {
        // note: this await may throw if response has non-2xx and cb didn't throw
        try {
          response = await response.json();
        } catch (parseErr) {
          // If parsing fails, keep original response but log parse error
          console.error("Failed to parse Response JSON in useFetch:", parseErr);
        }
      }

      setData(response);
      return response; // <-- IMPORTANT: return so caller gets the value
    } catch (err) {
      console.error("useFetch error:", err);
      setError(err);
      toast.error(err?.message || "An error occurred");
      throw err; // re-throw so caller can handle / inspect the error
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, fn, setData };
};

export default useFetch;
