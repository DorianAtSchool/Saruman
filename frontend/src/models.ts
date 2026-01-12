// Model options for LLM selection
export const MODELS = [
  // Groq Models (Free tier - very fast) - Default
  { value: 'groq/llama-3.1-8b-instant', label: 'Llama 3.1 8B (Groq) - Free' },
  { value: 'groq/gemma2-9b-it', label: 'Gemma 2 9B (Groq) - Free' },
  { value: 'groq/mixtral-8x7b-32768', label: 'Mixtral 8x7B (Groq) - Free' },
  // Commercial Models
  { value: 'gemini/gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
  { value: 'gemini/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  // Open Source via HuggingFace
  { value: 'huggingface/together/meta-llama/Llama-3.2-3B-Instruct', label: 'Llama 3.2 3B (Together)' },
  { value: 'huggingface/together/deepseek-ai/DeepSeek-R1', label: 'DeepSeek R1 (Together)' },
  { value: 'huggingface/sambanova/Qwen/Qwen2.5-72B-Instruct', label: 'Qwen 2.5 72B (Sambanova)' },
];
