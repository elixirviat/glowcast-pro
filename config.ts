import { openai } from "@ai-sdk/openai";

// We use the smaller model for speed, or 'gpt-4o' if you have credits
export const MODEL = openai('gpt-4o-mini');

export const AI_NAME = "GlowCast Pro";
export const OWNER_NAME = "GlowCast Team";

export const WELCOME_MESSAGE = `✨ Welcome to GlowCast Pro! 
I am your travel skincare agent. 
Tell me:
1. Where are you traveling? (e.g., Mumbai, Aspen)
2. What products do you have? (e.g., Retinol, Matte Foundation)
I will analyze the weather and check your routine for safety.`;

export const CLEAR_CHAT_TEXT = "New Trip";

// --- REQUIRED SYSTEM SETTINGS (DO NOT DELETE) ---
export const PINECONE_INDEX_NAME = "my-ai"; // Ensure this matches your Pinecone Index Name
export const PINECONE_TOP_K = 5;            // How many results to retrieve (3-5 is standard)
