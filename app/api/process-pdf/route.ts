import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface MCQ {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface ProcessingState {
  status: "idle" | "processing" | "completed" | "failed";
  mcqs: MCQ[];
  error?: string;
  startTime?: number;
  progress?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var mcqs: MCQ[] | undefined;
  // eslint-disable-next-line no-var
  var processingState: ProcessingState;
}

// Initialize the global processing state if it doesn't exist
if (!global.processingState) {
  global.processingState = {
    status: "idle",
    mcqs: [],
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("pdf") as File;
    const apiKey = formData.get("apiKey") as string;
    const withPolling = formData.get("withPolling") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      );
    }

    // If polling is enabled, use the background processing approach
    if (withPolling) {
      // If already processing, return the current status
      if (global.processingState.status === "processing") {
        return NextResponse.json({
          status: "processing",
          message: "Another PDF is currently being processed",
        });
      }

      // Reset the state and mark as processing
      global.processingState = {
        status: "processing",
        mcqs: [],
        startTime: Date.now(),
        progress: "Starting PDF processing...",
      };

      // Start processing in the background
      processPdfInBackground(file, apiKey);

      // Return immediately with a processing status
      return NextResponse.json({
        status: "processing",
        message: "PDF processing started",
      });
    }

    // If polling is not enabled, use the synchronous approach
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
        { status: 500 }
      );
    }

    // Validate the structure of the generated MCQs
    if (!Array.isArray(mcqs) || mcqs.length === 0) {
      return NextResponse.json(
        { error: "Generated MCQs are not in the correct format" },
        { status: 500 }
      );
    }

    // Store the MCQs in a temporary storage
    global.mcqs = mcqs;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing PDF:", error);
    return NextResponse.json(
      { error: "Failed to process PDF" },
      { status: 500 }
    );
  }
}

async function processPdfInBackground(file: File, apiKey: string) {
  try {
    global.processingState.progress = "Converting PDF...";

    // Use API key from request
    const genAI = new GoogleGenerativeAI(apiKey);

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    global.processingState.progress = "Sending to AI model...";

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro-exp-03-25",
    });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are a professional MCQ generator. Generate 15 multiple choice questions based on the following document.  
              For each question, provide:
              1. A clear and concise question
              2. Four distinct options (A, B, C, D)
              3. The correct answer
              4. A brief explanation of why the answer is correct

              IMPORTANT: Return ONLY a valid JSON array of objects with the following structure:
              [
                {
                  "question": "question text",
                  "options": ["option A", "option B", "option C", "option D"],
                  "correctAnswer": "correct option text",
                  "explanation": "brief explanation"
                }
              ]

              Be extremely concise. Focus on the most important concepts in the document.
              Do not include any additional text or markdown formatting. Only return the JSON array.`,
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
        temperature: 0.4, // Lower temperature for more focused outputs
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 6000, // Reduced to improve speed
      },
    });

    global.processingState.progress = "Processing AI response...";

    const response = await result.response;
    const responseText = response.text();

    // Clean the response text to ensure it's valid JSON
    const cleanedText = responseText.replace(/```json\n|\n```/g, "").trim();

    try {
      const mcqs = JSON.parse(cleanedText);

      // Store the MCQs in both global states for compatibility
      global.processingState = {
        status: "completed",
        mcqs: mcqs,
      };

      global.mcqs = mcqs;
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      global.processingState = {
        status: "failed",
        mcqs: [],
        error: "Failed to parse AI response into valid MCQs",
      };
    }
  } catch (error) {
    console.error("Error in background processing:", error);
    global.processingState = {
      status: "failed",
      mcqs: [],
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during processing",
    };
  }
}

// Add a GET endpoint to check the status of background processing
export async function GET() {
  if (!global.processingState) {
    return NextResponse.json({ status: "idle", mcqs: [] });
  }

  return NextResponse.json(global.processingState);
}
