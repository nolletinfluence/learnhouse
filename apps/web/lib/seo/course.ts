export function automaticCourseSEO(course: any, schoolName = 'BestDevs') {
  const name = String(course?.name || 'Курс').trim()
  const text = String(course?.description || course?.about || `Обучение на курсе «${name}» в ${schoolName}.`)
    .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const settings = course?.extra_metadata?.bestdevs_learning
  const duration = settings?.duration_months ? ` · ${settings.duration_months} мес.` : ''
  return { title: `${name}${duration} — ${schoolName}`, description: text.slice(0, 160),
    index: course?.published === true && course?.public === true }
}
