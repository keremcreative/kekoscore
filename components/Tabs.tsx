import Link from "next/link";

export function Tabs({ items, current, base }: { items: { key: string; label: string }[]; current: string; base: string }) {
  return (
    <nav className="tabs" aria-label="Bölümler">
      {items.map((t, i) => (
        <Link
          key={t.key}
          href={i === 0 ? base : `${base}?sekme=${t.key}`}
          className={t.key === current ? "on" : ""}
          scroll={false}
          replace
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
