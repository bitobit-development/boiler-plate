import OpenAI from 'openai';

// Lazy initialization of OpenAI client
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

/**
 * OpenAI Service
 * Provides easy-to-use functions for interacting with OpenAI's API
 */

/**
 * Generate a chat completion using GPT models
 * @param messages - Array of chat messages
 * @param model - Model to use (default: gpt-4o-mini for cost efficiency)
 * @param options - Additional options (temperature, max_tokens, etc.)
 * @returns The generated response
 */
export async function chatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  model: string = 'gpt-4o-mini',
  options?: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
  }
) {
  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model,
      messages,
      ...options,
    });

    return completion.choices[0].message;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
}

/**
 * Generate a streaming chat completion
 * @param messages - Array of chat messages
 * @param model - Model to use (default: gpt-4o-mini)
 * @param options - Additional options
 * @returns A stream of completion chunks
 */
export async function chatCompletionStream(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  model: string = 'gpt-4o-mini',
  options?: {
    temperature?: number;
    max_tokens?: number;
  }
) {
  try {
    const client = getOpenAIClient();
    const stream = await client.chat.completions.create({
      model,
      messages,
      stream: true,
      ...options,
    });

    return stream;
  } catch (error) {
    console.error('OpenAI Streaming API Error:', error);
    throw error;
  }
}

/**
 * Generate embeddings for text
 * @param input - Text or array of texts to embed
 * @param model - Embedding model to use (default: text-embedding-3-small)
 * @returns Array of embedding vectors
 */
export async function createEmbeddings(
  input: string | string[],
  model: string = 'text-embedding-3-small'
) {
  try {
    const client = getOpenAIClient();
    const response = await client.embeddings.create({
      model,
      input,
    });

    return response.data;
  } catch (error) {
    console.error('OpenAI Embeddings API Error:', error);
    throw error;
  }
}

/**
 * Generate an image using DALL-E
 * @param prompt - Description of the image to generate
 * @param options - Additional options (size, quality, etc.)
 * @returns Generated image URL
 */
export async function generateImage(
  prompt: string,
  options?: {
    model?: 'dall-e-2' | 'dall-e-3';
    size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
    quality?: 'standard' | 'hd';
    n?: number;
  }
) {
  try {
    const client = getOpenAIClient();
    const response = await client.images.generate({
      prompt,
      model: options?.model || 'dall-e-3',
      size: options?.size || '1024x1024',
      quality: options?.quality || 'standard',
      n: options?.n || 1,
    });

    return response.data;
  } catch (error) {
    console.error('OpenAI Image Generation Error:', error);
    throw error;
  }
}

/**
 * Moderate content using OpenAI's moderation endpoint
 * @param input - Text to moderate
 * @returns Moderation results
 */
export async function moderateContent(input: string) {
  try {
    const client = getOpenAIClient();
    const moderation = await client.moderations.create({
      input,
    });

    return moderation.results[0];
  } catch (error) {
    console.error('OpenAI Moderation API Error:', error);
    throw error;
  }
}

// Note: The OpenAI client is now lazily initialized internally
// Use the provided functions instead of accessing the client directly
