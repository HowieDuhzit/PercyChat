import { CharacterCompositeLayer, setEye, setMouth, stopAnimation } from "../vrmViewer/animationControls";
import { Screenplay } from "./messages";
import { Talk } from "./messages";
import { synthesizeVoice } from "../elevenlabs/elevenlabs";
import { debounce } from "../../utils/debounce";
import { ElevenLabsParam } from "../constants/elevenLabsParam";
import { wait } from "../../utils/wait";
import { Viewer } from "../vrmViewer/viewer";

const createSpeakCharacter = () => {
  let lastTime = 0;
  let prevFetchPromise: Promise<unknown> = Promise.resolve();
  let prevSpeakPromise: Promise<unknown> = Promise.resolve();

  return (
    screenplay: Screenplay,
    elevenLabsKey: string,
    elevenLabsParam: ElevenLabsParam,
    viewer: Viewer,
    onStart?: () => void,
    onComplete?: () => void
  ) => {
    const fetchPromise = prevFetchPromise.then(async () => {
      const now = Date.now();
      if (now - lastTime < 1000) {
        await wait(1000 - (now - lastTime));
      }

      // if elevenLabsKey is not set, do not fetch audio
      if (!elevenLabsKey || elevenLabsKey.trim() == "") {
        console.log("elevenLabsKey is not set");
        return null;
      }

      const buffer = await fetchAudio(screenplay.talk, elevenLabsKey, elevenLabsParam).catch(() => null);
      lastTime = Date.now();
      return buffer;
    });

    prevFetchPromise = fetchPromise;
    prevSpeakPromise = Promise.all([fetchPromise, prevSpeakPromise]).then(([audioBuffer]) => {
      onStart?.();
      if (!audioBuffer) {
        // pass along screenplay to change avatar expression
        return viewer.model?.speak(null, screenplay);
      }
      return viewer.model?.speak(audioBuffer, screenplay);
    });
    prevSpeakPromise.then(() => {
      onComplete?.();
    });
  };
}

export const speakCharacter = createSpeakCharacter();

export const fetchAudio = async (
  talk: Talk, 
  elevenLabsKey: string,
  elevenLabsParam: ElevenLabsParam,
): Promise<ArrayBuffer> => {
  try {
    // Use synthesizeVoice with updated parameters
    const audioBuffer = await synthesizeVoice(
      talk.message,
      elevenLabsKey,
      elevenLabsParam
    );
    
    return audioBuffer;
  } catch (error) {
    console.error("Error fetching audio:", error);
    throw error;
  }
};
