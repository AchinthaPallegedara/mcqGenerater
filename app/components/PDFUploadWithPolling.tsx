"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function PDFUploadWithPolling() {
  const [file, setFile] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState("Starting...");
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, []);

  const startPolling = () => {
    setElapsedTime(0);

    // Poll every 2 seconds
    pollInterval.current = setInterval(async () => {
      try {
        const response = await fetch("/api/process-pdf");

        if (!response.ok) {
          throw new Error("Failed to check processing status");
        }

        const data = await response.json();

        // Update elapsed time for user feedback
        setElapsedTime((prev) => prev + 2);

        if (data.progress) {
          setProgress(data.progress);
        } else if (elapsedTime % 10 === 0) {
          setProgress(`Still processing... (${elapsedTime} seconds elapsed)`);
        }

        // Check if processing is complete
        if (data.status === "completed") {
          if (pollInterval.current) clearInterval(pollInterval.current);
          setProcessing(false);
          setProgress("MCQs generated successfully!");

          // Navigate to the quiz page after a short delay
          setTimeout(() => router.push("/quiz"), 1000);
        } else if (data.status === "failed") {
          if (pollInterval.current) clearInterval(pollInterval.current);
          setProcessing(false);
          setError(data.error || "Processing failed for unknown reasons");
        }

        // If polling has been running for over 3 minutes, show a warning
        if (elapsedTime > 180 && data.status === "processing") {
          setProgress(
            `Still processing... (${elapsedTime} seconds elapsed). This is taking longer than expected.`
          );
        }

        // If polling has been running for over 5 minutes, stop and show error
        if (elapsedTime > 300 && data.status === "processing") {
          if (pollInterval.current) clearInterval(pollInterval.current);
          setProcessing(false);
          setError(
            "Processing timed out. Please try again with a smaller PDF."
          );
        }
      } catch (error) {
        console.error("Polling error:", error);

        // Only show errors after a few failed attempts (to handle network hiccups)
        if (elapsedTime > 10) {
          setError(
            "Error checking processing status. Please refresh the page."
          );
          if (pollInterval.current) clearInterval(pollInterval.current);
          setProcessing(false);
        }
      }
    }, 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Please select a PDF file");
      return;
    }

    if (!apiKey) {
      setError("Please enter your API key");
      return;
    }

    try {
      setProcessing(true);
      setProgress("Uploading PDF and starting processing...");

      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("apiKey", apiKey);
      formData.append("withPolling", "true");

      const response = await fetch("/api/process-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start PDF processing");
      }

      const data = await response.json();

      if (data.status === "processing") {
        // Start polling for results
        setProgress("PDF uploaded. Processing started...");
        startPolling();
      } else {
        throw new Error("Unexpected response from server");
      }
    } catch (error) {
      console.error("Error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to process PDF"
      );
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Upload PDF for MCQ Generation</h1>

      {error && (
        <div className="w-full p-4 mb-4 bg-red-900 border border-red-500 rounded text-white">
          {error}
        </div>
      )}

      {!processing ? (
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="space-y-2">
            <label className="block font-medium">Upload PDF</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="w-full p-2 border rounded bg-gray-800"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-medium">Gemini API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full p-2 border rounded bg-gray-800"
              placeholder="Enter your Gemini API key"
            />
            <p className="text-sm text-gray-400">
              Your API key is only used for this request and not stored.
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Generate MCQs
          </button>
        </form>
      ) : (
        <div className="w-full text-center">
          <div className="animate-pulse mb-4">
            <div className="h-16 w-16 mx-auto border-4 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-lg">{progress}</p>
          <p className="text-sm mt-2 text-gray-400">
            This may take 1-2 minutes depending on the PDF size and content.
          </p>
          <button
            onClick={() => {
              if (pollInterval.current) clearInterval(pollInterval.current);
              setProcessing(false);
            }}
            className="mt-6 py-2 px-4 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Cancel Processing
          </button>
        </div>
      )}
    </div>
  );
}
