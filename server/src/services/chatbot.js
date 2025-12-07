const { HfInference } = require('@huggingface/inference');
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { HuggingFaceInferenceEmbeddings } = require('@langchain/community/embeddings/hf');

const inference = new HfInference(process.env.HF_API_KEY);

async function loadPdfTexts(pdfDir) {
  const files = fs.readdirSync(pdfDir).filter((f) => f.toLowerCase().endsWith('.pdf'));
  const texts = [];
  for (const file of files) {
    const data = fs.readFileSync(path.join(pdfDir, file));
    const parsed = await pdf(data);
    texts.push(parsed.text);
  }
  return texts.join('\n');
}

let cachedRetriever = null;
let cachedDocs = [];
let cachedEmbeddings = null;

async function getRetriever() {
  if (cachedRetriever) return cachedRetriever;
  const knowledgePath = process.env.KNOWLEDGE_DIR || path.join(__dirname, '../../knowledge');
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 150 });
  let docs = [];
  if (fs.existsSync(knowledgePath)) {
    const corpus = await loadPdfTexts(knowledgePath);
    const chunks = await splitter.splitText(corpus);
    docs = chunks.map((text, i) => ({ pageContent: text, metadata: { id: i } }));
  }
  const embeddings = new HuggingFaceInferenceEmbeddings({ apiKey: process.env.HF_API_KEY, model: process.env.HF_EMBEDDINGS || 'sentence-transformers/all-MiniLM-L6-v2' });
  cachedDocs = docs;
  cachedEmbeddings = embeddings;
  // Precompute embeddings for docs
  const docVectors = cachedDocs.length ? await cachedEmbeddings.embedDocuments(cachedDocs.map(d => d.pageContent)) : [];
  // Simple retriever: cosine similarity over in-memory vectors
  cachedRetriever = {
    async getRelevantDocuments(query) {
      if (!cachedDocs.length) return [];
      const qVec = await cachedEmbeddings.embedQuery(query);
      function cosine(a, b) {
        let dot = 0, na = 0, nb = 0;
        for (let i = 0; i < a.length; i++) {
          dot += a[i] * b[i];
          na += a[i] * a[i];
          nb += b[i] * b[i];
        }
        return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-10);
      }
      const scored = docVectors.map((vec, idx) => ({ idx, score: cosine(qVec, vec) }));
      scored.sort((a, b) => b.score - a.score);
      const topK = scored.slice(0, 5).map(s => cachedDocs[s.idx]);
      return topK;
    }
  };
  return cachedRetriever;
}

function safetyAdvice(userText) {
  const unsafeTerms = ['cancer', 'stroke', 'heart attack', 'suicide', 'overdose', 'seizure'];
  const lower = userText.toLowerCase();
  const flagged = unsafeTerms.some((t) => lower.includes(t));
  return flagged
    ? '\n\nSafety note: Your query may involve serious conditions. This app cannot provide medical diagnosis. Please consult a qualified healthcare professional or visit emergency services if you are in immediate danger.'
    : '';
}

async function askChatbot(userMessage) {
  try {
    if (!process.env.HF_API_KEY) {
      return 'The chatbot is not configured: missing HF_API_KEY in server/.env.';
    }

    const retriever = await getRetriever();
    const relevantDocs = retriever ? await retriever.getRelevantDocuments(userMessage) : [];
    const context = relevantDocs.map((d, idx) => `Chunk ${idx + 1}:\n${d.pageContent}`).join('\n\n');

    const promptTmpl = ChatPromptTemplate.fromMessages([
      ['system', 'You are a helpful pharmacy assistant. Use the provided context to answer questions about medicines, usage, side effects, and general symptom relief. Do NOT provide diagnosis. If severe/chronic conditions are suspected, recommend seeking professional medical help. If unsure, say so. Answer in concise, well-structured Markdown with headings and bullet points. If context is empty, still answer safely from general knowledge.'],
      ['system', 'Context (optional):\n{context}'],
      ['human', '{question}']
    ]);

    const guardedUser = `${userMessage}${safetyAdvice(userMessage)}`;
    const formatted = await promptTmpl.format({ context, question: guardedUser });

    // Use a broadly available default; can be overridden via HF_LLM
    const model = process.env.HF_LLM || 'HuggingFaceH4/zephyr-7b-beta';

    // Prefer chatCompletion to satisfy providers that expose models as "conversational" only
    try {
      const chatRes = await inference.chatCompletion({
        model,
        messages: [
          { role: 'system', content: 'You are a helpful pharmacy assistant. Use the provided context to answer questions about medicines, usage, side effects, and general symptom relief. Do NOT provide diagnosis. If severe/chronic conditions are suspected, recommend seeking professional medical help. If unsure, say so.' },
          { role: 'system', content: `Context:\n${context}` },
          { role: 'user', content: guardedUser }
        ],
        max_tokens: 250,
        temperature: 0.3
      });
      const choice = chatRes?.choices?.[0]?.message?.content;
      const msg = Array.isArray(choice) ? choice.map((c) => (typeof c === 'string' ? c : c.text || '')).join('\n') : (choice || '');
      const cleanedChat = (msg || '').trim();
      if (cleanedChat) return cleanedChat;
    } catch (e) {
      // fall through to textGeneration
    }

    // Fallback to textGeneration
    const tgRes = await inference.textGeneration({
      model,
      inputs: formatted,
      parameters: { max_new_tokens: 250, temperature: 0.3, return_full_text: false }
    });
    const output = (tgRes && tgRes.generated_text) ? tgRes.generated_text : '';
    const cleaned = (output || '').trim();
    return cleaned || 'I could not generate a response right now. Please try again.';
  } catch (err) {
    // Log detailed error for debugging and return a safe message
    console.error('Chatbot generation error:', err?.message || err);
    return 'The chatbot service is temporarily unavailable. Please try again in a moment.';
  }
}

module.exports = { askChatbot };


