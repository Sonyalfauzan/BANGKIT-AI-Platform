/* Gemini API Service — Client-side wrapper for Google Generative AI */

import { GoogleGenerativeAI } from '@google/generative-ai'

let genAI = null
let model = null

export function initGemini(apiKey) {
  if (!apiKey) return false
  try {
    genAI = new GoogleGenerativeAI(apiKey)
    model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    return true
  } catch (e) {
    console.error('Gemini init error:', e)
    return false
  }
}

export function isGeminiReady() {
  return model !== null
}

/**
 * Generate text content from a prompt
 */
export async function generateContent(prompt) {
  if (!model) throw new Error('Gemini belum diinisialisasi. Masukkan API Key di Settings.')
  
  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    if (error.message?.includes('API_KEY')) {
      throw new Error('API Key tidak valid. Periksa kembali di Settings.')
    }
    if (error.message?.includes('RATE_LIMIT') || error.message?.includes('429')) {
      throw new Error('Batas penggunaan API tercapai. Coba lagi dalam beberapa menit.')
    }
    if (error.message?.includes('503') || error.message?.includes('high demand')) {
      throw new Error('Server AI sedang sibuk (kapasitas penuh). Silakan coba lagi dalam beberapa detik.')
    }
    throw new Error('Gagal menghasilkan konten: ' + (error.message || 'Error tidak diketahui'))
  }
}

/**
 * Generate content from image + text (multimodal)
 */
export async function analyzeImage(base64Data, mimeType, prompt) {
  if (!model) throw new Error('Gemini belum diinisialisasi. Masukkan API Key di Settings.')

  try {
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    }
    const result = await model.generateContent([prompt, imagePart])
    const response = await result.response
    return response.text()
  } catch (error) {
    throw new Error('Gagal menganalisis gambar: ' + (error.message || 'Error tidak diketahui'))
  }
}

/**
 * Stream content for real-time display
 */
export async function streamContent(prompt, onChunk) {
  if (!model) throw new Error('Gemini belum diinisialisasi. Masukkan API Key di Settings.')

  try {
    const result = await model.generateContentStream(prompt)
    let fullText = ''
    for await (const chunk of result.stream) {
      const text = chunk.text()
      fullText += text
      onChunk(fullText)
    }
    return fullText
  } catch (error) {
    throw new Error('Gagal streaming konten: ' + (error.message || 'Error tidak diketahui'))
  }
}

/**
 * Chat session for multi-turn conversations
 */
export function createChatSession(systemPrompt) {
  if (!model) throw new Error('Gemini belum diinisialisasi.')
  
  const chat = model.startChat({
    history: [
      {
        role: 'user',
        parts: [{ text: systemPrompt }]
      },
      {
        role: 'model',
        parts: [{ text: 'Siap! Saya akan berperan sesuai instruksi di atas.' }]
      }
    ]
  })

  return {
    async sendMessage(message) {
      try {
        const result = await chat.sendMessage(message)
        const response = await result.response
        return response.text()
      } catch (error) {
        if (error.message?.includes('API_KEY')) {
          throw new Error('API Key tidak valid. Periksa kembali di Settings.')
        }
        if (error.message?.includes('RATE_LIMIT') || error.message?.includes('429')) {
          throw new Error('Batas penggunaan API tercapai. Coba lagi dalam beberapa menit.')
        }
        if (error.message?.includes('503') || error.message?.includes('high demand')) {
          throw new Error('Server AI sedang sibuk (kapasitas penuh). Silakan coba lagi dalam beberapa detik.')
        }
        throw new Error('Gagal mengirim pesan: ' + (error.message || 'Error tidak diketahui'))
      }
    }
  }
}
