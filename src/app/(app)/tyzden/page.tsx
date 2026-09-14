"use client";

import { useState } from "react";
import { PageHead } from "@/shared/components/PageHead";
import { Icon } from "@/shared/components/Icon";
import { Chip } from "@/shared/components/Chip";
import { MEALS, WEEK } from "@/shared/lib/data";

export default function WeekPage() {
  const [active, setActive] = useState(0);
  const day = WEEK[active];
  const meal = day.i === null ? null : MEALS[day.i];

  return (
    <>
      <PageHead
        title="Tento týždeň"
        sub="14. až 18. septembra"
        actions={
          <button className="iconbtn" aria-label="Filtre">
            <Icon name="tune" />
          </button>
        }
      />

      <div className="days" role="group" aria-label="Výber dňa">
        {WEEK.map((d, i) => (
          <button
            key={d.d}
            className="day"
            aria-pressed={i === active}
            onClick={() => setActive(i)}
          >
            <span className="dw">{d.w}</span>
            <span className="dd">{d.d}</span>
            <span className={`dt ${d.i !== null ? "done" : ""}`} />
          </button>
        ))}
      </div>

      <div className="grid gap-7 items-start mt-6 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <div className="gl">Rozpis týždňa</div>
          <div className="flex flex-col gap-3">
            {WEEK.map((d, i) => {
              const m = d.i === null ? null : MEALS[d.i];
              return (
                <button
                  key={d.d}
                  className="orow"
                  onClick={() => setActive(i)}
                  style={{ textAlign: "left", border: 0, fontFamily: "inherit", cursor: "pointer" }}
                >
                  <span className="od">
                    <span className="ow">{d.w}</span>
                    <span className="on">{d.d}</span>
                  </span>
                  <span className="oi">
                    <span className="om">{m ? m.n : "Zatiaľ bez objednávky"}</span>
                    <span className="os">{m ? m.cat : "Objednávka je otvorená"}</span>
                  </span>
                  <Chip st={d.st}>{d.l}</Chip>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="xl:sticky xl:top-[92px]">
          <div className={meal ? "plain" : "plain dash"}>
            <div className="ph">
              <span className="pd">
                {day.w} {day.d}. septembra
              </span>
              <Chip st={day.st}>{day.l}</Chip>
            </div>
            {meal ? (
              <>
                <div className="dmeal">
                  <span className={`disc ${meal.tint}`}>
                    <Icon name={meal.ic} />
                  </span>
                  <div>
                    <div className="dn">{meal.n}</div>
                    <div className="dsub">{meal.d}</div>
                  </div>
                </div>
                <div className="mt-5 flex gap-2">
                  <button className="btn soft flex-1">
                    <Icon name="swap_horiz" />
                    Zmeniť
                  </button>
                  <button className="btn soft flex-1">
                    <Icon name="close" />
                    Zrušiť
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="pempty">
                  <b>Objednávka je otvorená</b>
                  Na tento deň si ešte môžete vybrať jedlo. Okno sa zatvára deň vopred o 14:00.
                </p>
                <div className="mt-5">
                  <button className="btn block">
                    <Icon name="add" />
                    Objednať obed
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
