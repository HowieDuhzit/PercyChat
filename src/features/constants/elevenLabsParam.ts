export type ElevenLabsParam = {
    voiceId: string;
    modelId?: string;
    stability?: number;
    similarityBoost?: number;
};

export const DEFAULT_ELEVEN_LABS_PARAM: ElevenLabsParam = {
    voiceId: "21m00Tcm4TlvDq8ikWAM",
    modelId: "eleven_monolingual_v1",
    stability: 0.5,
    similarityBoost: 0.75
} as const;