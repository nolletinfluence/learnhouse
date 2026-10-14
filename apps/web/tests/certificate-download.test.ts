import { describe, expect, it } from 'bun:test'
import { certificateFileName } from '../services/courses/certificateDownload'

describe('certificate download filename', () => {
  it('keeps a readable Russian course name', () => {
    expect(certificateFileName('Фронтенд-разработка')).toBe('Фронтенд-разработка_Certificate.pdf')
  })

  it('removes path separators and reserved filename characters', () => {
    expect(certificateFileName('../HTML: CSS/JS?')).toBe('_HTML_ CSS_JS__Certificate.pdf')
  })

  it('uses a useful fallback and bounds long course names', () => {
    expect(certificateFileName(' ... ')).toBe('Certificate_Certificate.pdf')
    expect(certificateFileName('а'.repeat(200))).toBe(`${'а'.repeat(120)}_Certificate.pdf`)
  })
})
