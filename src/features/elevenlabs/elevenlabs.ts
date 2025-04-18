import { ElevenLabsParam } from "../constants/elevenLabsParam";
import { TalkStyle } from "../messages/messages";
import axios from 'axios';
import { ElevenLabsClient } from "elevenlabs";


export async function synthesizeVoice(
  message: string,
  speaker_x: number,
  speaker_y: number,
  style: TalkStyle,
  elevenLabsKey: string,
  elevenLabsParam: ElevenLabsParam
) {

  // Set the API key for ElevenLabs API. 
  // Do not use directly. Use environment variables.
  const API_KEY = elevenLabsKey;
  // Set the ID of the voice to be used.
  const VOICE_ID = elevenLabsParam.voiceId;

  console.log('elevenlabs voice_id: ' + VOICE_ID);

  // Set options for the API request.
  const options = {
    method: 'POST',
    url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    headers: {
      accept: 'audio/mpeg', // Set the expected response type to audio/mpeg.
      'content-type': 'application/json', // Set the content type to application/json.
      'xi-api-key': `${API_KEY}`, // Set the API key in the headers.
    },
    data: {
      text: message, // Pass in the inputText as the text to be converted to speech.
    },
    responseType: 'arraybuffer', // Set the responseType to arraybuffer to receive binary data as response.
  };

  // Send the API request using Axios and wait for the response.
  // @ts-ignore
  const speechDetails = await axios.request(options);
  // Get the binary audio data received from the API response.
  const data =  speechDetails.data;
  // Create a new Blob object from the audio data with MIME type 'audio/mpeg'
  const blob = new Blob([data], { type: 'audio/mpeg' });
  // Create a URL for the blob object
  const url = URL.createObjectURL(blob);

  return {
    audio: url
  };
}

export async function getVoices(apiKey: string) {
  const response = await fetch("https://api.elevenlabs.io/v1/voices", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
  });

  if (!response.ok) {
    console.error("Failed to fetch voices:", response.statusText);
    return { voices: [] };
  }

  const data = await response.json();
  return data;
}

export async function speakText(
  text: string,
  voice: ElevenLabsParam,
  apiKey: string
) {
  const { voiceId, modelId, stability, similarityBoost, style, speakerBoost } = voice;
  
  const requestBody: any = {
    text: text,
    model_id: modelId || "eleven_multilingual_v2",
    voice_settings: {}
  };

  // Add optional parameters only if they're defined
  if (stability !== undefined) {
    requestBody.voice_settings.stability = stability;
  }
  if (similarityBoost !== undefined) {
    requestBody.voice_settings.similarity_boost = similarityBoost;
  }
  if (style !== undefined) {
    requestBody.voice_settings.style = style;
  }
  if (speakerBoost !== undefined) {
    requestBody.voice_settings.speaker_boost = speakerBoost;
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      console.error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`Error details: ${errorText}`);
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }

    const audioBlob = await response.blob();
    return audioBlob;
  } catch (error) {
    console.error("Error in speakText:", error);
    throw error;
  }
}

// Function to get voice settings
export async function getVoiceSettings(apiKey: string, voiceId: string) {
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/voices/${voiceId}/settings`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
      }
    );

    if (!response.ok) {
      console.error(`Error fetching voice settings: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch voice settings:", error);
    return null;
  }
}

// Function to get available models
export async function getAvailableModels(apiKey: string) {
  try {
    const response = await fetch(
      "https://api.elevenlabs.io/v1/models",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
      }
    );

    if (!response.ok) {
      console.error(`Error fetching models: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return data.models || [];
  } catch (error) {
    console.error("Failed to fetch available models:", error);
    return [];
  }
}
