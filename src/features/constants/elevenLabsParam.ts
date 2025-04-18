export type ElevenLabsParam = {
    voiceId: string;
    modelId?: string;
    stability?: number;
    similarityBoost?: number;
    style?: number;
    speakerBoost?: boolean;
};

export const DEFAULT_ELEVEN_LABS_PARAM: ElevenLabsParam = {
    voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel
    modelId: "eleven_multilingual_v2", // Default to Multilingual v2
    stability: 0.5,
    similarityBoost: 0.75
} as const;