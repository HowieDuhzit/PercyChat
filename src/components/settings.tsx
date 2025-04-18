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
import { getVoices, getModels } from "@/features/elevenlabs/elevenlabs";
import { ElevenLabsParam } from "@/features/constants/elevenLabsParam";
import { RestreamTokens } from "./restreamTokens";
import Cookies from 'js-cookie';
import { fetchOpenRouterModels } from "@/features/chat/openAiChat";

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
  onChangeElevenLabsParam: (param: ElevenLabsParam) => void;
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

// Add interface for ElevenLabs models
interface ElevenLabsModel {
  model_id: string;
  name: string;
  description?: string;
  token_limit?: number;
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
}: Props) => {

  const [elevenLabsVoices, setElevenLabsVoices] = useState<any[]>([]);
  const [availableModels, setAvailableModels] = useState<OpenRouterModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [elevenLabsModels, setElevenLabsModels] = useState<ElevenLabsModel[]>([]);
  const [voiceStability, setVoiceStability] = useState(
    elevenLabsParam.stability ?? 0.5
  );
  const [voiceSimilarityBoost, setVoiceSimilarityBoost] = useState(
    elevenLabsParam.similarityBoost ?? 0.75
  );

  // Check if keys are from environment variables
  const isOpenRouterKeyFromEnv = !openRouterKey || (openRouterKey === process.env.NEXT_PUBLIC_OPENROUTER_API_KEY && process.env.NEXT_PUBLIC_OPENROUTER_API_KEY);
  const isElevenLabsKeyFromEnv = !elevenLabsKey || (elevenLabsKey === process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY && process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY);

  useEffect(() => {
    // Check if ElevenLabs API key exists before fetching voices
    if (elevenLabsKey) {
      getVoices(elevenLabsKey).then((data) => {
        console.log('getVoices');
        console.log(data);

        const voices = data.voices;
        setElevenLabsVoices(voices);
      });
      
      // Also fetch available voice models
      getModels(elevenLabsKey).then((data) => {
        console.log('getModels');
        console.log(data);
        if (data && data.models) {
          setElevenLabsModels(data.models);
        }
      });
    }
  }, [elevenLabsKey, refreshTrigger]); // Added refreshTrigger as a dependency

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

  // Handler for voice model change
  const handleVoiceModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newModelId = event.target.value;
    onChangeElevenLabsParam({
      ...elevenLabsParam,
      modelId: newModelId
    });
  };

  // Handler for voice stability change
  const handleStabilityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const stability = parseFloat(event.target.value);
    setVoiceStability(stability);
    onChangeElevenLabsParam({
      ...elevenLabsParam,
      stability
    });
  };

  // Handler for voice similarity boost change
  const handleSimilarityBoostChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const similarityBoost = parseFloat(event.target.value);
    setVoiceSimilarityBoost(similarityBoost);
    onChangeElevenLabsParam({
      ...elevenLabsParam,
      similarityBoost
    });
  };

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
          <div className="my-40">
            <div className="my-16 typography-20 font-bold">
              Voice Selection
            </div>
            <div className="my-16">
              Select among the voices in ElevenLabs (including custom voices):
            </div>
            <div className="my-8">
              <select className="h-40 px-8 w-full bg-surface3 hover:bg-surface3-hover rounded-4"
                id="select-dropdown"
                onChange={onChangeElevenLabsVoice}
                value={elevenLabsParam.voiceId}
              >
                {elevenLabsVoices.map((voice, index) => (
                  <option key={index} value={voice.voice_id}>
                    {voice.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="my-16 typography-20 font-bold">
              Voice Model
            </div>
            <div className="my-8">
              <select className="h-40 px-8 w-full bg-surface3 hover:bg-surface3-hover rounded-4"
                id="model-dropdown"
                onChange={handleVoiceModelChange}
                value={elevenLabsParam.modelId || "eleven_monolingual_v1"}
              >
                {elevenLabsModels.map((model) => (
                  <option key={model.model_id} value={model.model_id}>
                    {model.name} {model.token_limit ? `(${model.token_limit.toLocaleString()} tokens)` : ''}
                  </option>
                ))}
                {elevenLabsModels.length === 0 && (
                  <>
                    <option value="eleven_monolingual_v1">Eleven Monolingual v1</option>
                    <option value="eleven_multilingual_v2">Eleven Multilingual v2</option>
                    <option value="eleven_turbo_v2">Eleven Turbo v2</option>
                  </>
                )}
              </select>
            </div>
            <div className="my-16">
              <div className="typography-16 font-semibold mb-2">Voice Stability: {voiceStability.toFixed(2)}</div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={voiceStability}
                onChange={handleStabilityChange}
                className="w-full"
              />
              <div className="text-xs flex justify-between mt-1">
                <span>More variation (0.00)</span>
                <span>More stable (1.00)</span>
              </div>
            </div>
            <div className="my-16">
              <div className="typography-16 font-semibold mb-2">Similarity Boost: {voiceSimilarityBoost.toFixed(2)}</div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={voiceSimilarityBoost}
                onChange={handleSimilarityBoostChange}
                className="w-full"
              />
              <div className="text-xs flex justify-between mt-1">
                <span>Less similar (0.00)</span>
                <span>More similar (1.00)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
