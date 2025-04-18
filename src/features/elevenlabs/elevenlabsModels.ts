// Define model types
export interface ElevenLabsModel {
  modelId: string;
  name: string;
  description: string;
  languages?: number;
  maxCharacters?: number;
  latency?: string;
  isMultilingual?: boolean;
}

// Define voice interface
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  preview_url?: string;
  category?: string;
  description?: string;
  labels?: Record<string, string>;
  isHighQuality?: boolean;
}

// Available models from ElevenLabs
export const ELEVENLABS_MODELS: ElevenLabsModel[] = [
  {
    modelId: "eleven_multilingual_v2",
    name: "Eleven Multilingual v2",
    description: "Our most lifelike, emotionally rich speech synthesis model",
    languages: 29,
    maxCharacters: 10000,
    isMultilingual: true
  },
  {
    modelId: "eleven_multilingual_v1",
    name: "Eleven Multilingual v1",
    description: "Previous generation multilingual model",
    languages: 29,
    maxCharacters: 10000,
    isMultilingual: true
  },
  {
    modelId: "eleven_english_v2",
    name: "Eleven English v2",
    description: "High-quality English model",
    languages: 1,
    maxCharacters: 10000,
    isMultilingual: false
  },
  {
    modelId: "eleven_english_v1",
    name: "Eleven English v1",
    description: "Previous generation English model",
    languages: 1,
    maxCharacters: 10000,
    isMultilingual: false
  },
  {
    modelId: "eleven_turbo_v2",
    name: "Eleven Turbo v2",
    description: "Fast, high-quality model with lower latency",
    languages: 1,
    maxCharacters: 5000,
    latency: "Medium",
    isMultilingual: false
  },
  {
    modelId: "eleven_flash_v2.5",
    name: "Eleven Flash v2.5",
    description: "Ultra-low latency model, optimized for real-time applications",
    languages: 32,
    maxCharacters: 40000,
    latency: "~75ms",
    isMultilingual: true
  }
];

// Function to get voices from the Voice Library
export const getVoiceLibrary = async (apiKey: string): Promise<ElevenLabsVoice[]> => {
  try {
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    console.error("Failed to fetch voices from ElevenLabs:", error);
    return [];
  }
};

// Function to add a voice from the Voice Library to your account
export const addVoiceFromLibrary = async (apiKey: string, voiceId: string): Promise<boolean> => {
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/user/voices/add/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error("Failed to add voice from library:", error);
    return false;
  }
};

// Function to search for a voice in the Voice Library
export const searchVoiceLibrary = async (
  apiKey: string, 
  query: string,
  filters?: {
    gender?: 'male' | 'female' | 'neutral';
    age?: 'young' | 'middle_aged' | 'old';
    accent?: string;
    language?: string;
    useCase?: string;
    category?: 'professional' | 'generated';
  }
): Promise<ElevenLabsVoice[]> => {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();
    if (query) queryParams.append('name', query);
    if (filters) {
      if (filters.gender) queryParams.append('gender', filters.gender);
      if (filters.age) queryParams.append('age', filters.age);
      if (filters.accent) queryParams.append('accent', filters.accent);
      if (filters.language) queryParams.append('language', filters.language);
      if (filters.useCase) queryParams.append('use_case', filters.useCase);
      if (filters.category) queryParams.append('category', filters.category);
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/voices/library?${queryParams.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    console.error("Failed to search Voice Library:", error);
    return [];
  }
}; 