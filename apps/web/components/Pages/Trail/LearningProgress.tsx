'use client'

import { CheckCircle2, Clock3, Circle, CircleAlert } from 'lucide-react'
import { useSchoolTranslation } from '@/lib/school-i18n'
import { learningSummary, lessonLearningState, type LessonLearningState } from '@/lib/student-experience'

const STATE_LABELS: Record<LessonLearningState, string> = {
  credited: 'Зачтено', pending: 'Ждёт отметки ментора', absent: 'Пропуск',
  excused: 'Уважительная причина', not_started: 'Не открыто',
}

export function LessonLearningBadge({ run, activityId }: { run: any; activityId: number }) {
  const { t: st } = useSchoolTranslation()
  const state = lessonLearningState(run, activityId)
  const Icon = state === 'credited' ? CheckCircle2 : state === 'pending' ? Clock3
    : state === 'not_started' ? Circle : CircleAlert
  const color = state === 'credited' ? 'text-emerald-700 bg-emerald-50' : state === 'pending'
    ? 'text-amber-800 bg-amber-50' : state === 'not_started' ? 'text-neutral-500 bg-neutral-100'
      : 'text-rose-700 bg-rose-50'
  return <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium ${color}`}>
    <Icon size={14} className="shrink-0" />{st(STATE_LABELS[state])}
  </span>
}

export default function LearningProgress({ course, run, compact = false }: { course: any; run: any; compact?: boolean }) {
  const { t: st } = useSchoolTranslation()
  const { completed, pending, total, percentage } = learningSummary(course, run)
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <span className="font-semibold text-neutral-800">{st('Зачтено ментором')}</span>
      <span className="font-semibold tabular-nums">{percentage}% · {completed}/{total}</span>
    </div>
    <div role="progressbar" aria-label={st('Зачтено ментором')} aria-valuenow={completed} aria-valuemin={0} aria-valuemax={total || 1}
      aria-valuetext={st('{{completed}} из {{total}} зачтено', { completed, total })}
      className="h-2 overflow-hidden rounded-full bg-neutral-100">
      <div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${percentage}%` }} />
    </div>
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
      <span className="inline-flex items-center gap-1.5 text-emerald-700"><CheckCircle2 size={14} />{st('Зачтено')}: {completed}</span>
      <span className="inline-flex items-center gap-1.5 text-amber-800"><Clock3 size={14} />{st('Ждёт отметки')}: {pending}</span>
    </div>
    {!compact && <p className="text-sm leading-relaxed text-neutral-500">{st('Открытие материала сохраняет ваше место. Процент растёт, когда ментор подтверждает посещение. Пропуски не считаются зачтёнными.')}</p>}
    {!total && <p className="text-sm text-neutral-500">{st('Ментор ещё не опубликовал занятия. Они появятся здесь, когда будут готовы.')}</p>}
  </div>
}
