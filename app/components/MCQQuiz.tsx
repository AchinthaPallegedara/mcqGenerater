"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

interface MCQ {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  shuffledOptions?: string[]; // Store shuffled options
}

export default function MCQQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(string | null)[]>([]);
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [marks, setMarks] = useState(0);

  // Fisher-Yates shuffle algorithm
  const shuffleArray = useCallback((array: string[]): string[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }, []);

  useEffect(() => {
    const fetchMCQs = async () => {
      try {
        // Try background processing endpoint first
        let data: MCQ[];
        try {
          const bgResponse = await fetch("/api/process-pdf");
          const bgData = await bgResponse.json();

          if (
            bgData.status === "completed" &&
            Array.isArray(bgData.mcqs) &&
            bgData.mcqs.length > 0
          ) {
            data = bgData.mcqs;
          } else {
            // Fall back to regular endpoint
            const response = await fetch("/api/get-mcqs");
            data = await response.json();
          }
        } catch (error) {
          console.error("Error fetching background MCQs:", error);
          // If background endpoint fails, use regular endpoint
          const response = await fetch("/api/get-mcqs");
          data = await response.json();
        }

        // Shuffle options for each question
        const processedMcqs = data.map((mcq) => {
          const shuffledOptions = shuffleArray(mcq.options);
          return { ...mcq, shuffledOptions };
        });

        setMcqs(processedMcqs);
        // Initialize selectedAnswers array with nulls
        setSelectedAnswers(new Array(processedMcqs.length).fill(null));
        setLoading(false);
      } catch (error) {
        console.error("Error fetching MCQs:", error);
        setLoading(false);
      }
    };

    fetchMCQs();
  }, [shuffleArray]);

  const handleAnswerSelect = (option: string) => {
    // Skip if question was already answered
    if (selectedAnswers[currentQuestion] !== null) return;

    // Create a copy of the selectedAnswers array and update the current question's answer
    const newSelectedAnswers = [...selectedAnswers];
    newSelectedAnswers[currentQuestion] = option;
    setSelectedAnswers(newSelectedAnswers);

    // Update marks if answer is correct
    if (option === mcqs[currentQuestion].correctAnswer) {
      setMarks((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    setCurrentQuestion((prev) => prev + 1);
  };

  const handlePreviousQuestion = () => {
    setCurrentQuestion((prev) => prev - 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading questions...</div>
      </div>
    );
  }

  if (mcqs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">
          No questions available. Please generate some first.
        </div>
      </div>
    );
  }

  if (currentQuestion >= mcqs.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold mb-4">Quiz Completed!</h2>
        <div className="text-xl mb-6">
          Your Score: {marks} out of {mcqs.length}
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => {
              setCurrentQuestion(0);
            }}
            className="bg-gray-700 text-white py-2 px-4 rounded hover:bg-gray-600"
          >
            Review Questions
          </button>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            Start New Quiz
          </button>
        </div>
      </div>
    );
  }

  const currentMCQ = mcqs[currentQuestion];
  const currentAnswer = selectedAnswers[currentQuestion];
  const options = currentMCQ.shuffledOptions || currentMCQ.options;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-2xl">
        <Link href={"/"}>
          <button className="flex items-start p-4 cursor-pointer">Back</button>
        </Link>
      </div>
      <div className="w-full max-w-2xl p-6 bg-gray-800 rounded-lg shadow-md">
        <div className="mb-4 flex justify-between items-center">
          <span className="text-gray-400">
            Question {currentQuestion + 1} of {mcqs.length}
          </span>
          <div className="flex items-center">
            <span className="text-gray-400">Score: {marks}</span>
          </div>
        </div>

        <h2 className="text-xl font-bold mb-6">{currentMCQ.question}</h2>

        <div className="space-y-3">
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(option)}
              disabled={currentAnswer !== null}
              className={`w-full p-3 text-left rounded border cursor-pointer ${
                currentAnswer !== null
                  ? option === currentMCQ.correctAnswer
                    ? "bg-green-900 border-green-500"
                    : currentAnswer === option
                    ? "bg-red-900 border-red-500"
                    : "bg-gray-700"
                  : "hover:bg-gray-800"
              }`}
            >
              <span className="font-semibold">
                {String.fromCharCode(65 + index)}.
              </span>{" "}
              {option}
            </button>
          ))}
        </div>

        {currentAnswer !== null && (
          <div className="mt-6 p-4 bg-gray-900 rounded">
            <h3 className="font-bold mb-2">Explanation:</h3>
            <p>{currentMCQ.explanation}</p>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <button
            onClick={handlePreviousQuestion}
            disabled={currentQuestion === 0}
            className={`py-2 px-4 rounded ${
              currentQuestion === 0
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            Previous
          </button>

          {currentQuestion < mcqs.length - 1 ? (
            <button
              onClick={handleNextQuestion}
              className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            >
              Next Question
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
            >
              Finish Quiz
            </button>
          )}
        </div>
      </div>

      {/* Question navigation */}
      <div className="w-full max-w-2xl mt-6 flex flex-wrap justify-center gap-2">
        {mcqs.map((_, idx) => {
          // Only show buttons for the current question and answered questions
          const isAnswered = selectedAnswers[idx] !== null;
          const isCurrent = currentQuestion === idx;
          const isNavigable = isAnswered || isCurrent || idx === 0;

          // Only render the button if it's navigable
          if (!isNavigable) return null;

          return (
            <button
              key={idx}
              onClick={() => {
                setCurrentQuestion(idx);
              }}
              disabled={!isNavigable}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm
                ${
                  isCurrent
                    ? "bg-blue-500 text-white"
                    : isAnswered
                    ? selectedAnswers[idx] === mcqs[idx].correctAnswer
                      ? "bg-green-900 text-white"
                      : "bg-red-900 text-white"
                    : "bg-gray-700 text-white hover:bg-gray-600 cursor-not-allowed opacity-50"
                }`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
