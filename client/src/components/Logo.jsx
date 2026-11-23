// PIXELOG mark — always black (brand colour)
export function LogoMark({ className = 'h-7 w-7' }) {
  return (
    <svg viewBox="333 287 357 370" className={className} fill="#111111" aria-hidden="true">
      <polygon points="333,465 512,287 555,330 333,552" /><polygon points="333,575 566,342 690,465 690,548 566,425 333,657" /><polygon points="522,492 566,448 690,572 690,657" />
    </svg>
  )
}

// On the dark theme the black mark sits on a small white tile (logo colour never changes)
export function LogoBadge({ className = 'h-12 w-12', mark = 'h-8 w-8' }) {
  return <span className={`inline-flex items-center justify-center rounded-xl bg-[#fff] dark:shadow ${className}`}><LogoMark className={mark} /></span>
}

// Mark + PIXELOG wordmark. `tile` puts the black mark on a white square (for dark backgrounds)
export default function Logo({ className = '', markClass = 'h-7 w-7', text = true, tile = false }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {tile
        ? <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#fff]"><LogoMark className="h-6 w-6" /></span>
        : <LogoMark className={markClass} />}
      {text && <span className="font-bold tracking-wide">PIXELOG</span>}
    </span>
  )
}
