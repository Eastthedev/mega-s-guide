export const DEFAULT_API_KEY = "AIzaSyCjPd-vm_Rw9lCLi3SSGIKr6y5Jw_vdpAY";

export function getStoredApiKey(): string {
  if (typeof window !== "undefined") {
    const key = localStorage.getItem("megas_guide_api_key");
    return key && key.trim() !== "" ? key : DEFAULT_API_KEY;
  }
  return DEFAULT_API_KEY;
}

export function setStoredApiKey(key: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("megas_guide_api_key", key);
  }
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export interface AttachedFile {
  mimeType: string;
  data: string; // Base64 data
  name: string;
}



async function callGemini(
  prompt: string,
  options: {
    temperature?: number;
    jsonMode?: boolean;
    systemInstruction?: string;
    file?: AttachedFile;
  } = {}
): Promise<string> {
  const apiKey = getStoredApiKey();

  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      apiKey,
      temperature: options.temperature ?? 0.3,
      jsonMode: options.jsonMode ?? false,
      systemInstruction: options.systemInstruction,
      file: options.file,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `API error ${response.status}`);
  }

  const data = await response.json();
  if (!data.text) {
    throw new Error('No response generated from Gemini. Please try again.');
  }
  return data.text;
}


// FEATURE 1: AI Chat Grounded in notes
export async function generateChatResponse(
  notesContext: string,
  history: ChatMessage[],
  newQuestion: string,
  file?: AttachedFile
): Promise<string> {
  const systemInstruction = 
    "You are a warm, encouraging medical study assistant. Answer ONLY from the study material provided. " +
    "If the answer isn't in the material, say so kindly. Cite which part of the notes your answer comes from. " +
    "Keep a supportive, friendly tone. Direct your answers specifically to 'Baby', addressing her with love, care, and encouragement (e.g. 'You've got this, future doctor!', 'Baby, based on your notes...'). " +
    "If the user uploaded an image or PDF, analyze it strictly relative to the study notes or explain its concepts grounding it in their study materials. " +
    "Remember: You are the AI study companion, NOT Mega himself. You were built by Mega for Baby. Do not sign off as Mega or pretend to be Mega.";

  // Build grounded context prompt
  let contextPrompt = `STUDY MATERIAL/NOTES CONTEXT:\n${notesContext || "No study material provided yet. Tell Baby kindly to paste her study material at the top so you can help her study."}\n\n`;
  
  if (history.length > 0) {
    contextPrompt += `CONVERSATION HISTORY:\n`;
    history.forEach(msg => {
      contextPrompt += `${msg.role === "user" ? "Baby" : "Assistant"}: ${msg.text}\n`;
    });
    contextPrompt += `\n`;
  }

  contextPrompt += `NEW QUESTION: ${newQuestion}\n\n`;
  contextPrompt += `Provide a warm, supportive, accurate response grounded strictly in the study notes. Make sure to refer to Baby and encourage her!`;

  return callGemini(contextPrompt, {
    temperature: 0.6,
    systemInstruction,
    file
  });
}

// NEW FEATURE: Research Chat Ungrounded
export async function generateResearchResponse(
  history: ChatMessage[],
  newQuestion: string,
  file?: AttachedFile
): Promise<string> {
  const systemInstruction = 
    "You are a warm, supportive, and brilliant medical research assistant. Answer Baby's questions with the latest medical knowledge, structured clearly for a 400-level medical student. " +
    "Cite medical terms where necessary and use clear bullet points or bold summaries. Keep an encouraging, loving tone, and address her as Baby or future doctor. " +
    "Note: You are answering general queries, so you do not need to ground your answers in any study notes unless she references them. " +
    "If she uploaded an image or PDF, analyze and explain it thoroughly using general medical science. " +
    "Remember: You are the AI study companion, NOT Mega himself. You were built by Mega for Baby. Do not sign off as Mega or pretend to be Mega.";

  let contextPrompt = "";
  if (history.length > 0) {
    contextPrompt += `CONVERSATION HISTORY:\n`;
    history.forEach(msg => {
      contextPrompt += `${msg.role === "user" ? "Baby" : "Assistant"}: ${msg.text}\n`;
    });
    contextPrompt += `\n`;
  }

  contextPrompt += `QUESTION: ${newQuestion}\n\n`;
  contextPrompt += `Provide a warm, supportive, and highly detailed medical response. Encourage Baby!`;

  return callGemini(contextPrompt, {
    temperature: 0.6,
    systemInstruction,
    file
  });
}

// FEATURE 2: Note Summary
export async function generateSummary(
  notes: string,
  style: "concise" | "detailed" | "guide" | "facts"
): Promise<string> {
  let styleInstruction = "";
  switch (style) {
    case "concise":
      styleInstruction = "a concise bullet point summary highlighting key terms and high-yield details.";
      break;
    case "detailed":
      styleInstruction = "a detailed full paragraph summary with clear headings, organized logically.";
      break;
    case "guide":
      styleInstruction = "a study guide structure organized by topic, listing key review items, clinical pearls, and reminders for each topic.";
      break;
    case "facts":
      styleInstruction = "a numbered list of high-yield must-know key facts for exams, emphasizing clinical relevance.";
      break;
  }

  const prompt = `Please summarize the following medical notes for Baby.
Provide ${styleInstruction}
Be warm, encouraging, and highly structured in your output. Include a brief loving motivational sign-off at the end of the summary addressed to Baby (e.g. 'You've got this, future doctor! 🩺❤️', 'I'm so proud of you, Baby!'). Do not sign off as Mega.

Medical Notes:
${notes}`;

  return callGemini(prompt, {
    temperature: 0.3
  });
}

