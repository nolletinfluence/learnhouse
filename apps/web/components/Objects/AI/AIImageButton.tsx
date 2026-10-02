import React, { useState } from 'react'
import { Sparkle } from '@phosphor-icons/react'
import AIImagePicker from './AIImagePicker'

interface AIImageButtonProps {
  onSelect: (_imageUrl: string) => void
  onSelectFile?: (_file: File) => void | Promise<void>
  className?: string
  label?: string
  variant?: 'button' | 'chip'
}

// const AIImageButton: React.FC<AIImageButtonProps> = ({
//   onSelect,
//   onSelectFile,
//   className,
//   label = 'Generate with AI',
//   variant = 'button',
// }) => {
//   const [open, setOpen] = useState(false)
//
//   const base =
//     variant === 'chip'
//       ? 'px-3 py-1 bg-neutral-100 rounded-lg hover:bg-neutral-200 nice-shadow transition-colors flex items-center gap-1.5 text-sm'
//       : 'px-3 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 nice-shadow transition-colors flex items-center gap-1.5 text-sm'
//
//   return (
//     <>
//       <button type="button" onClick={() => setOpen(true)} className={className || base}>
//         <Sparkle weight="duotone" size={15} />
//         {label}
//       </button>
//       {open && (
//         <AIImagePicker
//           isOpen={open}
//           onSelect={onSelect}
//           onSelectFile={onSelectFile}
//           onClose={() => setOpen(false)}
//         />
//       )}
//     </>
//   )
// }

const AIImageButton: React.FC<AIImageButtonProps> = () => null

export default AIImageButton
