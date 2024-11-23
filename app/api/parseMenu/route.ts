import { Together } from "together-ai";
import { generateObject, streamObject } from "ai";
import { menuSchema } from "@/lib/schemas";

// Add observability if a Helicone key is specified
const options: ConstructorParameters<typeof Together>[0] = {};
if (process.env.HELICONE_API_KEY) {
  options.baseURL = "https://together.helicone.ai/v1";
  options.defaultHeaders = {
    "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
    "Helicone-Property-MENU": "true",
  };
}

const together = new Together(options);

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

  // First pass - extract menu items
  const { object: menuItems } = await generateObject({
    model: together("meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo"),
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

  // Generate images in parallel
  const imagePromises = menuItems.map(async (item) => {
    const response = await together.images.create({
      prompt: `A picture of food for a menu, hyper realistic, highly detailed, ${item.name}, ${item.description}.`,
      model: "black-forest-labs/FLUX.1-schnell",
      width: 1024,
      height: 768,
      steps: 5,
      response_format: "base64",
    });
    
    return {
      ...item,
      menuImage: { b64_json: response.data[0] }
    };
  });

  // Stream the results back to the client
  const stream = streamObject({
    model: together("meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo"),
    schema: menuSchema,
    output: "array",
    data: await Promise.all(imagePromises)
  });

  return stream.toDataStreamResponse();
}

export const maxDuration = 60;
