"use client";

import { useState, useEffect } from "react";

interface MCQ {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export default function MCQQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMCQs = async () => {
      try {
        const response = await fetch("/api/get-mcqs");
        const data = await response.json();
        setMcqs(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching MCQs:", error);
        setLoading(false);
      }
    };

    fetchMCQs();
  }, []);

  const handleAnswerSelect = (option: string) => {
    setSelectedAnswer(option);
    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    setCurrentQuestion((prev) => prev + 1);
    setSelectedAnswer(null);
    setShowExplanation(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading questions...</div>
      </div>
    );
  }

  if (currentQuestion >= mcqs.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold mb-4">Quiz Completed!</h2>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-500 text-gray-800 py-2 px-4 rounded hover:bg-blue-600"
        >
          Start New Quiz
        </button>
      </div>
    );
  }

  const currentMCQ = mcqs[currentQuestion];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-2xl p-6 bg-gray-800 rounded-lg shadow-md">
        <div className="mb-4">
          <span className="text-gray-600">
            Question {currentQuestion + 1} of {mcqs.length}
          </span>
        </div>

        <h2 className="text-xl font-bold mb-6">{currentMCQ.question}</h2>

        <div className="space-y-3">
          {currentMCQ.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(option)}
              disabled={showExplanation}
              className={`w-full p-3 text-left rounded border ${
                showExplanation
                  ? option === currentMCQ.correctAnswer
                    ? "bg-green-900 border-green-500"
                    : selectedAnswer === option
                    ? "bg-red-900 border-red-500"
                    : "bg-gray-700"
                  : "hover:bg-gray-800"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        {showExplanation && (
          <div className="mt-6 p-4 bg-gray-900 rounded">
            <h3 className="font-bold mb-2">Explanation:</h3>
            <p>{currentMCQ.explanation}</p>
            <button
              onClick={handleNextQuestion}
              className="mt-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            >
              Next Question
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
