import { useState, useCallback } from "react";
import { Link } from "./link";

type Props = {
  openAiKey: string;
  elevenLabsKey: string;
  onChangeAiKey: (openAiKey: string) => void;
  onChangeElevenLabsKey: (elevenLabsKey: string) => void;
};
export const Introduction = ({ openAiKey, elevenLabsKey, onChangeAiKey, onChangeElevenLabsKey }: Props) => {
  const [opened, setOpened] = useState(true);

  const handleAiKeyChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChangeAiKey(event.target.value);
    },
    [onChangeAiKey]
  );

  const handleElevenLabsKeyChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChangeElevenLabsKey(event.target.value);
    },
    [onChangeElevenLabsKey]
  );

  return opened ? (
    <div className="absolute z-40 w-full h-full px-24 py-40  bg-black/30 font-M_PLUS_2">
      <div className="mx-auto my-auto max-w-3xl max-h-full p-24 overflow-auto bg-white rounded-16">
        <div className="my-24">
          <div className="my-8 font-bold typography-20 text-secondary ">
            Talk to Percy
          </div>
          <div>
            You can enjoy conversations with Percy using only a web browser using a microphone, text input, and speech synthesis.
          </div>
        </div>
        <div className="my-24">
          <div className="my-8 font-bold typography-20 text-secondary">
            ElevenLabs API
          </div>
          <input
            type="text"
            placeholder="ElevenLabs API key"
            value={elevenLabsKey}
            onChange={handleElevenLabsKeyChange}
            className="my-4 px-16 py-8 w-full h-40 bg-surface3 hover:bg-surface3-hover rounded-4 text-ellipsis"
          ></input>
          <div>
            Enter your ElevenLabs API key to enable text to speech. You can get an API key at the&nbsp;
            <Link
              url="https://beta.elevenlabs.io/"
              label="ElevenLabs website"
            />.
          </div>
          <div className="my-16">
          The entered API key is stored in browser local storage and is used to call the ElevenLabs API, so it will not be saved on the server.
          </div>
        </div>
        <div className="my-24">
          <button
            onClick={() => {
              setOpened(false);
            }}
            className="font-bold bg-secondary hover:bg-secondary-hover active:bg-secondary-press disabled:bg-secondary-disabled text-white px-24 py-8 rounded-oval"
          >
            Start
          </button>
        </div>
      </div>
    </div>
  ) : null;
};
