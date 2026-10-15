
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Use POST method."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Gemini API key is not configured."
    });
  }

  try {
    const { question, level } = req.body || {};

    if (
      typeof question !== "string" ||
      !question.trim() ||
      question.length > 2000
    ) {
      return res.status(400).json({
        error: "Please provide a valid math question."
      });
    }

    const allowedLevels = [
      "Foundation",
      "Standard",
      "Advanced"
    ];

    const studentLevel = allowedLevels.includes(level)
      ? level
      : "Foundation";

    const prompt = `
You are a friendly mathematics tutor.
Topic: quadratic equations.
Student level: ${studentLevel}.
Student question: ${question}

Explain step by step at the student's level.
Use simple language and correct mathematics.
Give hints before revealing a full solution when appropriate.
If the question is unrelated to mathematics, politely
guide the student back to quadratic equations.
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          model: "gemini-3.8-flash",
          input: prompt,
          store: false,
          generation_config: {
            temperature: 0.3,
            max_output_tokens: 800
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Gemini API error:",
        response.status,
        data.error?.message
      );

      return res.status(502).json({
        error: "Gemini could not answer. Please try again."
      });
    }

    const answer =
      data.output_text ||
      data.output
        ?.filter(item => item.type === "message")
        .flatMap(item => item.content || [])
        .filter(part => part.type === "text")
        .map(part => part.text || "")
        .join("")
        .trim();

    if (!answer) {
      console.error("Gemini returned no text:", JSON.stringify(data));

      return res.status(502).json({
        error: "No answer was returned. Please try again."
      });
    }

    return res.status(200).json({ answer });
  } catch (error) {
    console.error("AI request failed:", error.message);

    return res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
}
