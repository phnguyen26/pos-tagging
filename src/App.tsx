import { FormEvent, useEffect, useMemo, useState } from 'react'

type PredictionResponse = {
  text: string
  tokens: string[]
  label: string[]
}

type TaggedToken = {
  word: string
  tag: string
  explanation: string
  example: string
}

const defaultText = 'The quick brown fox jumped over the lazy dog.'

const examples = [
  'The quick brown fox jumped over the lazy dog.',
  'The Math Illusion',
  'It turns out it was just a dream.',
  'You are witnessing the textbook definition of overfitting! '
]

const tagDescriptions: Record<string, { desc: string; example: string }> = {
  "POS": { "desc": "Possessive ending", "example": "'s" },
  "$": { "desc": "Dollar sign", "example": "$, $10, $50" },
  "UH": { "desc": "Interjection", "example": "uh, well, wow, oh" },
  "''": { "desc": "Closing quotation mark", "example": "', \"" },
  "CD": { "desc": "Cardinal number", "example": "one, 3, 1998, 2026" },
  "NNPS": { "desc": "Proper noun, plural", "example": "Americans, Soviets" },
  "VBZ": { "desc": "Verb, 3rd person singular present", "example": "is, has, does, runs" },
  "#": { "desc": "Pound sign", "example": "#" },
  ".": { "desc": "Sentence-final punctuation", "example": "., !, ?" },
  "PRP$": { "desc": "Possessive pronoun", "example": "my, your, his, her, its" },
  ",": { "desc": "Comma", "example": "," },
  "WDT": { "desc": "Wh-determiner", "example": "which, that" },
  ":": { "desc": "Colon, semicolon, or ellipsis", "example": ":, ;, ..." },
  "MD": { "desc": "Modal", "example": "can, could, will, should" },
  "VB": { "desc": "Verb, base form", "example": "be, have, do, run" },
  "CC": { "desc": "Coordinating conjunction", "example": "and, but, or, so" },
  "EX": { "desc": "Existential there", "example": "there (as in 'there is a way')" },
  "SYM": { "desc": "Symbol", "example": "+, -, =, %, &" },
  "NNS": { "desc": "Noun, plural", "example": "dogs, cats, data, values" },
  "JJR": { "desc": "Adjective, comparative", "example": "faster, cooler, better" },
  "VBN": { "desc": "Verb, past participle", "example": "been, had, done, seen" },
  "RBS": { "desc": "Adverb, superlative", "example": "most, best, least" },
  "WP$": { "desc": "Possessive wh-pronoun", "example": "whose" },
  "VBP": { "desc": "Verb, non-3rd person singular present", "example": "am, are, have, do, run" },
  "NNP": { "desc": "Proper noun, singular", "example": "React, London, DistilBERT" },
  "-NONE-": { "desc": "Traces / Null elements", "example": "Used for structural syntax parsing" },
  "JJS": { "desc": "Adjective, superlative", "example": "fastest, coolest, best" },
  "RB": { "desc": "Adverb", "example": "quickly, very, not, well" },
  "-RRB-": { "desc": "Right round bracket", "example": "), }, ]" },
  "WP": { "desc": "Wh-pronoun", "example": "who, what, whom" },
  "RP": { "desc": "Particle", "example": "about, off, up, out" },
  "RBR": { "desc": "Adverb, comparative", "example": "faster, further, more" },
  "-LRB-": { "desc": "Left round bracket", "example": "(, {, [" },
  "PRP": { "desc": "Personal pronoun", "example": "I, you, he, she, it, they" },
  "LS": { "desc": "List item marker", "example": "1, a, A" },
  "VBG": { "desc": "Verb, gerund or present participle", "example": "being, having, running" },
  "``": { "desc": "Opening quotation mark", "example": "`, \"" },
  "DT": { "desc": "Determiner", "example": "the, a, an, this" },
  "NN": { "desc": "Noun, singular or mass", "example": "dog, cat, code, UI" },
  "VBD": { "desc": "Verb, past tense", "example": "was, had, did, ran" },
  "FW": { "desc": "Foreign word", "example": "deja vu, sushi, vice versa" },
  "WRB": { "desc": "Wh-adverb", "example": "how, where, why, when" },
  "JJ": { "desc": "Adjective", "example": "quick, dark, beautiful" },
  "TO": { "desc": "to", "example": "to" },
  "PDT": { "desc": "Predeterminer", "example": "all, both, half" },
  "IN": { "desc": "Preposition or subordinating conjunction", "example": "in, on, at, with, that" }
}

