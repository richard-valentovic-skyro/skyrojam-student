"use client";

import { useEffect, useState } from "react";
import { MealCard } from "@/components/MealCard";
import { PageHead } from "@/shared/components/PageHead";
import { Icon } from "@/shared/components/Icon";
import { MEALS } from "@/shared/lib/data";
import { eur, LUNCH_PRICE } from "@/shared/lib/pricing";
import { CURRENT_STUDENT_ID, STUDENTS } from "@/shared/lib/users";

const DEADLINE_HOUR = 14;
const WINDOW_HOURS = 6; // the ordering window opens at 08:00

function pad2(v: number) {
  return v < 10 ? `0${v}` : `${v}`;
}

export default function MenuPage() {
  const me = STUDENTS.find((s) => s.id === CURRENT_STUDENT_ID)!;
  const [selected, setSelected] = useState(4);
  const [confirmed, setConfirmed] = useState(false);
  /* Charged on confirm. Local only until the API lands. */
  const [balance, setBalance] = useState(me.balance);
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    function tick() {
      const now = new Date();
      const end = new Date(now);
      end.setHours(DEADLINE_HOUR, 0, 0, 0);
      setLeft(Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000)));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const open = left === null || left > 0;
  const clock =
    left === null
      ? "--:--:--"
      : `${pad2(Math.floor(left / 3600))}:${pad2(Math.floor((left % 3600) / 60))}:${pad2(left % 60)}`;
  const pct = left === null ? 0 : Math.min(100, 100 - (left / (WINDOW_HOURS * 3600)) * 100);
  const meal = MEALS[selected];
  const affordable = balance >= LUNCH_PRICE;
  const canOrder = open && affordable && !confirmed;

  return (
    <>
      <PageHead
        title="Dnešné menu"
        sub="Pondelok 14. septembra"
        actions={
          <button className="iconbtn" aria-label="Oznámenia">
            <Icon name="notifications" />
          </button>
        }
      />

      <div className="grid gap-7 items-start grid-cols-1 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div>
          <div className="gl">Vyberte si jedlo na dnes</div>
          <div className="grid gap-5 grid-cols-1 md:grid-cols-2 2xl:grid-cols-3">
            {MEALS.map((m, i) => (
              <MealCard
                key={m.n}
                meal={m}
                index={i}
                selected={i === selected}
                onSelect={(idx) => {
                  setSelected(idx);
                  setConfirmed(false);
                }}
              />
            ))}
          </div>
        </div>

        {/* The phone's fixed action bar becomes a sticky rail on desktop. */}
        <aside className="xl:sticky xl:top-[92px] flex flex-col gap-4">
          <div className="cdcard">
            <div className="cdtop">
              <div>
                <div className="cdlab">Uzávierka objednávok</div>
                <div className="cdsub">
                  {open ? "okno sa zatvára o 14:00" : "okno je zatvorené"}
                </div>
              </div>
              <div className="cdval" suppressHydrationWarning>
                {clock}
              </div>
            </div>
            <div className="track">
              <i style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="plain">
            <div className="ph">
              <span className="pd">Vaša voľba</span>
              <span className="pd money">{eur(LUNCH_PRICE)}</span>
            </div>
            <div className="dmeal">
              <span className={`disc ${meal.tint}`}>
                <Icon name={meal.ic} />
              </span>
              <div>
                <div className="dn">{meal.n}</div>
                <div className="dsub">
                  Obed {selected + 1} · {meal.cat}
                </div>
              </div>
            </div>

            <div className="rule-line" />
            <div className="flex items-center justify-between">
              <span className="cdlab">Zostatok po objednávke</span>
              <span
                className="money text-[15px]"
                style={{ color: affordable ? "var(--ink)" : "var(--c-rose)" }}
              >
                {eur(confirmed ? balance : balance - LUNCH_PRICE)}
              </span>
            </div>
          </div>

          <button
            className="btn block"
            disabled={!canOrder}
            onClick={() => {
              setBalance((b) => +(b - LUNCH_PRICE).toFixed(2));
              setConfirmed(true);
            }}
          >
            <Icon name={confirmed ? "check_circle" : "check"} />
            {confirmed ? "Objednávka potvrdená" : "Potvrdiť objednávku"}
            <span className="qty">{eur(LUNCH_PRICE)}</span>
          </button>

          {!affordable ? (
            <p
              className="text-[12.5px] leading-[1.6] font-semibold px-1"
              style={{ color: "var(--c-rose)" }}
              role="status"
            >
              Na obed nemáte dosť kreditu. Chýba {eur(LUNCH_PRICE - balance)} —
              požiadajte vedúcu jedálne o dobitie.
            </p>
          ) : (
            <p className="text-[12.5px] leading-[1.6] font-medium px-1" style={{ color: "var(--ink-3)" }}>
              Objednávku môžete zmeniť až do uzávierky. Po 14:00 sa rozpis
              odosiela do kuchyne.
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
