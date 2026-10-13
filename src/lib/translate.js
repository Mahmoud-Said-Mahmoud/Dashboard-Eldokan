// Uses the browser's built-in, on-device Translator API (Chrome / Edge on
// desktop). No server, API key or WordPress translation plugin is involved.

// The first translation for a language pair downloads a language pack, which
// can take a while. The ready translator is kept so later uses are instant.
const translators = new Map()

// No download progress for this long means the download is stuck.
const STALL_TIMEOUT = 60000

export function canTranslate() {
  return typeof self !== 'undefined' && 'Translator' in self
}

// onProgress receives 0..1 while the language pack is downloading.
function getTranslator(from, to, onProgress) {
  const key = `${from}>${to}`

  if (!translators.has(key)) {
    const ready = new Promise((resolve, reject) => {
      let timer = window.setTimeout(
        () => reject(new Error('Translation download timed out')),
        STALL_TIMEOUT
      )

      const keepAlive = () => {
        window.clearTimeout(timer)
        timer = window.setTimeout(
          () => reject(new Error('Translation download timed out')),
          STALL_TIMEOUT
        )
      }

      self.Translator.create({
        sourceLanguage: from,
        targetLanguage: to,
        monitor(monitor) {
          monitor.addEventListener('downloadprogress', (event) => {
            keepAlive()
            onProgress?.(Number(event.loaded) || 0)
          })
        },
      }).then(
        (translator) => {
          window.clearTimeout(timer)
          resolve(translator)
        },
        (error) => {
          window.clearTimeout(timer)
          reject(error)
        }
      )
    })

    // A failed download must not block the next attempt.
    ready.catch(() => translators.delete(key))
    translators.set(key, ready)
  }

  return translators.get(key)
}

// Translates every text in `texts` and returns them in the same order.
// Line breaks are kept by translating line by line.
export async function translateTexts(texts, from, to, onProgress) {
  const availability = await self.Translator.availability({
    sourceLanguage: from,
    targetLanguage: to,
  })

  if (availability === 'unavailable') {
    throw new Error('Translation is not available for this language pair')
  }

  const translator = await getTranslator(from, to, onProgress)
  const results = []

  for (const text of texts) {
    const lines = String(text || '').split('\n')
    const translated = []

    for (const line of lines) {
      translated.push(
        line.trim() ? await translator.translate(line) : line
      )
    }

    results.push(translated.join('\n'))
  }

  return results
}
