// An app screenshot in the viewer's light or dark, from assets/light-<name> and assets/dark-<name>.
// `phone` names a tall crop (assets/light-<phone>, assets/dark-<phone>, 720×1400) shown on narrow screens instead,
// where the whole window would be too small to read.
type Props = { name: string; alt: string; className?: string; priority?: boolean; phone?: string };

const NARROW = '(max-width: 40rem)';

export default function Screenshot({ name, alt, className, priority, phone }: Props) {
  return (
    <figure className={['shot', className].filter(Boolean).join(' ')}>
      <picture>
        {phone && <source media={`${NARROW} and (prefers-color-scheme: dark)`} srcSet={`/assets/dark-${phone}`} width={720} height={1400} />}
        {phone && <source media={NARROW} srcSet={`/assets/light-${phone}`} width={720} height={1400} />}
        <source media="(prefers-color-scheme: dark)" srcSet={`/assets/dark-${name}`} />
        <img src={`/assets/light-${name}`} width={1920} height={1260} alt={alt}
          {...(priority ? { fetchPriority: 'high' as const } : { loading: 'lazy' as const })} />
      </picture>
    </figure>
  );
}
