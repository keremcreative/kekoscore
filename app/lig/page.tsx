import Link from "next/link";
import { LEAGUES } from "@/lib/leagues";

export default function Leagues() {
  return (
    <>
      <h1 className="page-title">Ligler</h1>
      <div className="card league-list">
        {LEAGUES.map((l) => (
          <Link key={l.code} href={`/lig/${l.code}`}>
            <span className="flag">{l.flag}</span>
            <span>
              {l.name}
              <small>{l.country}</small>
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
