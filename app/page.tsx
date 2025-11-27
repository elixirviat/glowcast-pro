"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { useChat } from "@ai-sdk/react";
import { ArrowUp, Loader2, Plus, Square } from "lucide-react";
import { MessageWall } from "@/components/messages/message-wall";
import { ChatHeader, ChatHeaderBlock } from "@/app/parts/chat-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UIMessage } from "ai";
import { useEffect, useState, useRef } from "react";
import { AI_NAME, CLEAR_CHAT_TEXT, WELCOME_MESSAGE } from "../config";
import Image from "next/image";
import Link from "next/link";

// --- 1. CONFIGURATION DATA ---

const LOCATION_SUGGESTIONS = [
  { label: "Bali 🌴", text: "I am going to Bali, Indonesia" },
  { label: "Paris 🥐", text: "I am going to Paris, France" },
  { label: "Aspen ❄️", text: "I am going to Aspen, USA" },
  { label: "Tokyo 🍣", text: "I am going to Tokyo, Japan" },
  { label: "New York 🍎", text: "I am going to New York, USA" },
];

const CATEGORY_CHIPS = [
  { label: "Skincare 🧴", text: "Skincare" },
  { label: "Makeup 💄", text: "Makeup" },
  { label: "Both ✨", text: "Both" },
];

const SKINCARE_CHIPS = [
  "Cleanser", "Toner", "Vitamin C", "Retinol", "Heavy Cream", 
  "Gel Moisturizer", "Face Oil", "SPF 50+", "Acne Treatment", "Eye Cream"
];

const MAKEUP_CHIPS = [
  "Primer", "Matte Foundation", "Dewy Foundation", "Concealer", 
  "Setting Powder", "Cream Blush", "Powder Blush", "Mascara", "Setting Spray"
];

const ALL_CHIPS = Array.from(new Set([...SKINCARE_CHIPS, ...MAKEUP_CHIPS]));

const formSchema = z.object({
  message: z.string().min(1, "Message cannot be empty.").max(2000, "Message must be at most 2000 characters."),
});

const STORAGE_KEY = 'chat-messages';

// --- HELPER: Get clean text ---
const getMessageText = (message: UIMessage): string => {
  if (!message) return "";
  
  // FIX: Cast to 'any' to avoid TypeScript error if strict 'content' property is missing on type
  const content = (message as any).content;
  if (typeof content === 'string') return content.toLowerCase();
  
  if (message.parts && Array.isArray(message.parts)) {
    return message.parts
      .filter(p => p.type === 'text')
      .map(p => p.text)
      .join(' ')
      .toLowerCase();
  }
  return "";
};

const loadMessagesFromStorage = (): { messages: UIMessage[]; durations: Record<string, number> } => {
  if (typeof window === 'undefined') return { messages: [], durations: {} };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { messages: [], durations: {} };
    const parsed = JSON.parse(stored);
    return { messages: parsed.messages || [], durations: parsed.durations || {} };
  } catch (error) {
    return { messages: [], durations: {} };
  }
};

