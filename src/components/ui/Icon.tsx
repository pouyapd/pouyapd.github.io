interface IconProps {
  name: 'arrow-right' | 'arrow-up-right' | 'arrow-up' | 'arrow-down' | 'close' | 'copy' | 'check' | 'mail' | 'github' | 'linkedin'
  className?: string
}

/** Brand glyphs drawn as solid shapes (on their own 16px grid). */
const solid: Partial<Record<IconProps['name'], string>> = {
  github:
    'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z',
}

const paths: Record<IconProps['name'], string> = {
  'arrow-right': 'M4 12h15M13 6l6 6-6 6',
  'arrow-up-right': 'M7 17 17 7M9 7h8v8',
  'arrow-up': 'M12 20V5M6 11l6-6 6 6',
  'arrow-down': 'M12 4v15M6 13l6 6 6-6',
  close: 'M6 6l12 12M18 6 6 18',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  check: 'M5 12.5 10 17 19 7',
  mail: 'M3.5 5.5h17v13h-17zM3.5 6l8.5 7 8.5-7',
  github: '',
  linkedin: 'M4 4h16v16H4zM8 10.5V17M8 7v.5M11.5 17v-6.5M11.5 13.5a2.75 2.75 0 0 1 5.5 0V17',
}

/** Line icons on a 24px grid; they inherit colour and scale with font size. */
export function Icon({ name, className }: IconProps) {
  const glyph = solid[name]
  if (glyph)
    return (
      <svg
        className={className ? `icon ${className}` : 'icon'}
        viewBox="0 0 16 16"
        width="1em"
        height="1em"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
      >
        <path d={glyph} />
      </svg>
    )
  return (
    <svg
      className={className ? `icon ${className}` : 'icon'}
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  )
}
