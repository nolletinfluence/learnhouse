import { expect, test } from 'bun:test'
import i18n, { changeLanguage } from '../lib/i18n'
import { filterCommands, slashCommands } from '../components/Objects/Editor/Extensions/SlashCommands/slashCommandsConfig'

test('block search matches Russian labels and preserves English command IDs', async () => {
  await changeLanguage('ru', 'default')
  expect(filterCommands('Заголовок 2').map(item => item.id)).toEqual(['heading2'])
  expect(filterCommands('таблицу').map(item => item.id)).toContain('table')
  expect(filterCommands('paragraph').map(item => item.id)).toContain('paragraph')
  expect(i18n.t('Paragraph', { ns: 'school' })).toBe('Абзац')
  await changeLanguage('en', 'default')
  expect(filterCommands('Heading 2').map(item => item.id)).toEqual(['heading2'])
  expect(filterCommands('')).toEqual(slashCommands)
  expect(slashCommands.some(item => item.id === 'magicBlock')).toBe(false)
})
