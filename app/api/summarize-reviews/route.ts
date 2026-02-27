import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { restaurantName, cuisine, rating, reviews } = await request.json();

    // If no reviews, generate a generic summary based on available info
    if (!reviews || reviews.length === 0) {
      return NextResponse.json({
        summary: `${restaurantName} is a well-regarded ${cuisine} restaurant with a ${rating} rating. Diners appreciate the authentic flavors and welcoming atmosphere.`,
      });
    }

    // Prepare review texts for summarization
    const reviewTexts = reviews
      .slice(0, 5)
      .map((r: { text: string; rating: number }) => `[${r.rating}★] ${r.text}`)
      .join('\n\n');

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are a helpful restaurant concierge. Summarize the following reviews for "${restaurantName}" (${cuisine}, ${rating}★) in 2-3 sentences. Focus on:
- What dishes or aspects guests love most
- The overall vibe/atmosphere
- Any standout positives

Be concise, warm, and helpful. Don't use bullet points. Write as a natural summary that helps someone decide if this restaurant is right for them.

Reviews:
${reviewTexts}

Summary:`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text().trim();

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error summarizing reviews:', error);
    return NextResponse.json(
      { summary: 'Unable to generate summary at this time.' },
      { status: 500 }
    );
  }
}
