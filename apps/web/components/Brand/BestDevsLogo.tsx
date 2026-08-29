import type { ImgHTMLAttributes } from 'react'

import { BESTDEVS_LMS_NAME } from '@lib/bestdevs-brand'

type BestDevsLogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'src'> & {
  nameClassName?: string
  showName?: boolean
  wrapperClassName?: string
}

export function BestDevsLogo({
  nameClassName,
  showName = false,
  wrapperClassName,
  ...imageProps
}: BestDevsLogoProps) {
  const { className, ...restImageProps } = imageProps
  const image = (
    <img
      {...restImageProps}
      alt={showName ? '' : BESTDEVS_LMS_NAME}
      aria-hidden={showName ? true : undefined}
      className={`bg-black p-1 ${className || ''}`}
      src="/bestdevs-logo.png"
    />
  )

  if (!showName) return image

  return (
    <span className={wrapperClassName}>
      {image}
      <span className={nameClassName}>{BESTDEVS_LMS_NAME}</span>
    </span>
  )
}
