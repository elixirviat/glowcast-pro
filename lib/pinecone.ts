import { Pinecone } from '@pinecone-database/pinecone';
import { PINECONE_TOP_K } from '@/config';
import { searchResultsToChunks, getSourcesFromChunks, getContextFromSources } from '@/lib/sources';
import { PINECONE_INDEX_NAME } from '@/config';
import { openai } from './openai';

if (!process.env.PINECONE_API_KEY) {
    throw new Error('PINECONE_API_KEY is not set');
}

export const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});

export const pineconeIndex = pinecone.Index(PINECONE_INDEX_NAME);

export async function searchPinecone(
  query: string,
): Promise<string> {
  try {
    const index = pinecone.Index(PINECONE_INDEX_NAME); // FIXED THIS LINE
    
    // Generate embedding for the query
    const queryEmbedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    // Search Pinecone
    const searchResults = await index.query({
      vector: queryEmbedding.data[0].embedding,
      topK: 5,
      includeMetadata: true,
      namespace: "default"
    });

    // Format results with IMAGE SUPPORT
    const matches = searchResults.matches || [];
    const context = matches.map(match => {
      const metadata = match.metadata as any;
      const text = metadata.text;
      const imageUrl = metadata.imageUrl;
      
      // If this is a visual guide, format it specially
      if (imageUrl && metadata.type === "guide") {
        return `[VISUAL GUIDE FOUND]: ${text}\n(Display image: ![Visual Guide](${imageUrl}))`;
      }
      
      // Regular text content (unchanged)
      return text;
    }).join('\n\n');

    return context;
  } catch (error) {
    console.error('Pinecone search error:', error);
    return 'No relevant information found.';
  }
}
