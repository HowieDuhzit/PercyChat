import { useCallback, useContext, useEffect, useState } from "react";
import VrmViewer from "@/components/vrmViewer";
import { ViewerContext } from "@/features/vrmViewer/viewerContext";
import {
  Message,
  textsToScreenplay,
  Screenplay,
} from "@/features/messages/messages";
import { speakCharacter } from "@/features/messages/speakCharacter";
import { MessageInputContainer } from "@/components/messageInputContainer";
import { SYSTEM_PROMPT } from "@/features/constants/systemPromptConstants";
import { KoeiroParam, DEFAULT_KOEIRO_PARAM } from "@/features/constants/koeiroParam";
import { getChatResponseStream, generateImage } from "@/features/chat/openAiChat";
import { M_PLUS_2, Montserrat } from "next/font/google";
import { Introduction } from "@/components/introduction";
import { Menu } from "@/components/menu";
//import { GitHubLink } from "@/components/githubLink";
import { Meta } from "@/components/meta";
import { ElevenLabsParam, DEFAULT_ELEVEN_LABS_PARAM } from "@/features/constants/elevenLabsParam";
import { buildUrl } from "@/utils/buildUrl";
import { websocketService } from '../services/websocketService';
import { MessageMiddleOut } from "@/features/messages/messageMiddleOut";

const m_plus_2 = M_PLUS_2({
  variable: "--font-m-plus-2",
  display: "swap",
  preload: false,
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  display: "swap",
  subsets: ["latin"],
});

type LLMCallbackResult = {
  processed: boolean;
  error?: string;
};

