const colorMap: Record<string, string> = {
  Red: 'bg-red-500',
  Green: 'bg-green-500',
  Blue: 'bg-blue-500',
  Purple: 'bg-purple-500',
  Black: 'bg-zinc-800 ring-1 ring-white/30',
  Yellow: 'bg-yellow-400',
}

export function ColorDots({ colors, size = 'sm' }: { colors: string[]; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'md' ? 'h-3 w-3' : 'h-2.5 w-2.5'

  return (
    <span className="inline-flex gap-1 align-middle">
      {colors.map((color) => (
        <span
          key={color}
          title={color}
          aria-label={color}
          className={['inline-block rounded-full', sizeClass, colorMap[color] ?? 'bg-slate-400'].join(' ')}
        />
      ))}
    </span>
  )
}
