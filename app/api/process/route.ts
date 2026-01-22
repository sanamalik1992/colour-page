// app/api/process/ai-convert/route.ts
// This goes alongside your existing /process route

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Convert image to base64
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');
    const mimeType = imageFile.type;

    console.log('Processing image with AI...');

    // Step 1: Analyze photo with GPT-4o Vision
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: "low"
              },
            },
            {
              type: "text",
              text: `Analyze this photo and create a detailed prompt for generating a black and white colouring page. 
              
              Focus on:
              - Main subject and key features
              - Important details that should be preserved
              - Simple, clean lines suitable for colouring
              
              Format your response as: "A black and white colouring page of [description]..."
              
              Make it suitable for children to colour, with bold outlines and no shading.`
            }
          ],
        },
      ],
      max_tokens: 300,
    });

    const colouringPagePrompt = visionResponse.choices[0].message.content;

    if (!colouringPagePrompt) {
      throw new Error('Failed to generate description from image');
    }

    console.log('Generated prompt:', colouringPagePrompt);

    // Step 2: Generate colouring page with GPT Image 1 Mini
    const imageResponse = await openai.images.generate({
      model: "gpt-image-1-mini",
      prompt: `${colouringPagePrompt}

CRITICAL REQUIREMENTS:
- Pure black lines on pure white background
- No grey tones, no shading, no gradients
- Bold, thick outlines suitable for children
- Clear, simple shapes easy to colour
- Clean line art only
- A4 printable format
- Professional colouring book quality`,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "url",
    });

    const generatedImageUrl = imageResponse.data[0].url;

    return NextResponse.json({
      success: true,
      imageUrl: generatedImageUrl,
      promptUsed: colouringPagePrompt,
      model: "gpt-image-1-mini",
      cost: "~£0.01-0.02"
    });

  } catch (error: any) {
    console.error('Error converting to colouring page:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to convert image',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