export default function Home() {
  const { viewer } = useContext(ViewerContext);

  const [systemPrompt, setSystemPrompt] = useState(SYSTEM_PROMPT);
  const [openAiKey, setOpenAiKey] = useState("");
  const [elevenLabsKey, setElevenLabsKey] = useState("");
  const [elevenLabsParam, setElevenLabsParam] = useState<ElevenLabsParam>(DEFAULT_ELEVEN_LABS_PARAM);
  const [koeiroParam, setKoeiroParam] = useState<KoeiroParam>(DEFAULT_KOEIRO_PARAM);
  const [chatProcessing, setChatProcessing] = useState(false);
  const [chatLog, setChatLog] = useState<Message[]>([]);
  const [assistantMessage, setAssistantMessage] = useState("");
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [restreamTokens, setRestreamTokens] = useState<any>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  // needed because AI speaking could involve multiple audios being played in sequence
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    // Try to load from localStorage on initial render
    if (typeof window !== 'undefined') {
      const savedModel = localStorage.getItem('selectedModel');
      if (savedModel) return savedModel;
      
      // If not in localStorage, try environment variable
      if (process.env.NEXT_PUBLIC_DEFAULT_MODEL) {
        return process.env.NEXT_PUBLIC_DEFAULT_MODEL;
      }
      
      // Default fallback
      return 'anthropic/claude-3.5-sonnet:beta';
    }
    return 'anthropic/claude-3.5-sonnet:beta';
  });
  const [hideActionPrompts, setHideActionPrompts] = useState<boolean>(() => {
    // Try to load from localStorage on initial render
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hideActionPrompts') === 'true' || false;
    }
    return false;
  });
  const [openRouterKey, setOpenRouterKey] = useState<string>(() => {
    // Try to load from localStorage on initial render
    if (typeof window !== 'undefined') {
      return localStorage.getItem('openRouterKey') || '';
    }
    return '';
  });
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  useEffect(() => {
    if (window.localStorage.getItem("chatVRMParams")) {
      const params = JSON.parse(
        window.localStorage.getItem("chatVRMParams") as string
      );
      setSystemPrompt(params.systemPrompt);
      setElevenLabsParam(params.elevenLabsParam);
      setChatLog(params.chatLog);
    }
    if (window.localStorage.getItem("elevenLabsKey")) {
      const key = window.localStorage.getItem("elevenLabsKey") as string;
      setElevenLabsKey(key);
    } else if (process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY) {
      // If no key in localStorage but env var exists, use it
      setElevenLabsKey(process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY);
    }
    // load openrouter key from localStorage
    const savedOpenRouterKey = localStorage.getItem('openRouterKey');
    if (savedOpenRouterKey) {
      setOpenRouterKey(savedOpenRouterKey);
    } else if (process.env.NEXT_PUBLIC_OPENROUTER_API_KEY) {
      // If no key in localStorage but env var exists, use it
      setOpenRouterKey(process.env.NEXT_PUBLIC_OPENROUTER_API_KEY);
    }
    const savedBackground = localStorage.getItem('backgroundImage');
    if (savedBackground) {
      setBackgroundImage(savedBackground);
    }
    const savedModel = localStorage.getItem('selectedModel');
    if (savedModel) {
      setSelectedModel(savedModel);
    }
    const savedHideActionPrompts = localStorage.getItem('hideActionPrompts');
    if (savedHideActionPrompts) {
      setHideActionPrompts(savedHideActionPrompts === 'true');
    }
  }, []);

  useEffect(() => {
    process.nextTick(() => {
      window.localStorage.setItem(
        "chatVRMParams",
        JSON.stringify({ systemPrompt, elevenLabsParam, chatLog })
      )

      // store separately to be backward compatible with local storage data
      window.localStorage.setItem("elevenLabsKey", elevenLabsKey);
    }
    );
  }, [systemPrompt, elevenLabsParam, chatLog]);

  useEffect(() => {
    if (backgroundImage) {
      document.body.style.backgroundImage = `url(${backgroundImage})`;
      // document.body.style.backgroundSize = 'cover';
      // document.body.style.backgroundPosition = 'center';
    } else {
      document.body.style.backgroundImage = `url(${buildUrl("/d34e0536-6a2f-4c75-a4e5-bea2ca591861.jpg")})`;
    }
  }, [backgroundImage]);

  const handleChangeChatLog = useCallback(
    (targetIndex: number, text: string) => {
      const newChatLog = chatLog.map((v: Message, i) => {
        return i === targetIndex ? { role: v.role, content: text } : v;
      });

      setChatLog(newChatLog);
    },
    [chatLog]
  );

  /**
   * 文ごとに音声を直接でリクエストしながら再生する
   */
  const handleSpeakAi = useCallback(
    async (
      screenplay: Screenplay,
      elevenLabsKey: string,
      elevenLabsParam: ElevenLabsParam,
      onStart?: () => void,
      onEnd?: () => void
    ) => {
      setIsAISpeaking(true);  // Set speaking state before starting
      try {
        await speakCharacter(
          screenplay, 
          elevenLabsKey, 
          elevenLabsParam, 
          viewer, 
          () => {
            setIsPlayingAudio(true);
            console.log('audio playback started');
            onStart?.();
          }, 
          () => {
            setIsPlayingAudio(false);
            console.log('audio playback completed');
            onEnd?.();
          }
        );
      } catch (error) {
        console.error('Error during AI speech:', error);
      } finally {
        setIsAISpeaking(false);  // Ensure speaking state is reset even if there's an error
      }
    },
    [viewer]
  );

  /**
   * アシスタントとの会話を行う
   */
  const handleSendChat = useCallback(
    async (text: string) => {
      const newMessage = text;
      if (newMessage == null) return;

      setChatProcessing(true);
      
      // Get API keys with fallbacks to environment variables
      let localOpenRouterKey = openRouterKey;
      if (!localOpenRouterKey) {
        // fallback to free key for users to try things out
        localOpenRouterKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY!;
      }
      
      // Get ElevenLabs key with fallback to environment variable
      let localElevenLabsKey = elevenLabsKey;
      if (!localElevenLabsKey) {
        // fallback to shared key from environment variables
        localElevenLabsKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '';
      }
      
      // Enhanced image generation request detection
      const isImageRequest = /^(draw|generate|create|make|sketch|paint|show me|render|illustrate) (a|an|the)?\s?(picture|image|photo|drawing|illustration|artwork|visual|portrait|scene|concept art|rendering) (of|about|showing|depicting|with|featuring)?\s?/i.test(newMessage.toLowerCase());
      
      // Add user's message to chat log
      const messageLog: Message[] = [
        ...chatLog,
        { role: "user", content: newMessage },
      ];
      setChatLog(messageLog);

      if (isImageRequest) {
        // For image generation requests
        try {
          // Find an appropriate image generation model
          // First check if the current model supports image generation
          let imageModel = "stability/stable-diffusion-3"; // Default fallback
          
          // If we're already using an image-capable model, use it
          if (selectedModel.startsWith("stability/") || selectedModel.startsWith("openai/dall-e")) {
            imageModel = selectedModel;
          }
          
          // Clear any previous image
          setGeneratedImage(null);
          
          // Add a message indicating image generation is in progress
          const processingMessageLog: Message[] = [
            ...messageLog,
            { role: "assistant", content: "Generating image, please wait..." },
          ];
          setChatLog(processingMessageLog);
          
          console.log(`Generating image using model: ${imageModel}`);
          const imageUrl = await generateImage(newMessage, localOpenRouterKey, imageModel);
          
          if (imageUrl) {
            // The response might include just the URL or markdown with the URL
            // Extract the URL from the response if needed
            const extractedUrl = imageUrl.match(/https?:\/\/\S+\.(jpg|jpeg|png|webp|gif)/i)?.[0] || imageUrl;
            
            setGeneratedImage(extractedUrl);
            
            // Update the chat log with the image URL and make it clickable
            const imageResponseLog: Message[] = [
              ...messageLog,
              { 
                role: "assistant", 
                content: `Here's the image you requested:\n\n![Generated Image](${extractedUrl})\n\nYou can click on the image to view it in full size.` 
              },
            ];
            setChatLog(imageResponseLog);
            
            // Have the assistant speak about the image
            const assistantResponse = `I've created that image for you. You can see it on screen now.`;
            const aiTalks = textsToScreenplay([[hideActionPrompts ? '' : '[pleased]'] + assistantResponse], koeiroParam);
            handleSpeakAi(aiTalks[0], localElevenLabsKey, elevenLabsParam, () => {
              setAssistantMessage(assistantResponse);
            });
          } else {
            // Handle image generation failure
            const failureMessage = "I'm sorry, I couldn't generate that image. Please try again with a different description.";
            const failureLog: Message[] = [
              ...messageLog,
              { role: "assistant", content: failureMessage },
            ];
            setChatLog(failureLog);
            
            // Have the assistant speak the failure message
            const aiTalks = textsToScreenplay([[hideActionPrompts ? '' : '[apologetic]'] + failureMessage], koeiroParam);
            handleSpeakAi(aiTalks[0], localElevenLabsKey, elevenLabsParam, () => {
              setAssistantMessage(failureMessage);
            });
          }
          
          setChatProcessing(false);
          return;
        } catch (error) {
          console.error("Image generation failed:", error);
          const errorMessage = "There was an error generating the image. Please try again later.";
          const errorLog: Message[] = [
            ...messageLog,
            { role: "assistant", content: errorMessage },
          ];
          setChatLog(errorLog);
          
          // Have the assistant speak the error message
          const aiTalks = textsToScreenplay([[hideActionPrompts ? '' : '[apologetic]'] + errorMessage], koeiroParam);
          handleSpeakAi(aiTalks[0], localElevenLabsKey, elevenLabsParam, () => {
            setAssistantMessage(errorMessage);
          });
          
          setChatProcessing(false);
          return;
        }
      }

      // Regular text chat flow (non-image requests)
      // Process messages through MessageMiddleOut
      const messageProcessor = new MessageMiddleOut();
      const processedMessages = messageProcessor.process([
        {
          role: "system",
          content: systemPrompt,
        },
        ...messageLog,
      ]);

      const stream = await getChatResponseStream(
        processedMessages, 
        openAiKey, 
        localOpenRouterKey,
        selectedModel,
        hideActionPrompts
      ).catch(
        (e) => {
          console.error(e);
          return null;
        }
      );
      if (stream == null) {
        setChatProcessing(false);
        return;
      }

      const reader = stream.getReader();
      let receivedMessage = "";
      let aiTextLog = "";
      let tag = "";
      const sentences = new Array<string>();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          receivedMessage += value;

          // console.log('receivedMessage');
          // console.log(receivedMessage);

          // 返答内容のタグ部分の検出
          const tagMatch = receivedMessage.match(/^\[(.*?)\]/);
          if (tagMatch && tagMatch[0]) {
            tag = tagMatch[0];
            receivedMessage = receivedMessage.slice(tag.length);

            console.log('tag:');
            console.log(tag);
          }

          // 返答を一単位で切り出して処理する
          const sentenceMatch = receivedMessage.match(
            /^(.+[。．！？\n.!?]|.{10,}[、,])/
          );
          if (sentenceMatch && sentenceMatch[0]) {
            const sentence = sentenceMatch[0];
            sentences.push(sentence);

            console.log('sentence:');
            console.log(sentence);

            receivedMessage = receivedMessage
              .slice(sentence.length)
              .trimStart();

            // 発話不要/不可能な文字列だった場合はスキップ
            if (
              !sentence.replace(
                /^[\s\[\(\{「［（【『〈《〔｛«‹〘〚〛〙›»〕》〉』】）］」\}\)\]]+$/g,
                ""
              )
            ) {
              continue;
            }

            // Use the tag for AI voice synthesis but possibly hide it in display
            // Always use the tag for voice synthesis
            const aiTalks = textsToScreenplay([`${tag} ${sentence}`], koeiroParam);
            // Only add the tag to the displayed text if not hiding action prompts
            const displayText = hideActionPrompts ? sentence : `${tag} ${sentence}`;
            aiTextLog += displayText + " ";

            // 文ごとに音声を生成 & 再生、返答を表示
            const currentAssistantMessage = sentences.join(" ");
            handleSpeakAi(aiTalks[0], localElevenLabsKey, elevenLabsParam, () => {
              setAssistantMessage(hideActionPrompts ? 
                currentAssistantMessage.replace(/\[.*?\]\s*/g, '') : 
                currentAssistantMessage);
            });
          }
        }
      } catch (e) {
        setChatProcessing(false);
        console.error(e);
      } finally {
        reader.releaseLock();
      }

      // アシスタントの返答をログに追加
      const messageLogAssistant: Message[] = [
        ...messageLog,
        { role: "assistant", content: aiTextLog },
      ];

      setChatLog(messageLogAssistant);
      setChatProcessing(false);
    },
    [systemPrompt, chatLog, handleSpeakAi, openAiKey, elevenLabsKey, elevenLabsParam, openRouterKey, selectedModel, hideActionPrompts, koeiroParam]
  );

  const handleTokensUpdate = useCallback((tokens: any) => {
    setRestreamTokens(tokens);
  }, []);

  // Set up global websocket handler
  useEffect(() => {
    websocketService.setLLMCallback(async (message: string): Promise<LLMCallbackResult> => {
      try {
        if (isAISpeaking || isPlayingAudio || chatProcessing) {
          console.log('Skipping message processing - system busy');
          return {
            processed: false,
            error: 'System is busy processing previous message'
          };
        }
        
        await handleSendChat(message);
        return {
          processed: true
        };
      } catch (error) {
        console.error('Error processing message:', error);
        return {
          processed: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    });
  }, [handleSendChat, chatProcessing, isPlayingAudio, isAISpeaking]);

  const handleOpenRouterKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = event.target.value;
    setOpenRouterKey(newKey);
    localStorage.setItem('openRouterKey', newKey);
  };

  const handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = event.target.value;
    setSelectedModel(newModel);
    localStorage.setItem('selectedModel', newModel);
  };

  const handleHideActionPromptsChange = (checked: boolean) => {
    setHideActionPrompts(checked);
    localStorage.setItem('hideActionPrompts', checked.toString());
  };

  return (
    <div className={`${m_plus_2.variable} ${montserrat.variable}`}>
      <Meta />
      <Introduction
        openAiKey={openAiKey}
        onChangeAiKey={setOpenAiKey}
        elevenLabsKey={elevenLabsKey}
        onChangeElevenLabsKey={setElevenLabsKey}
      />
      <VrmViewer />
      {generatedImage && (
        <div className="absolute z-20 bottom-24 right-24 max-w-md">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <img 
              src={generatedImage} 
              alt="Generated" 
              className="w-full h-auto"
              onError={() => setGeneratedImage(null)}
            />
            <div className="p-2 flex justify-between">
              <button 
                className="text-sm text-blue-500 hover:text-blue-700"
                onClick={() => window.open(generatedImage, '_blank')}
              >
                Open
              </button>
              <button 
                className="text-sm text-red-500 hover:text-red-700"
                onClick={() => setGeneratedImage(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <MessageInputContainer
        isChatProcessing={chatProcessing}
        onChatProcessStart={handleSendChat}
      />
      <Menu
        openAiKey={openAiKey}
        elevenLabsKey={elevenLabsKey}
        openRouterKey={openRouterKey}
        systemPrompt={systemPrompt}
        chatLog={chatLog}
        elevenLabsParam={elevenLabsParam}
        koeiroParam={koeiroParam}
        assistantMessage={assistantMessage}
        selectedModel={selectedModel}
        hideActionPrompts={hideActionPrompts}
        onChangeAiKey={setOpenAiKey}
        onChangeElevenLabsKey={setElevenLabsKey}
        onChangeSystemPrompt={setSystemPrompt}
        onChangeChatLog={handleChangeChatLog}
        onChangeElevenLabsParam={setElevenLabsParam}
        onChangeKoeiromapParam={setKoeiroParam}
        handleClickResetChatLog={() => setChatLog([])}
        handleClickResetSystemPrompt={() => setSystemPrompt(SYSTEM_PROMPT)}
        backgroundImage={backgroundImage}
        onChangeBackgroundImage={setBackgroundImage}
        onTokensUpdate={handleTokensUpdate}
        onChatMessage={handleSendChat}
        onChangeOpenRouterKey={handleOpenRouterKeyChange}
        onChangeModel={handleModelChange}
        onChangeHideActionPrompts={handleHideActionPromptsChange}
      />
      {/* <GitHubLink /> */}
    </div>
  );
}
