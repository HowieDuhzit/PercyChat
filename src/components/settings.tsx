import React, { useEffect, useState, cache } from "react";
import { IconButton } from "./iconButton";
import { TextButton } from "./textButton";
import { Message } from "@/features/messages/messages";
import {
  KoeiroParam,
  PRESET_A,
  PRESET_B,
  PRESET_C,
  PRESET_D,
} from "@/features/constants/koeiroParam";
import { Link } from "./link";
import { getVoices, getAvailableModels, getVoiceSettings } from "@/features/elevenlabs/elevenlabs";
import { ElevenLabsParam } from "@/features/constants/elevenLabsParam";
import { RestreamTokens } from "./restreamTokens";
import Cookies from 'js-cookie';
import { fetchOpenRouterModels } from "@/features/chat/openAiChat";
import { 
  ELEVENLABS_MODELS, 
  ElevenLabsModel, 
  ElevenLabsVoice,
  getVoiceLibrary,
  searchVoiceLibrary,
  addVoiceFromLibrary
} from "@/features/elevenlabs/elevenlabsModels";

type Props = {
  openAiKey: string;
  elevenLabsKey: string;
  openRouterKey: string;
  systemPrompt: string;
  chatLog: Message[];
  elevenLabsParam: ElevenLabsParam;
  koeiroParam: KoeiroParam;
  selectedModel: string;
  hideActionPrompts: boolean;
  refreshTrigger?: number;
  onClickClose: () => void;
  onChangeAiKey: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onChangeOpenRouterKey: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onChangeElevenLabsKey: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onChangeElevenLabsVoice: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onChangeSystemPrompt: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onChangeModel: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onChangeHideActionPrompts: (checked: boolean) => void;
  onChangeChatLog: (index: number, text: string) => void;
  onChangeKoeiroParam: (x: number, y: number) => void;
  onClickOpenVrmFile: () => void;
  onClickResetChatLog: () => void;
  onClickResetSystemPrompt: () => void;
  backgroundImage: string;
  onChangeBackgroundImage: (image: string) => void;
  onRestreamTokensUpdate?: (tokens: { access_token: string; refresh_token: string; } | null) => void;
  onTokensUpdate: (tokens: any) => void;
  onChatMessage: (message: string) => void;
  onChangeElevenLabsModel: (modelId: string) => void;
  onSearchVoiceLibrary: (query: string) => void;
};

// New interface for OpenRouter models
interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
    image?: string;
    [key: string]: string | undefined;
  };
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
  description?: string;
  context_length?: number;
}