const saveMessagesToStorage = (messages: UIMessage[], durations: Record<string, number>) => {
  if (typeof window === 'undefined') return;
  try {
    const data = { messages, durations };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {}
};

export default function Chat() {
  const [isClient, setIsClient] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const welcomeMessageShownRef = useRef<boolean>(false);
  
  const { messages, sendMessage, status, stop, setMessages } = useChat({
    messages: [],
  });

  const getWelcomeMessage = (): UIMessage => ({
    id: `welcome-${Date.now()}`,
    role: "assistant",
    parts: [{ type: "text", text: WELCOME_MESSAGE }],
  });

  // 2. INITIAL LOAD
  useEffect(() => {
    setIsClient(true);
    const stored = loadMessagesFromStorage();

    if (stored.messages.length > 0) {
      setMessages(stored.messages as any);
      setDurations(stored.durations);
    } else {
      const welcomeMsg = getWelcomeMessage();
      setMessages([welcomeMsg] as any);
      saveMessagesToStorage([welcomeMsg], {});
    }
  }, []);

  // 3. PERSISTENCE
  useEffect(() => {
    if (isClient) {
      saveMessagesToStorage(messages, durations);
    }
  }, [durations, messages, isClient]);

  const handleDurationChange = (key: string, duration: number) => {
    setDurations((prev) => ({ ...prev, [key]: duration }));
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "" },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    sendMessage({ text: data.message });
    form.reset();
  }

  function handleSuggestionClick(text: string) {
    sendMessage({ text });
  }

  function handleInventoryClick(item: string) {
    const current = form.getValues("message");
    const separator = current.length > 0 ? ", " : "";
    form.setValue("message", current + separator + item);
  }

  function clearChat() {
    const welcomeMsg = getWelcomeMessage();
    setMessages([welcomeMsg] as any);
    setDurations({});
    saveMessagesToStorage([welcomeMsg], {});
    welcomeMessageShownRef.current = false;
    toast.success("Chat cleared");
  }

  // --- LOGIC ENGINE (IMPROVED) ---
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const userLastMessage = messages.length > 1 ? messages[messages.length - 2] : null;
  const userText = userLastMessage && userLastMessage.role === "user" ? getMessageText(userLastMessage) : "";
  const aiText = lastMessage && lastMessage.role === "assistant" ? getMessageText(lastMessage) : "";

  const showLocations = messages.length === 1 && messages[0].role === "assistant";

  // 1. Detect Category Selection Question
  const isCategoryQuestion = aiText.includes("skincare") && aiText.includes("makeup") && aiText.includes("both");

  // 2. Detect Clarifying/Interview Questions (NEW)
  // Ensures chips DON'T show up when AI asks about skin type/activities/finish
  const isClarifyingQuestion = 
    aiText.includes("skin type") || 
    aiText.includes("oily") || 
    aiText.includes("activities") || 
    aiText.includes("finish") || 
    aiText.includes("agenda") ||
    aiText.includes("matte");
  
  // 3. Detect Inventory Question (FIXED)
  // Removed "list" to prevent false positives when AI says "Great list!"
  const isInventoryQuestion = 
    !isClarifyingQuestion && (
      aiText.includes("product") || 
      aiText.includes("packing") || 
      aiText.includes("stash") || 
      aiText.includes("bring")
    );
    
  const isFinalReport = aiText.includes("forecast") || aiText.includes("strategy");

  let activeChips: string[] = [];
  let showCategoryButtons = false;

  if (!showLocations && !isFinalReport) {
      if (isCategoryQuestion) {
          showCategoryButtons = true;
      } 
      else if (isInventoryQuestion) {
          if (userText.includes("skincare") && !userText.includes("makeup") && !userText.includes("both")) {
              activeChips = SKINCARE_CHIPS;
          } else if (userText.includes("makeup") && !userText.includes("skincare") && !userText.includes("both")) {
              activeChips = MAKEUP_CHIPS;
          } else {
              activeChips = ALL_CHIPS;
          }
      }
  }

  return (
    <div className="flex h-screen items-center justify-center font-sans dark:bg-black">
      <main className="w-full dark:bg-black h-screen relative">
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-linear-to-b from-background via-background/50 to-transparent dark:bg-black overflow-visible pb-4">
          <div className="relative overflow-visible">
            <ChatHeader>
              <ChatHeaderBlock />
              <ChatHeaderBlock className="justify-center items-center">
                <Avatar className="size-8 ring-1 ring-primary">
                  <AvatarImage src="https://i.ibb.co/ccdTwRh4/GlowCast.png" />
                  <AvatarFallback>GC</AvatarFallback>
                </Avatar>
                <p className="tracking-tight">Chat with {AI_NAME}</p>
              </ChatHeaderBlock>
              <ChatHeaderBlock className="justify-end">
                <Button variant="outline" size="sm" className="cursor-pointer" onClick={clearChat}>
                  <Plus className="size-4" />
                  {CLEAR_CHAT_TEXT}
                </Button>
              </ChatHeaderBlock>
            </ChatHeader>
          </div>
        </div>

        {/* Chat Area */}
        <div className="h-screen overflow-y-auto px-5 py-4 w-full pt-[88px] pb-64">
          <div className="flex flex-col items-center justify-end min-h-full">
            {isClient ? (
              <>
                <MessageWall messages={messages} status={status} durations={durations} onDurationChange={handleDurationChange} />
                {status === "submitted" && (
                  <div className="flex justify-start max-w-3xl w-full mt-4">
                    <div className="flex gap-3">
                        <Avatar className="size-8 ring-1 ring-primary">
                            <AvatarImage src="https://i.ibb.co/ccdTwRh4/GlowCast.png" />
                        </Avatar>
                        <div className="flex items-center">
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-center max-w-2xl w-full">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* Footer Input Area */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-linear-to-t from-background via-background/50 to-transparent dark:bg-black overflow-visible pt-4 pb-6">
          <div className="w-full px-5 items-center flex flex-col justify-center relative overflow-visible">
            <div className="message-fade-overlay" />
            
            <div className="max-w-3xl w-full space-y-3 bg-background/80 backdrop-blur-md p-4 rounded-xl border border-border shadow-lg">
              
              {/* 1. LOCATION CHIPS (PILLS) */}
              {showLocations && (
                <div className="flex gap-2 overflow-x-auto pb-2 w-full no-scrollbar justify-start sm:justify-center">
                  {LOCATION_SUGGESTIONS.map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="rounded-full bg-background hover:bg-primary/20 border-primary/30 text-xs sm:text-sm whitespace-nowrap px-4 h-9"
                      onClick={() => handleSuggestionClick(action.text)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}

              {/* 2. CATEGORY BUTTONS (PILLS) */}
              {showCategoryButtons && (
                <div className="flex gap-2 justify-center w-full pb-2">
                  {CATEGORY_CHIPS.map((cat, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="rounded-full bg-background hover:bg-primary/20 border-primary/30 text-xs sm:text-sm whitespace-nowrap px-4 h-9"
                      onClick={() => handleSuggestionClick(cat.text)}
                    >
                      {cat.label}
                    </Button>
                  ))}
                </div>
              )}

              {/* 3. INVENTORY CHIPS */}
              {activeChips.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-start sm:justify-center max-h-[100px] overflow-y-auto">
                  {activeChips.map((item, index) => (
                    <Button
                      key={index}
                      variant="secondary"
                      size="sm"
                      className="rounded-full text-xs bg-primary/10 hover:bg-primary/30 border border-primary/20"
                      onClick={() => handleInventoryClick(item)}
                    >
                      + {item}
                    </Button>
                  ))}
                </div>
              )}

              <form id="chat-form" onSubmit={form.handleSubmit(onSubmit)}>
                <FieldGroup>
                  <Controller
                    name="message"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="chat-form-message" className="sr-only">Message</FieldLabel>
                        <div className="relative">
                          <textarea
                            {...field}
                            id="chat-form-message"
                            className="w-full min-h-[50px] max-h-[200px] p-3 pr-14 rounded-[15px] bg-muted border border-input focus:outline-none focus:ring-2 focus:ring-ring resize-none text-sm"
                            placeholder={activeChips.length > 0 ? "Tap items above or type..." : "Type your message..."}
                            disabled={status === "streaming"}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                form.handleSubmit(onSubmit)();
                              }
                            }}
                          />
                          <Button
                            className="absolute right-2 bottom-2 rounded-full w-8 h-8"
                            type="submit"
                            disabled={!field.value.trim() || status === "streaming"}
                            size="icon"
                          >
                            {status === "streaming" ? <Square className="size-3" onClick={stop}/> : <ArrowUp className="size-4" />}
                          </Button>
                        </div>
                      </Field>
                    )}
                  />
                </FieldGroup>
              </form>
              
              <div className="w-full flex justify-center text-[10px] text-muted-foreground text-center">
                GlowCast Pro can make mistakes, so please double-check it.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div >
  );
}
