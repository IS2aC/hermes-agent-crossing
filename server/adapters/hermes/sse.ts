export interface SseMessage {
  event: string | null
  data: string
}

/** Découpe un flux SSE. Les commentaires (`: keepalive`) sont ignorés. */
export async function* parseSse(chunks: AsyncIterable<Uint8Array>): AsyncGenerator<SseMessage> {
  const decoder = new TextDecoder()
  let buffer = ''
  let event: string | null = null
  let data: string[] = []

  const takeLine = (line: string): SseMessage | null => {
    if (line === '') {
      if (data.length === 0) {
        event = null
        return null
      }
      const message = { event, data: data.join('\n') }
      event = null
      data = []
      return message
    }
    if (line.startsWith(':')) return null
    const separator = line.indexOf(':')
    const field = separator === -1 ? line : line.slice(0, separator)
    const value = separator === -1 ? '' : line.slice(separator + 1).replace(/^ /, '')
    if (field === 'event') event = value
    else if (field === 'data') data.push(value)
    return null
  }

  for await (const chunk of chunks) {
    buffer += decoder.decode(chunk, { stream: true })
    let newline = buffer.indexOf('\n')
    while (newline !== -1) {
      const line = buffer.slice(0, newline).replace(/\r$/, '')
      buffer = buffer.slice(newline + 1)
      const message = takeLine(line)
      if (message) yield message
      newline = buffer.indexOf('\n')
    }
  }
}
