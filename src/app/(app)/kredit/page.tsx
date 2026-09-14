"use client";

import { PageHead } from "@/shared/components/PageHead";
import { Icon } from "@/shared/components/Icon";
import { eur, lunchesLeft, LUNCH_PRICE } from "@/shared/lib/pricing";
import { CURRENT_STUDENT_ID, LEDGER, STUDENTS } from "@/shared/lib/users";

export default function CreditPage() {
  const me = STUDENTS.find((s) => s.id === CURRENT_STUDENT_ID)!;
  const entries = LEDGER.filter((l) => l.studentId === me.id);
  const left = lunchesLeft(me.balance);
  const low = me.balance < LUNCH_PRICE;

  return (
    <>
      <PageHead title="Môj kredit" sub={`${me.trieda} · ${me.email}`} />

      <div className="grid gap-7 items-start grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <div className="hero">
            <div className="hl">Zostatok na účte</div>
            <div className="hn">{eur(me.balance)}</div>
            <div className="hd">
              <Icon name={low ? "warning" : "restaurant"} />
              {low
                ? `Nestačí na obed (${eur(LUNCH_PRICE)})`
                : `Vystačí na ${left} ${left === 1 ? "obed" : left < 5 ? "obedy" : "obedov"}`}
            </div>
          </div>

          <div className="plain">
            <div className="ph">
              <span className="pd">Cena obeda</span>
              <span className="pd money">{eur(LUNCH_PRICE)}</span>
            </div>
            <p className="pempty">
              <b>Kredit dobíja školská jedáleň</b>
              Peniaze odovzdajte vedúcej jedálne, ktorá ich pripíše na váš účet.
              Suma sa odpočíta pri potvrdení objednávky.
            </p>
          </div>
        </div>

        <div className="plain">
          <div className="ph">
            <span className="pd">Pohyby na účte</span>
            <span className="pd">{entries.length} záznamov</span>
          </div>

          {entries.length === 0 ? (
            <p className="pempty">
              <b>Zatiaľ žiadne pohyby</b>
              Po prvom dobití kreditu sa tu objaví záznam.
            </p>
          ) : (
            entries.map((l) => {
              const up = l.amount > 0;
              return (
                <div key={l.id} className={`led ${up ? "up" : "down"}`}>
                  <span className="ldisc">
                    <Icon name={up ? "add" : "restaurant"} />
                  </span>
                  <span className="li">
                    <span className="ll">{l.label}</span>
                    <span className="lt">
                      {l.at}
                      {l.by ? ` · ${l.by}` : ""}
                    </span>
                  </span>
                  <span className="la">
                    {up ? "+" : ""}
                    {eur(l.amount)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
