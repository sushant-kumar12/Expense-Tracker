// app/api/parse-receipt/route.js

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("❌ GEMINI_API_KEY not found");
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const imageFile = formData.get("image");

    if (!imageFile) {
      return NextResponse.json(
        { error: "No image uploaded" },
        { status: 400 }
      );
    }

    console.log("📸 File received:", {
      name: imageFile.name,
      type: imageFile.type,
      size: imageFile.size,
    });

    // Convert file to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");

    console.log("✅ Image converted to base64, size:", base64Image.length);

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    let model;

    try {
      model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      console.log("🤖 Using model: gemini-2.0-flash");
    } catch (err) {
      console.log("⚠️ Trying fallback model: gemini-pro-vision");
      model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
      console.log("🤖 Using model: gemini-pro-vision");
    }

    // IMPROVED PROMPT - more specific for receipt parsing
    const prompt = `You are an expert receipt parser. Analyze this receipt image carefully and extract ALL the following information:

IMPORTANT: Look at the actual receipt in the image. Extract REAL data, not placeholder text.

Return ONLY a valid JSON object with these exact fields:
{
  "amount": <the total amount as a number, e.g. 123.45, or null if not visible>,
  "merchantName": "<name of the store/restaurant/business>",
  "description": "<list of main items purchased, separated by comma>",
  "category": "<category: choose from Grocery, Food, Restaurant, Transport, Fuel, Shopping, Bills, Health, Entertainment, Other>",
  "date": "<date in YYYY-MM-DD format if visible, otherwise null>"
}

RULES:
1. amount: Extract the TOTAL/GRAND TOTAL value as a number only (no currency symbol)
2. merchantName: The business/store name (NOT generic text like "Receipt" or "Invoice")
3. description: What was purchased (items, products, services)
4. category: Pick the MOST APPROPRIATE category based on merchant and items
5. date: Extract the date if visible, format as YYYY-MM-DD
6. Return ONLY the JSON object, no markdown, no code blocks, no extra text

If any field is not visible or unclear, set to null.
Be accurate and extract real values from the receipt image.`;

    console.log("🔍 Sending to Gemini...");

    // Call Gemini with image
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: imageFile.type || "image/jpeg",
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    console.log("📋 Raw Gemini response:", text.substring(0, 200) + "...");

    // Parse JSON response
    let parsedData;
    try {
      // Remove markdown if present
      let cleanedText = text.trim();
      
      // Remove markdown code blocks
      if (cleanedText.includes("```")) {
        cleanedText = cleanedText
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
      }

      // Try to extract JSON object if there's extra text
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }

      console.log("🧹 Cleaned text:", cleanedText.substring(0, 100) + "...");

      parsedData = JSON.parse(cleanedText);
      console.log("✅ Successfully parsed JSON:", parsedData);

      // Validate that we got real data (not placeholder)
      if (
        parsedData.merchantName === "Receipt parsed" ||
        parsedData.merchantName === "Unknown merchant" ||
        (!parsedData.amount && !parsedData.merchantName)
      ) {
        console.warn("⚠️ Received placeholder data, image might not be readable");
        return NextResponse.json(
          {
            amount: null,
            merchantName: null,
            description: "Receipt image not readable. Please try with better lighting or a clearer image.",
            category: null,
            date: null,
          }
        );
      }

      return NextResponse.json(parsedData);

    } catch (parseError) {
      console.error("❌ JSON parse failed. Raw response:", text);
      
      return NextResponse.json(
        {
          amount: null,
          merchantName: null,
          description: "Could not parse receipt. Please ensure the image is clear and contains a valid receipt.",
          category: null,
          date: null,
        }
      );
    }

  } catch (error) {
    console.error("❌ Receipt parsing error:", error.message);
    return NextResponse.json(
      {
        error: "Failed to parse receipt",
        detail: error.message,
      },
      { status: 500 }
    );
  }
}