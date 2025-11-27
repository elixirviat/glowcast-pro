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
import { useEffect, useState } from "react";
import { AI_NAME, CLEAR_CHAT_TEXT, WELCOME_MESSAGE } from "@/config";

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
  
  // --- THE FINAL FIX ---
  // We use 'messages' (so Error 2 is gone).
  // We use 'as any' (so Error 1 'never[]' is gone).
  const { messages, sendMessage, status, stop, setMessages } = useChat({
    messages: [] as any, 
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
      setMessages(stored.messages);
      setDurations(stored.durations);
    } else {
      const welcomeMsg = getWelcomeMessage();
      setMessages([welcomeMsg]);
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
    setMessages([welcomeMsg]);
    setDurations({});
    saveMessagesToStorage([welcomeMsg], {});
    toast.success("Chat cleared");
  }

  // --- LOGIC ENGINE ---
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const userLastMessage = messages.length > 1 ? messages[messages.length - 2] : null;
  const userText = userLastMessage && userLastMessage.role === "user" ? getMessageText(userLastMessage) : "";
  const aiText = lastMessage && lastMessage.role === "assistant" ? getMessageText(lastMessage) : "";

  // Logic: Show locations only if just welcome message
  const showLocations = messages.length === 1 && messages[0].role === "assistant";

  // Logic: Detect questions
  const isCategoryQuestion = aiText.includes("skincare") && aiText.includes("makeup") && aiText.includes("both");
  const isInventoryQuestion = 
    aiText.includes("product") || 
    aiText.includes("packing") || 
    aiText.includes("list") || 
    aiText.includes("stash") || 
    aiText.includes("bring");
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

  // --- UI RETURN ---
  return (
    <div className="flex h-screen items-center justify-center font-sans dark:bg-black">
      <main className="w-full dark:bg-black h-screen relative">
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-background via-background/50 to-transparent dark:bg-black overflow-visible pb-4">
          <div className="relative overflow-visible">
            <ChatHeader>
              <ChatHeaderBlock />
              <ChatHeaderBlock className="justify-center items-center">
                <Avatar className="size-8 ring-1 ring-primary">
                  <AvatarImage src="https://i.ibb.co/ccdTwRh4/GlowCast.png" />
                  <Avatar
