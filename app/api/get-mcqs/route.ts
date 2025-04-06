import { NextResponse } from "next/server";

interface MCQ {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

declare global {
  interface Global {
    mcqs: MCQ[];
  }
}

export async function GET() {
  try {
    if (!global.mcqs) {
      return NextResponse.json({ error: "No MCQs found" }, { status: 404 });
    }

    return NextResponse.json(global.mcqs);
  } catch (error) {
    console.error("Error fetching MCQs:", error);
    return NextResponse.json(
      { error: "Failed to fetch MCQs" },
      { status: 500 }
    );
  }
}