const curvePoints = {
  training : [1.9762, 0.6960, 0.5342, 0.4810, 0.4574, 0.4454, 0.4378, 0.4305, 0.4273, 0.4254],
  validation : [0.9391, 0.5854, 0.5130, 0.4797, 0.4540, 0.4470, 0.4409, 0.4343, 0.4289, 0.4350]

}


function tagTone(tag: string) {
  if (tag === 'PUNCT' || tag === '.') {
    return 'tone-punctuation'
  }

  if (tag === 'VERB' || tag.startsWith('VB') || tag === 'AUX') {
    return 'tone-verb'
  }

  if (tag === 'DET' || tag === 'DT' || tag === 'PRON' || tag.startsWith('PRP')) {
    return 'tone-determiner'
  }

  if (tag === 'ADJ' || tag.startsWith('JJ')) {
    return 'tone-adjective'
  }

  if (tag === 'ADV' || tag.startsWith('RB')) {
    return 'tone-adverb'
  }

  if (tag === 'ADP' || tag === 'IN') {
    return 'tone-adposition'
  }

  if (tag === 'NUM' || tag === 'CD') {
    return 'tone-number'
  }

  return 'tone-noun'
}

function buildCurvePath(values: number[], width = 360, height = 180) {
  if (values.length === 0) {
    return ''
  }

  const paddingX = 18
  const paddingY = 20
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = Math.max(max - min, 1)
  const stepX = (width - paddingX * 2) / (values.length - 1)

  return values
    .map((value, index) => {
      const x = paddingX + index * stepX
      const normalized = (value - min) / range
      const y = height - paddingY - normalized * (height - paddingY * 2)
      return `${x},${y}`
    })
    .join(' ')
}

