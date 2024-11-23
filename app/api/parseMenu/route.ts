import { createOpenAI } from '@ai-sdk/openai';
import { generateObject, streamObject } from 'ai';
import { menuSchema } from "@/lib/schemas";

// Configure Together.ai provider with optional Helicone observability
const togetherOptions: Parameters<typeof createOpenAI>[0] = {
  name: 'togetherai',
  apiKey: process.env.TOGETHER_AI_API_KEY ?? '',
  baseURL: 'https://api.together.xyz/v1/',
};

// Add Helicone configuration if API key is present
if (process.env.HELICONE_API_KEY) {
  togetherOptions.baseURL = "https://together.helicone.ai/v1";
  togetherOptions.headers = {
    "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
    "Helicone-Property-MENU": "true",
  };
}

const togetherai = createOpenAI(togetherOptions);

const systemPrompt = `You are a menu analysis assistant. Your task is to:
1. Extract menu items from images
2. Generate accurate descriptions
3. Format prices consistently
4. Ensure all required fields are present

Please maintain a professional tone and be precise with details.`;

export async function POST(request: Request) {
  const { menuUrl } = await request.json();

  if (!menuUrl) {
    return Response.json({ error: "No menu URL provided" }, { status: 400 });
  }

  try {
    // First pass - extract menu items using Together.ai's vision model
    const { object: menuItems } = await generateObject({
      model: togetherai('meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo'),
      schema: menuSchema,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Extract all menu items from this image:" },
            { type: "image", image: menuUrl }
          ]
        }
      ]
    });

    // Generate images in parallel using Together.ai's text-to-image model
    const imagePromises = menuItems.map(async (item) => {
      const response = await fetch('https://api.together.xyz/v1/images/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.TOGETHER_AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `A picture of food for a menu, hyper realistic, highly detailed, ${item.name}, ${item.description}.`,
          model: "black-forest-labs/FLUX.1-schnell",
          width: 1024,
          height: 768,
          steps: 5,
          format: "b64_json"
        })
      });
      
      const data = await response.json();
      return {
        ...item,
        menuImage: { b64_json: data.data[0] }
      };
    });

    // Stream the results back to the client
    const stream = streamObject({
      model: togetherai('meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo'),
      schema: menuSchema,
      output: "array",
      messages: [
        {
          role: "assistant",
          content: JSON.stringify(await Promise.all(imagePromises))
        }
      ]
    });

    return stream.toTextStreamResponse();
  } catch (error) {
    console.error('Error processing menu:', error);
    return Response.json({ error: "Failed to process menu" }, { status: 500 });
  }
}

export const maxDuration = 60;
