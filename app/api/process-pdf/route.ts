import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface MCQ {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

declare global {
  // eslint-disable-next-line no-var
  var mcqs: MCQ[] | undefined;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("pdf") as File;
    const apiKey = formData.get("apiKey") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Use API key from request instead of environment variable
    const genAI = new GoogleGenerativeAI(apiKey);

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro-exp-03-25",
    });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are a professional MCQ generator. Generate 30 multiple choice questions based on the following document.  
            For each question, provide:
            1. A clear and concise question
            2. Five distinct options (A, B, C, D, E)
            3. The correct answer
            4. A detailed explanation of why the answer is correct

            IMPORTANT: Return ONLY a valid JSON array of objects with the following structure:
            [
              {
                "question": "question text",
                "options": ["option A", "option B", "option C", "option D", "option E"],
                "correctAnswer": "correct option text",
                "explanation": "detailed explanation"
              }
            ]

            Do not include any additional text, explanations, or markdown formatting. Only return the JSON array.`,
            },
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });

    const response = await result.response;
    const responseText = response.text();

    // Clean the response text to ensure it's valid JSON
    const cleanedText = responseText.replace(/```json\n|\n```/g, "").trim();

    let mcqs: MCQ[];
    try {
      mcqs = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      console.error("Response text:", cleanedText);
      return NextResponse.json(
        { error: "Failed to generate valid MCQs from the PDF" },
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Validate the structure of the generated MCQs
    if (!Array.isArray(mcqs) || mcqs.length === 0) {
      return NextResponse.json(
        { error: "Generated MCQs are not in the correct format" },
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Store the MCQs in a temporary storage
    global.mcqs = mcqs;

    return NextResponse.json(
      { success: true },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error processing PDF:", error);
    return NextResponse.json(
      { error: "Failed to process PDF" },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
