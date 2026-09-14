import { PageHead } from "@/shared/components/PageHead";
import { Icon } from "@/shared/components/Icon";
import { Chip } from "@/shared/components/Chip";
import { ORDERS } from "@/shared/lib/data";

export default function OrdersPage() {
  const count = ORDERS.reduce((s, g) => s + g.rows.length, 0);

  return (
    <>
      <PageHead
        title="Moje objednávky"
        sub={`${count} záznamov`}
        actions={
          <button className="iconbtn" aria-label="Stiahnuť prehľad">
            <Icon name="download" />
          </button>
        }
      />

      <div className="max-w-[980px]">
        {ORDERS.map((g) => (
          <section key={g.group} className="mb-8">
            <div className="gl">{g.group}</div>
            <div className="flex flex-col gap-3">
              {g.rows.map((o) => (
                <div key={`${o.w}${o.d}`} className="orow">
                  <span className="od">
                    <span className="ow">{o.w}</span>
                    <span className="on">{o.d}</span>
                  </span>
                  <span className="oi">
                    <span className="om">{o.meal}</span>
                    <span className="os">{o.sub}</span>
                  </span>
                  <Chip st={o.st}>{o.l}</Chip>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
