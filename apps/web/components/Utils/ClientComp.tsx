'use client'

import type { ReactNode } from 'react'

function ClientComponentSkeleton({ children }: { children: ReactNode }) {
  return <div>{children}</div>
}

export default ClientComponentSkeleton
