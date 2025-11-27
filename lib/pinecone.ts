import { Pinecone } from '@pinecone-database/pinecone';
import { PINECONE_TOP_K } from '@/config';
import { searchResultsToChunks, getSourcesFromChunks, getContextFromSources } from '@/lib/sources';
import { PINECONE_INDEX_NAME } from '@/config';

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
    const index = pinecone.Index(PINECONE_INDEX_NAME);
    
    // Search Pinecone (without embedding generation for now)
    const searchResults = await index.query({
      topK: 5,
      includeMetadata: true
      // REMOVED namespace line - that's causing the error!
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
      
      return text;
    }).join('\n\n');

    return context;
  } catch (error) {
    console.error('Pinecone search error:', error);
    return 'No relevant information found.';
  }
}