function App() {
  const [text, setText] = useState(defaultText)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null)
  const tokens = prediction?.tokens ?? []
  const taggedTokens = useMemo<TaggedToken[]>(() => {
    if (!prediction?.label?.length) {
      return tokens.map((word) => ({
        word,
        tag: 'PENDING',
        explanation: 'Waiting for inference',
        example: 'Waiting for inference',

      }))
    }

    const pairCount = Math.min(tokens.length, prediction.label.length)
    const pairs = tokens.slice(0, pairCount).map((word, index) => {
      const tag = prediction.label[index] ?? 'UNK'
      return {
        word,
        tag,
        explanation: tagDescriptions[tag]?.desc ?? 'Unknown tag',
        example: tagDescriptions[tag]?.example ?? 'No example available',
      }
    })
    return pairs
  }, [prediction, tokens])

  const taggedCount = prediction?.label.length ?? 0
  const coverage = tokens.length > 0 ? Math.round((Math.min(tokens.length, taggedCount) / tokens.length) * 100) : 0

  const runPrediction = async (value: string, signal?: AbortSignal) => {
    const trimmedValue = value.trim()

    if (trimmedValue.length === 0) {
      setPrediction(null)
      setError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('text', value)

      const response = await fetch('/api/predict', {
        method: 'POST',
        body: formData,
        signal,
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Failed to tag text')
      }

      const data = (await response.json()) as PredictionResponse
      setPrediction(data)
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') {
        return
      }

      setPrediction(null)
      setError(requestError instanceof Error ? requestError.message : 'Failed to tag text')
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false)
      }
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    await runPrediction(text)
  }

  useEffect(() => {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      void runPrediction(text, controller.signal)
    }, 450)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [text])


  
  return (
    <div className="page-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar panel-surface">
        <div className="brand-block">
          <div>
            <h1 className="eyebrow">POS Tagging</h1>
          </div>
        </div>

        <nav className="nav-links" aria-label="Primary">
          <a
            className="nav-icon-link"
            href="https://github.com/phnguyen26"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="GitHub profile"
            title="GitHub profile"
            
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"  fill="currentColor">
              <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.54 2.87 8.4 6.84 9.76.5.09.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.38-3.37-1.38-.46-1.19-1.12-1.5-1.12-1.5-.91-.63.07-.62.07-.62 1.01.07 1.55 1.07 1.55 1.07.9 1.58 2.36 1.12 2.93.86.09-.66.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.2 9.2 0 0 1 12 6.8c.85 0 1.7.12 2.5.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.95.68 1.91 0 1.38-.01 2.49-.01 2.83 0 .27.18.59.69.49A10.1 10.1 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
            </svg>
            </a>
        </nav>
      </header>

      <main className="layout" id="dashboard">
        <section className="hero-card panel-surface">
          <div className="hero-copy">
            <p className="section-kicker">Token Classification</p>
            <p className="section-copy">
              Part-of-speech tagging with distilbert-base-uncased finetuned on a sample of Penn Treebank.

            </p>
          </div>

          <div className="example-row" aria-label="Example sentences">
            {examples.map((example) => (
              <button key={example} type="button" className="example-chip" onClick={() => setText(example)}>
                {example}
              </button>
            ))}
          </div>

          <form className="input-grid" onSubmit={handleSubmit}>
            <label className="input-panel">
              <div className="input-header">
                <div>
                  <p className="panel-label">Input</p>
                </div>
                <span className="counter-pill">{tokens.length} tokens</span>
              </div>

              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={8}
                placeholder="Type a sentence here..."
              />

              <div className="input-footer">
                <span>
                  {isLoading
                    ? 'Tagging sentence...'
                    : prediction
                      ? 'Latest prediction ready'
                      : 'Awaiting inference'}
                </span>
                <button type="submit" className="process-button" disabled={isLoading || text.trim().length === 0}>
                  {isLoading ? 'Processing...' : 'Process Text'}
                </button>
              </div>
            </label>

            <article className="output-panel" aria-live="polite">
              <div className="input-header">
                <div>
                  <p className="panel-label">Output</p>
                </div>
                <span className="counter-pill counter-pill-accent">{taggedCount} labels</span>
              </div>

              {error ? <div className="error-banner">{error}</div> : null}

              <div className="tag-table" role="table" aria-label="Tagged output">
                <div className="tag-table-head" role="row">
                  <span role="columnheader">Word</span>
                  <span role="columnheader">POS Tag</span>
                  <span role="columnheader">Explanation</span>
                  <span role="columnheader">Example</span>
                </div>

                <div className="tag-table-body">
                  {taggedTokens.map((item, index) => (
                    <div className="tag-row" role="row" key={`${item.word}-${index}`}>
                      <span className="tag-word" role="cell">
                        {item.word}
                      </span>
                      <span className={`tag-badge ${tagTone(item.tag)}`} role="cell">
                        {item.tag}
                      </span>
                      <span className="tag-explanation" role="cell">
                        {item.explanation}
                      </span>
                      <span className="tag-example" role="cell">
                        {item.example}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </form>
        </section>

        <section className="lower-grid">
          <article className="summary-card panel-surface" id="models">
            <div className="card-heading">
              <div>
                <p className="panel-label">Model Summary</p>
              </div>
              {/* <span className="status-chip">Live demo</span> */}
            </div>

            <dl className="summary-list">
              <div>
                <dt>Base model</dt>
                <dd><code>distilbert-base-uncased</code></dd>
              </div>
              <div>
                <dt>Fine-tuning data</dt>
                <dd><code>NLTK treebank corpus</code> (~4000 sentences)</dd>
              </div>
              <div>
                <dt>Classification Head</dt>
                <dd>
                  <code>
                      Linear(in_features=768,out_features=768)
                      <br></br>
                      Dropout(p=0.3)
                      <br></br>
                      GELU()
                      <br></br>
                      Linear(in_features=768, out_features=47)
                  </code>
                </dd>
              </div>
              <div>
                <dt>Trainable Parameters</dt>
                <dd><code>626,735</code></dd>
              </div>
              <div>
                <dt>Optimizer</dt>
                <dd><code>Adam(lr=5e-4, weight_decay=0.01)</code></dd>
              </div>
              <div>
                <dt>Num epochs</dt>
                <dd><code>10</code></dd>
              </div>
              <div>
                <dt>Accuracy</dt>
                <dd><code>~92%</code></dd>
              </div>
            </dl>
          </article>

          <article className="chart-card panel-surface" id="docs">
            <div className="card-heading">
              <div>
                <p className="panel-label">Loss Curve</p>
              </div>
              <span className="status-chip status-chip-alt">Reference</span>
            </div>

            <div className="chart-frame" aria-hidden="true">
              <img
                src="/assets/loss-curve.png"
                alt="Training and validation curves"
                className="loss-figure"
              />

              <div className="chart-legend">
                <span>
                  <i className="legend-swatch legend-training" /> Training
                </span>
                <span>
                  <i className="legend-swatch legend-validation" /> Evaluation
                </span>
              </div>
            </div>
          </article>
        </section>
      </main>
    </div>
  )
}

export default App