// FEATURE 3: Detailed Explanation
export async function generateExplanation(
  input: string,
  mode: "topic" | "passage",
  depth: "simple" | "standard" | "deep"
): Promise<string> {
  const depthText = 
    depth === "simple" ? "simple plain language (like explaining to a first-year student, using clear analogies)" :
    depth === "standard" ? "standard clinical details appropriate for a 400-level exam" :
    "a deep dive, detailing pathophysiological mechanisms, molecular pathways if applicable, clinical diagnostic workups, and pharmacological interventions";

  const prompt = `Please explain the following ${mode === "topic" ? "medical topic" : "confusing medical passage"} for Baby.
Target Depth: ${depthText}.

Please structure the output as follows:
1. **Plain Language Breakdown** - A clear, friendly explanation.
2. **Clinical Relevance / Why it matters for exams** - Clear reasons why this is tested and how it presents in patients.
3. **Memorable Analogy** - An analogy to make it stick forever.
4. Bold key medical terms.

Input content to explain:
${input}`;

  const systemInstruction = "You are a warm, loving medical tutor. Explain things clearly, making Baby feel capable and smart. End with this exact footer (and nothing else after it): 'See? You understood that. You're going to ace this. 💙'";

  return callGemini(prompt, {
    temperature: 0.6,
    systemInstruction
  });
}

// FEATURE 4: Flashcards
export interface Flashcard {
  front: string;
  back: string;
}

export async function generateFlashcards(
  notes: string,
  count: number,
  focusArea?: string
): Promise<Flashcard[]> {
  const prompt = `Create exactly ${count} high-yield medical flashcards from the study material below.
${focusArea ? `Focus particularly on this area: ${focusArea}.` : ""}
Output ONLY a JSON array containing objects with "front" and "back" string properties. 
"front" should be a question, a clinical presentation, or a term (keep it active and challenging).
"back" should be the concise answer, definition, diagnostic step, or pharmacological drug.

Example format:
[
  {
    "front": "What is the first-line treatment for a patient presenting with acute anaphylaxis?",
    "back": "Intramuscular Epinephrine (1:1000) administered in the anterolateral thigh."
  }
]

Study Material:
${notes}`;

  const responseText = await callGemini(prompt, {
    temperature: 0.3,
    jsonMode: true
  });

  try {
    const flashcards: Flashcard[] = JSON.parse(responseText);
    return flashcards;
  } catch (err) {
    console.error("Failed to parse flashcards JSON", responseText, err);
    throw new Error("Could not parse flashcards. Please try again.");
  }
}

// FEATURE 5: Quiz Mode
export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export async function generateQuiz(
  notes: string,
  count: number,
  type: "mcq" | "tf" | "mixed",
  difficulty: "easy" | "medium" | "hard" | "mixed"
): Promise<QuizQuestion[]> {
  const typeInstruction = 
    type === "mcq" ? "multiple-choice questions only (exactly 4 options)" :
    type === "tf" ? "true/false questions only (exactly 2 options: True and False)" :
    "a mix of multiple-choice questions (4 options) and true/false questions (2 options)";

  const prompt = `Create exactly ${count} medical exam questions based on the study material below.
Difficulty Level: ${difficulty}.
Question Type: ${typeInstruction}.

Output ONLY a JSON object containing a "questions" array. Each question must have:
1. "question": The question text or clinical vignette.
2. "options": An array of string options.
3. "correctIndex": The 0-based index of the correct option in the options array.
4. "explanation": A brief 1-2 sentence explanation of why the answer is correct and others are incorrect.

Example format:
{
  "questions": [
    {
      "question": "A 45-year-old male presents with sudden-onset severe joint pain in his first metatarsophalangeal joint. Negatively birefringent needle-shaped crystals are seen under polarized light. What is the first-line acute treatment?",
      "options": [
        "Allopurinol",
        "Indomethacin (NSAIDs) or Colchicine",
        "Probenecid",
        "Febuxostat"
      ],
      "correctIndex": 1,
      "explanation": "Acute gout flares are managed with anti-inflammatory agents like NSAIDs or colchicine. Allopurinol is a xanthine oxidase inhibitor used for chronic management, not acute flares."
    }
  ]
}

Study Material:
${notes}`;

  const responseText = await callGemini(prompt, {
    temperature: 0.3,
    jsonMode: true
  });

  try {
    const data = JSON.parse(responseText);
    return data.questions || [];
  } catch (err) {
    console.error("Failed to parse quiz JSON", responseText, err);
    throw new Error("Could not parse quiz questions. Please try again.");
  }
}
