// Model options for LLM selection
export const MODELS = [
  // Groq Models (Free tier - very fast) - Default
  { value: 'groq/llama-3.1-8b-instant', label: 'Llama 3.1 8B (Groq) - Free' },
  { value: 'groq/gemma-7b-it', label: 'Gemma 7B (Groq) - Free' },
  { value: 'groq/openai/gpt-oss-20b', label: 'GPT-OSS 20B (Groq) - Free' },
  { value: 'groq/qwen/qwen3-32b', label: 'Qwen 3 32B (Groq) - Free' },
  { value: "groq/llama-3.3-70b-versatile" , label: "Llama 3.3 70B Versatile (Groq) - Free" },
  { value: "groq/meta-llama/llama-4-scout-17b-16e-instruct" , label: "Llama 4 Scout 17B (Groq) - Free" },
  { value: "groq/moonshotai/kimi-k2-instruct-0905" , label: "Kimi K2 Instruct (Groq) - Free" },
  // Commercial Models
  { value: 'gemini/gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
  { value: 'gemini/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
];
