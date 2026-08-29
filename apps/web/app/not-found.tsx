import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { BestDevsLogo } from '@components/Brand/BestDevsLogo'

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center 
   bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-200 to-slate-300">
      <div className="pb-20">
        <BestDevsLogo
          showName
          className="h-16 w-16 rounded-2xl"
          wrapperClassName="flex items-center gap-4"
          nameClassName="text-3xl font-black tracking-tight text-black"
        />
      </div>
      <div className="space-y-6 text-center">
        <h1 className="text-8xl leading-7 font-bold text-black drop-shadow-md">
          404!
        </h1>
        <p className='text-lg pt-8 text-black tracking-tight font-medium leading-normal'>
          We are very sorry for the inconvenience. It looks like you're trying to
          <span className="block">access a page that has been deleted or never existed before</span>
        </p>
      </div>
      <div className='pt-8 flex flex-col items-center'>
        <Link
          href="/"
          className="flex w-fit h-[50px] text-xl space-x-2 bg-black px-6 py-2 text-md rounded-lg font-bold text-white items-center shadow-md gap-2"
        >
          Go back to homepage
          <ArrowRight className="tracking-tight transition-transform duration-150 ease-in-out ms-1" />
        </Link>
      </div>
    </div>
  )
}

