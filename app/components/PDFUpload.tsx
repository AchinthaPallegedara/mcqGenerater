"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PDFUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Load saved API key from localStorage on component mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem("geminiApiKey");
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  // Save API key to localStorage whenever it changes
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newApiKey = e.target.value;
    setApiKey(newApiKey);
    localStorage.setItem("geminiApiKey", newApiKey);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== "application/pdf") {
        setError("Please upload a PDF file");
        setFile(null);
      } else {
        setError(null);
        setFile(selectedFile);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    if (!apiKey.trim()) {
      setError("Please enter your Gemini API key");
      return;
    }

    // Save API key to localStorage before upload
    localStorage.setItem("geminiApiKey", apiKey);

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("pdf", file);
    formData.append("apiKey", apiKey);

    try {
      const response = await fetch("/api/process-pdf", {
        method: "POST",
        body: formData,
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned an invalid response format");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process PDF");
      }

      if (!data.success) {
        throw new Error("Failed to generate MCQs");
      }

      router.push("/quiz");
    } catch (error) {
      console.error("Error uploading PDF:", error);
      setError(
        error instanceof Error ? error.message : "Failed to process PDF"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md p-6 bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-center">Upload PDF</h2>
        <div className="mb-4">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="apiKey"
            className="block text-sm font-medium mb-1 text-gray-300"
          >
            Gemini API Key
          </label>
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={handleApiKeyChange}
            placeholder="Enter your Gemini API key"
            className="w-full p-2 border rounded"
          />
          <p className="text-xs text-gray-400 mt-1">
            Your API key is saved in your browser for convenience
          </p>
        </div>
        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        <button
          onClick={handleUpload}
          disabled={!file || isLoading}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isLoading ? "Processing..." : "Generate MCQs"}
        </button>
      </div>
    </div>
  );
}
