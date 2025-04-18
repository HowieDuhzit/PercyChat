import { Screenplay } from "./messages";
import { speakText } from "@/features/elevenlabs/elevenlabs";
import { ElevenLabsParam } from "../constants/elevenLabsParam";

export async function speakCharacter(
  screenplay: Screenplay,
  elevenLabsKey: string,
  elevenLabsParam: ElevenLabsParam,
  viewer: any | null, // Use any for now until we have the correct type
  onStart?: () => void,
  onEnd?: () => void
) {
  if (!elevenLabsKey) {
    console.log("No ElevenLabs API key provided.");
    return;
  }

  console.log("speakCharacter function called with parameters:", {
    screenplay: typeof screenplay === 'object' ? "screenplay object" : screenplay,
    hasElevenLabsKey: !!elevenLabsKey,
    elevenLabsParam
  });

  // Handle both array and single object format for screenplay
  const scenes = Array.isArray(screenplay) ? screenplay : [screenplay];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    if (viewer && scene.expression) {
      // expressions are one of "Neutral", "Happy", "Angry", "Sad", or "Relaxed"
      // not all models necessarily have all expressions defined
      // We may want to map expressions to only those supported by the current model
      if (viewer.expressionController) {
        viewer.expressionController.setExpression(scene.expression);
      }
    }
    if (elevenLabsKey && scene.message) {
      try {
        console.log('Sending text to ElevenLabs API:', scene.message);
        console.log('Using voice ID:', elevenLabsParam.voiceId);
        console.log('Using model ID:', elevenLabsParam.modelId || 'default');
        
        // Get the audio blob from ElevenLabs API
        const blob = await speakText(
          scene.message,
          elevenLabsParam,
          elevenLabsKey
        );
        
        // Create a URL for the audio blob
        const url = URL.createObjectURL(blob);
        
        // Create and play the audio
        const audio = new Audio(url);
        
        // Set up event listeners for audio
        let hasStarted = false;
        
        audio.addEventListener("play", () => {
          if (!hasStarted) {
            console.log("Audio started playing");
            hasStarted = true;
            onStart?.();
          }
        });
        
        audio.addEventListener("ended", () => {
          console.log("Audio finished playing");
          URL.revokeObjectURL(url);
          onEnd?.();
        });
        
        // Start playback
        const playPromise = audio.play();
        
        // Handle autoplay restrictions
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.error("Playback failed:", error);
            URL.revokeObjectURL(url);
            onEnd?.();
          });
        }
        
        // Wait for audio to finish
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
        });
        
      } catch (error) {
        console.error("Error during speech synthesis:", error);
        onEnd?.();
      }
    }
  }
}
