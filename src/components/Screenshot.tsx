// An app screenshot in the viewer's light or dark, from assets/light-<name> and assets/dark-<name>.
type Props = { name: string; alt: string; className?: string; priority?: boolean };

export default function Screenshot({ name, alt, className, priority }: Props) {
  return (
    <figure className={['shot', className].filter(Boolean).join(' ')}>
      <picture>
        <source media="(prefers-color-scheme: dark)" srcSet={`/assets/dark-${name}`} />
        <img src={`/assets/light-${name}`} width={1920} height={1260} alt={alt}
          {...(priority ? { fetchPriority: 'high' as const } : { loading: 'lazy' as const })} />
      </picture>
    </figure>
  );
}
