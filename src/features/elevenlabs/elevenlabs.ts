import { ElevenLabsParam } from "../constants/elevenLabsParam";
import axios from 'axios';
import { ElevenLabsClient } from "elevenlabs";

export async function synthesizeVoice(
  text: string,
  elevenLabsKey: string,
  elevenLabsParam: ElevenLabsParam
) {
  try {
    console.log('Synthesizing voice...');
    // Set the API key for ElevenLabs API.
    
    const API_KEY = elevenLabsKey;
    
    const VOICE_ID = elevenLabsParam.voiceId;
    
    console.log('elevenlabs voice_id: ' + VOICE_ID);

    // Use the model ID and voice settings if provided
    const modelId = elevenLabsParam.modelId ?? "eleven_monolingual_v1";
    const stability = elevenLabsParam.stability ?? 0.5;
    const similarityBoost = elevenLabsParam.similarityBoost ?? 0.75;

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        text: text,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost
        }
      },
      {
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": API_KEY,
        },
        responseType: "arraybuffer",
      }
    );

    // Return the audio data as an arraybuffer.
    return response.data;
  } catch (error) {
    console.error("Error synthesizing voice:", error);
    throw error;
  }
}

export async function getVoices(elevenLabsKey: string) {
  try {
    const client = new ElevenLabsClient({ apiKey: elevenLabsKey });
    const response = await client.voices.getAll();
    return response;
  } catch (error) {
    console.error("Error fetching voices from ElevenLabs:", error);
    // Fallback to the axios client
    const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": elevenLabsKey,
      },
    });
    return response.data;
  }
}

// Add function to get available models from ElevenLabs
export async function getModels(elevenLabsKey: string) {
  try {
    const response = await axios.get('https://api.elevenlabs.io/v1/models', {
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": elevenLabsKey,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching models from ElevenLabs:", error);
    return { models: [] };
  }
}

// Get available voices from ElevenLabs
export const getVoicesFromElevenLabs = async (apiKey: string) => {
  const response = await fetch("https://api.elevenlabs.io/v1/voices", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
  });

  const data = await response.json();
  return data;
};

// Get available models from ElevenLabs
export const getModelsFromElevenLabs = async (apiKey: string) => {
  const response = await fetch("https://api.elevenlabs.io/v1/models", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
  });

  const data = await response.json();
  return data;
};

// Text to speech conversion
export const textToSpeechFromElevenLabs = async (
  text: string,
  apiKey: string,
  param: ElevenLabsParam
) => {
  // Use default values if not provided
  const stability = param.stability ?? 0.5;
  const similarityBoost = param.similarityBoost ?? 0.75;
  const modelId = param.modelId ?? "eleven_monolingual_v1"; // Default model

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${param.voiceId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
        },
      }),
    }
  );

  const audioBlob = await response.blob();
  return audioBlob;
};
