import { Message } from "../messages/messages";
import { getWindowAI } from 'window.ai';

export async function getChatResponse(messages: Message[], apiKey: string) {
  // function currently not used
  throw new Error("Not implemented");

  /*
  if (!apiKey) {
    throw new Error("Invalid API Key");
  }

  const configuration = new Configuration({
    apiKey: apiKey,
  });
  // ブラウザからAPIを叩くときに発生するエラーを無くすworkaround
  // https://github.com/openai/openai-node/issues/6#issuecomment-1492814621
  delete configuration.baseOptions.headers["User-Agent"];

  const openai = new OpenAIApi(configuration);

  const { data } = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: messages,
  });

  const [aiRes] = data.choices;
  const message = aiRes.message?.content || "エラーが発生しました";

  return { message: message };
  */
}

export async function getChatResponseStream(
  messages: Message[],
  apiKey: string,
  openRouterKey: string,
  selectedModel: string = 'anthropic/claude-3.5-sonnet:beta',
  hideActionPrompts: boolean = false
) {
  // TODO: remove usages of apiKey in code
  /*
  if (!apiKey) {
    throw new Error("Invalid API Key");
  }
  */

  console.log('getChatResponseStream');

  console.log('messages');
  console.log(messages);

  const stream = new ReadableStream({
    async start(controller: ReadableStreamDefaultController) {
      try {

        const OPENROUTER_API_KEY = openRouterKey;
        const YOUR_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://chat.percyguin.co.uk/';
        const YOUR_SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'Percy';

        let isStreamed = false;
        const generation = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": `${YOUR_SITE_URL}`, // Optional, for including your app on openrouter.ai rankings.
            "X-Title": `${YOUR_SITE_NAME}`, // Optional. Shows in rankings on openrouter.ai.
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            // "model": "cohere/command",
            // "model": "openai/gpt-3.5-turbo",
            //"model": "google/gemini-flash-1.5-exp",
            "model": selectedModel,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 200,
            "stream": true,
          })
        });

        if (generation.body) {
          const reader = generation.body.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              // console.log('value');
              // console.log(value);

              // Assuming the stream is text, convert the Uint8Array to a string
              let chunk = new TextDecoder().decode(value);
              // Process the chunk here (e.g., append it to the controller for streaming to the client)
              // console.log(chunk); // Or handle the chunk as needed

              // split the chunk into lines
              let lines = chunk.split('\n');
              // console.log('lines');
              // console.log(lines);

              const SSE_COMMENT = ": OPENROUTER PROCESSING";


              // filter out lines that start with SSE_COMMENT
              lines = lines.filter((line) => !line.trim().startsWith(SSE_COMMENT));

              // filter out lines that end with "data: [DONE]"
              lines = lines.filter((line) => !line.trim().endsWith("data: [DONE]"));

              // Filter out empty lines and lines that do not start with "data:"
              const dataLines = lines.filter(line => line.startsWith("data:"));

              // Extract and parse the JSON from each data line
              const messages = dataLines.map(line => {
                // Remove the "data: " prefix and parse the JSON
                const jsonStr = line.substring(5); // "data: ".length == 5
                return JSON.parse(jsonStr);
              });

              // console.log('messages');
              // console.log(messages);

              // loop through messages and enqueue them to the controller

              try {
                messages.forEach((message) => {
                  let content = message.choices[0].delta.content;

                  // If hideActionPrompts is enabled, filter out action prompts like [happy] or [sad]
                  if (hideActionPrompts && content) {
                    // Improved regex to handle various emotion/action tags
                    // This will catch not just standalone tags but also tags followed by text
                    content = content.replace(/\[.*?\](\s*)/g, '');
                  }

                  controller.enqueue(content);
                });
              } catch (error) {
                // log the messages
                console.log('error processing messages:');
                console.log(messages);

                throw error;
              }

              // Parse the chunk as JSON
              // const parsedChunk = JSON.parse(chunk);
              // Access the content
              // const content = parsedChunk.choices[0].delta.content;
              // console.log(content); // Use the content as needed

              // enqueue the content to the controller
              // controller.enqueue(content);

              isStreamed = true;
            }
          } catch (error) {
            console.error('Error reading the stream', error);
          } finally {
            reader.releaseLock();
          }
        }

        // handle case where streaming is not supported
        if (!isStreamed) {
          console.error('Streaming not supported! Need to handle this case.');
          // controller.enqueue(response[0].message.content);
        }
      } catch (error) {
        controller.error(error);
      } finally {
        controller.close();
      }
    },
  });

  return stream;
}

// Add this function to fetch available models
export const fetchOpenRouterModels = async (apiKey: string) => {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Failed to fetch models:", error);
    return [];
  }
};

// Add function to generate images using OpenRouter API
export const generateImage = async (
  prompt: string,
  openRouterKey: string,
  model: string = "stability/stable-diffusion-3"
) => {
  try {
    // Different models require different request formats
    let payload;
    
    if (model.startsWith("stability/")) {
      // Stability AI models
      payload = {
        model: model,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      };
    } else if (model.startsWith("openai/dall-e")) {
      // OpenAI DALL-E models
      payload = {
        model: model,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        // DALL-E specific parameters
        quality: "hd",
        size: "1024x1024",
        style: "vivid"
      };
    } else {
      // Generic approach for other models that might support image generation
      payload = {
        model: model,
        messages: [
          {
            role: "user",
            content: `Generate an image based on this description: ${prompt}`
          }
        ]
      };
    }

    console.log("Generating image with model:", model);
    console.log("Payload:", payload);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://chat.percyguin.co.uk/",
        "X-Title": process.env.NEXT_PUBLIC_SITE_NAME || "Percy"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(`Error ${response.status}: ${response.statusText}. Details: ${errorDetails}`);
    }

    const data = await response.json();
    console.log("Image generation response:", data);
    
    // The image URL should be in the response content
    const content = data.choices[0]?.message?.content;
    
    // Various models return the image URL in different formats:
    // 1. Direct URL
    // 2. Markdown image format: ![description](url)
    // 3. JSON with url field
    // 4. HTML img tag
    
    // Try to extract URL using common patterns
    if (content) {
      // Check for markdown image syntax
      const markdownMatch = content.match(/!\[.*?\]\((https?:\/\/\S+)\)/i);
      if (markdownMatch && markdownMatch[1]) {
        return markdownMatch[1];
      }
      
      // Check for direct URL
      const urlMatch = content.match(/(https?:\/\/\S+\.(jpg|jpeg|png|webp|gif))/i);
      if (urlMatch && urlMatch[1]) {
        return urlMatch[1];
      }
      
      // Check for HTML image tag
      const htmlMatch = content.match(/<img.*?src="(https?:\/\/\S+)".*?>/i);
      if (htmlMatch && htmlMatch[1]) {
        return htmlMatch[1];
      }
      
      // Try to parse JSON if content looks like JSON
      if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
        try {
          const jsonContent = JSON.parse(content);
          if (jsonContent.url) {
            return jsonContent.url;
          }
        } catch (e) {
          // Not valid JSON, continue with other extraction methods
        }
      }
      
      // Return the full content as a fallback
      return content;
    }
    
    return null;
  } catch (error) {
    console.error("Failed to generate image:", error);
    return null;
  }
};