export const Settings = ({
  openAiKey,
  elevenLabsKey,
  openRouterKey,
  chatLog,
  systemPrompt,
  elevenLabsParam,
  koeiroParam,
  selectedModel,
  hideActionPrompts,
  refreshTrigger = 0,
  onClickClose,
  onChangeSystemPrompt,
  onChangeAiKey,
  onChangeOpenRouterKey,
  onChangeElevenLabsKey,
  onChangeElevenLabsVoice,
  onChangeChatLog,
  onChangeModel,
  onChangeHideActionPrompts,
  onChangeKoeiroParam,
  onClickOpenVrmFile,
  onClickResetChatLog,
  onClickResetSystemPrompt,
  backgroundImage,
  onChangeBackgroundImage,
  onRestreamTokensUpdate = () => {},
  onTokensUpdate,
  onChatMessage,
  onChangeElevenLabsModel,
  onSearchVoiceLibrary,
}: Props) => {

  const [elevenLabsVoices, setElevenLabsVoices] = useState<any[]>([]);
  const [availableModels, setAvailableModels] = useState<OpenRouterModel[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Add new state for ElevenLabs
  const [elevenlabsModels, setElevenlabsModels] = useState<ElevenLabsModel[]>(ELEVENLABS_MODELS);
  const [voiceLibraryResults, setVoiceLibraryResults] = useState<ElevenLabsVoice[]>([]);
  const [voiceSearchQuery, setVoiceSearchQuery] = useState('');
  const [searchingVoices, setSearchingVoices] = useState(false);
  const [selectedVoiceSettings, setSelectedVoiceSettings] = useState<any>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);

  // Check if keys are from environment variables
  const isOpenRouterKeyFromEnv = !openRouterKey || (openRouterKey === process.env.NEXT_PUBLIC_OPENROUTER_API_KEY && process.env.NEXT_PUBLIC_OPENROUTER_API_KEY);
  const isElevenLabsKeyFromEnv = !elevenLabsKey || (elevenLabsKey === process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY && process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY);

  useEffect(() => {
    // Check if ElevenLabs API key exists before fetching voices
    if (elevenLabsKey) {
      // Fetch voices from the user's account
      getVoices(elevenLabsKey).then((data) => {
        console.log('getVoices');
        console.log(data);

        const voices = data.voices;
        setElevenLabsVoices(voices);
      });
      
      // Also fetch available models
      getAvailableModels(elevenLabsKey).then((models) => {
        if (models && models.length > 0) {
          setElevenlabsModels(models);
        }
      });
      
      // Fetch voice settings for the currently selected voice
      if (elevenLabsParam?.voiceId) {
        getVoiceSettings(elevenLabsKey, elevenLabsParam.voiceId).then((settings) => {
          if (settings) {
            setSelectedVoiceSettings(settings);
          }
        });
      }
    }
  }, [elevenLabsKey, elevenLabsParam?.voiceId]);

  // Fetch models when OpenRouter key changes or when settings panel opens
  useEffect(() => {
    const getModels = async () => {
      if (!openRouterKey) return;
      
      setLoading(true);
      try {
        console.log('Fetching OpenRouter models...');
        const models = await fetchOpenRouterModels(openRouterKey);
        if (models && Array.isArray(models)) {
          console.log(`Fetched ${models.length} models`);
          setAvailableModels(models);
        }
      } catch (error) {
        console.error("Error fetching models:", error);
      } finally {
        setLoading(false);
      }
    };
    
    getModels();
  }, [openRouterKey, refreshTrigger]); // Added refreshTrigger as a dependency

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onChangeBackgroundImage(base64String);
        localStorage.setItem('backgroundImage', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBackground = () => {
    onChangeBackgroundImage('');
    localStorage.removeItem('backgroundImage');
  };

  // Check if a model is free based on its pricing
  const isModelFree = (model: OpenRouterModel): boolean => {
    if (!model.pricing) return false;
    return Object.values(model.pricing).every(price => price === "0");
  };

  // Check if a model supports image generation
  const supportsImageGeneration = (model: OpenRouterModel): boolean => {
    if (!model.architecture?.output_modalities) return false;
    return model.architecture.output_modalities.includes("image");
  };

  // Add handler for model change
  const handleElevenLabsModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const modelId = event.target.value;
    // Update the model in the ElevenLabsParam
    onChangeElevenLabsModel(modelId);
  };
  
  // Add handler for voice library search
  const handleVoiceLibrarySearch = async () => {
    if (!elevenLabsKey || !voiceSearchQuery.trim()) return;
    
    setSearchingVoices(true);
    try {
      const results = await searchVoiceLibrary(elevenLabsKey, voiceSearchQuery);
      setVoiceLibraryResults(results);
    } catch (error) {
      console.error("Error searching voice library:", error);
    } finally {
      setSearchingVoices(false);
    }
  };
  
  // Add handler for adding a voice from the library
  const handleAddVoiceFromLibrary = async (voiceId: string) => {
    if (!elevenLabsKey) return;
    
    try {
      const success = await addVoiceFromLibrary(elevenLabsKey, voiceId);
      if (success) {
        // Refresh the voice list
        const data = await getVoices(elevenLabsKey);
        setElevenLabsVoices(data.voices || []);
        
        // Use the new voice
        onChangeElevenLabsModel(voiceId);
      }
    } catch (error) {
      console.error("Error adding voice from library:", error);
    }
  };
  
  // Add handler for playing voice preview
  const handlePlayVoicePreview = (previewUrl: string) => {
    if (previewAudio) {
      previewAudio.pause();
      previewAudio.src = '';
    }
    
    const audio = new Audio(previewUrl);
    audio.play();
    setPreviewAudio(audio);
  };
  
  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (previewAudio) {
        previewAudio.pause();
        previewAudio.src = '';
      }
    };
  }, [previewAudio]);

  return (
    <div className="absolute z-40 w-full h-full bg-white/80 backdrop-blur ">
      <div className="absolute m-24">
        <IconButton
          iconName="24/Close"
          isProcessing={false}
          onClick={onClickClose}
        ></IconButton>
      </div>
      <div className="max-h-full overflow-auto">
        <div className="text-text1 max-w-3xl mx-auto px-24 py-64 ">
          <div className="my-24 typography-32 font-bold">Settings</div>
          <div className="my-24">
            <div className="my-16 typography-20 font-bold">OpenRouter API</div>
            <input
              type="text"
              placeholder={isOpenRouterKeyFromEnv ? "Using default API key from environment" : "OpenRouter API key"}
              value={isOpenRouterKeyFromEnv ? "" : openRouterKey}
              onChange={onChangeOpenRouterKey}
              className="my-4 px-16 py-8 w-full h-40 bg-surface3 hover:bg-surface3-hover rounded-4 text-ellipsis"
            ></input>
            <div>
              Enter your OpenRouter API key for custom access. You can get an API key at the&nbsp;
              <Link
                url="https://openrouter.ai/"
                label="OpenRouter website"
              />.
              {isOpenRouterKeyFromEnv && (
                <div className="mt-2 text-green-600">
                  Currently using a default API key provided by the administrator. Enter your own key to override.
                </div>
              )}
            </div>
          </div>
          <div className="my-24">
            <div className="my-16 typography-20 font-bold">Model Selection</div>
            <div className="my-8">
              <select 
                className="h-40 px-8 w-full bg-surface3 hover:bg-surface3-hover rounded-4"
                id="model-dropdown"
                onChange={onChangeModel}
                value={selectedModel}
                disabled={loading}
              >
                {loading ? (
                  <option value="">Loading models...</option>
                ) : availableModels.length > 0 ? (
                  [
                    // Group models by provider
                    ...Object.entries(
                      availableModels.reduce((acc, model) => {
                        const provider = model.id.split('/')[0];
                        if (!acc[provider]) acc[provider] = [];
                        acc[provider].push(model);
                        return acc;
                      }, {} as Record<string, OpenRouterModel[]>)
                    ).map(([provider, models]) => (
                      <optgroup key={provider} label={provider.charAt(0).toUpperCase() + provider.slice(1)}>
                        {models.map(model => (
                          <option key={model.id} value={model.id}>
                            {model.name} 
                            {isModelFree(model) ? " (Free)" : ""} 
                            {supportsImageGeneration(model) ? " (Images)" : ""}
                          </option>
                        ))}
                      </optgroup>
                    ))
                  ]
                ) : (
                  // Fallback to hardcoded models
                  <>
                    <option value="anthropic/claude-3.5-sonnet:beta">Claude 3.5 Sonnet</option>
                    <option value="anthropic/claude-3-opus:beta">Claude 3 Opus</option>
                    <option value="anthropic/claude-3-sonnet:beta">Claude 3 Sonnet</option>
                    <option value="anthropic/claude-3-haiku:beta">Claude 3 Haiku</option>
                    <option value="openai/gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="openai/gpt-4o">GPT-4o</option>
                    <option value="openai/gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="google/gemini-1.5-pro">Gemini 1.5 Pro</option>
                    <option value="google/gemini-flash-1.5-exp">Gemini Flash</option>
                    <option value="meta-llama/llama-3-70b-instruct">Llama 3 70B</option>
                    <option value="meta-llama/llama-3-8b-instruct">Llama 3 8B</option>
                    <option value="mistralai/mistral-large">Mistral Large</option>
                    <option value="mistralai/mistral-small">Mistral Small</option>
                    <option value="cohere/command-r-plus">Cohere Command R+</option>
                    <option value="cohere/command-r">Cohere Command R</option>
                    <option value="stability/stable-diffusion-3">Stable Diffusion 3 (Images)</option>
                  </>
                )}
              </select>
            </div>
            <div>
              Select which AI model to use for chat responses.
              {availableModels.length > 0 && selectedModel && (
                <div className="mt-8 text-sm">
                  {(() => {
                    const model = availableModels.find(m => m.id === selectedModel);
                    if (!model) return null;
                    return (
                      <>
                        <div><strong>Description:</strong> {model.description || "No description available"}</div>
                        <div><strong>Context length:</strong> {model.context_length?.toLocaleString() || "Unknown"} tokens</div>
                        <div><strong>Pricing:</strong> {isModelFree(model) ? "Free" : 
                          `$${parseFloat(model.pricing.prompt) * 1000} per 1K prompt tokens, $${parseFloat(model.pricing.completion) * 1000} per 1K completion tokens`}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
          <div className="my-24">
            <div className="my-16 typography-20 font-bold">Display Settings</div>
            <div className="flex items-center my-8">
              <input
                type="checkbox"
                id="hide-action-prompts"
                checked={hideActionPrompts}
                onChange={(e) => onChangeHideActionPrompts(e.target.checked)}
                className="mr-8 h-16 w-16"
              />
              <label htmlFor="hide-action-prompts" className="cursor-pointer">
                Hide action prompts (like [happy], [sad]) in chat responses
              </label>
            </div>
            <div>
              When enabled, this will hide emotional tags like [happy] or [sad] from displaying in chat responses.
            </div>
          </div>
          <div className="my-24">
            <div className="my-16 typography-20 font-bold">Eleven Labs API</div>
            <input
              type="text"
              placeholder={isElevenLabsKeyFromEnv ? "Using default API key from environment" : "ElevenLabs API key"}
              value={isElevenLabsKeyFromEnv ? "" : elevenLabsKey}
              onChange={onChangeElevenLabsKey}
              className="my-4 px-16 py-8 w-full h-40 bg-surface3 hover:bg-surface3-hover rounded-4 text-ellipsis"
            ></input>
            <div>
              Enter your ElevenLabs API key to enable text to speech. You can get an API key at the&nbsp;
              <Link
                url="https://beta.elevenlabs.io/"
                label="ElevenLabs website"
              />.
              {isElevenLabsKeyFromEnv && (
                <div className="mt-2 text-green-600">
                  Currently using a default API key provided by the administrator. Enter your own key to override.
                </div>
              )}
            </div>
          </div>
          <div className="my-24">
            <div className="my-16 typography-20 font-bold">Voice Model</div>
            <div className="my-8">
              <select 
                className="h-40 px-8 w-full bg-surface3 hover:bg-surface3-hover rounded-4"
                id="model-dropdown"
                onChange={handleElevenLabsModelChange}
                value={elevenLabsParam.modelId || "eleven_multilingual_v2"}
                disabled={!elevenLabsKey}
              >
                {elevenlabsModels.map((model) => (
                  <option key={model.modelId} value={model.modelId}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              Select which ElevenLabs model to use for text-to-speech. Different models offer various trade-offs between quality and speed.
            </div>
            {elevenLabsParam.modelId && (
              <div className="mt-4 text-sm p-4 bg-gray-100 rounded-md">
                {(() => {
                  const model = elevenlabsModels.find(m => m.modelId === elevenLabsParam.modelId);
                  if (!model) return null;
                  return (
                    <>
                      <div className="font-semibold">{model.name}</div>
                      <div>{model.description}</div>
                      {model.languages && (
                        <div>Supports {model.languages} languages</div>
                      )}
                      {model.maxCharacters && (
                        <div>Max text length: {model.maxCharacters} characters</div>
                      )}
                      {model.latency && (
                        <div>Latency: {model.latency}</div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
          <div className="my-24">
            <div className="my-16 typography-20 font-bold">
              Voice Selection
            </div>
            <div className="my-16">
              Select among the voices in your ElevenLabs account (including custom voices):
            </div>
            <div className="my-8">
              <select className="h-40 px-8 w-full"
                id="select-dropdown"
                onChange={onChangeElevenLabsVoice}
                value={elevenLabsParam.voiceId}
                disabled={!elevenLabsKey}
              >
                {elevenLabsVoices.map((voice, index) => (
                  <option key={index} value={voice.voice_id}>
                    {voice.name}
                  </option>
                ))}
              </select>
            </div>
            
            {selectedVoiceSettings && (
              <div className="mt-4 mb-8 p-4 bg-gray-100 rounded-md">
                <div className="font-semibold mb-2">Voice Settings</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Stability: {selectedVoiceSettings.stability?.toFixed(2) || "Default"}</div>
                  <div>Similarity Boost: {selectedVoiceSettings.similarity_boost?.toFixed(2) || "Default"}</div>
                </div>
              </div>
            )}
            
            <div className="mt-8">
              <div className="font-semibold mb-2">Search Voice Library</div>
              <div className="flex items-center">
                <input
                  type="text"
                  placeholder="Search for voices by name, keyword..."
                  value={voiceSearchQuery}
                  onChange={(e) => setVoiceSearchQuery(e.target.value)}
                  className="px-16 py-8 w-full h-40 bg-surface3 hover:bg-surface3-hover rounded-4 text-ellipsis"
                  disabled={!elevenLabsKey}
                />
                <button
                  onClick={handleVoiceLibrarySearch}
                  disabled={!elevenLabsKey || searchingVoices || !voiceSearchQuery.trim()}
                  className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {searchingVoices ? "Searching..." : "Search"}
                </button>
              </div>
              
              {voiceLibraryResults.length > 0 && (
                <div className="mt-4">
                  <div className="font-semibold mb-2">Search Results ({voiceLibraryResults.length})</div>
                  <div className="max-h-96 overflow-y-auto">
                    {voiceLibraryResults.map((voice) => (
                      <div key={voice.voice_id} className="p-3 border-b border-gray-200 flex flex-col">
                        <div className="flex justify-between items-start">
                          <div className="font-medium">{voice.name}</div>
                          <div className="flex space-x-2">
                            {voice.preview_url && (
                              <button
                                onClick={() => handlePlayVoicePreview(voice.preview_url!)}
                                className="text-sm text-blue-500 hover:text-blue-700"
                              >
                                Preview
                              </button>
                            )}
                            <button
                              onClick={() => handleAddVoiceFromLibrary(voice.voice_id)}
                              className="text-sm text-green-500 hover:text-green-700"
                            >
                              Use Voice
                            </button>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {voice.description || "No description"}
                        </div>
                        {voice.labels && Object.keys(voice.labels).length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {Object.entries(voice.labels).map(([key, value]) => (
                              <span key={key} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                                {key}: {value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
