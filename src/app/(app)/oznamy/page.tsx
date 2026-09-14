import { PageHead } from "@/shared/components/PageHead";
import { Icon } from "@/shared/components/Icon";
import { Chip } from "@/shared/components/Chip";
import { POSTS } from "@/shared/lib/data";

export default function PostsPage() {
  return (
    <>
      <PageHead
        title="Oznamy"
        sub="Školská jedáleň"
        actions={
          <button className="iconbtn" aria-label="Označiť prečítané">
            <Icon name="mark_email_read" />
          </button>
        }
      />

      <div className="flex flex-col gap-4 max-w-[900px]">
        {POSTS.map((p) => (
          <article key={p.t} className={p.imp ? "post imp" : "post"}>
            {p.imp ? <Chip st="imp">Dôležité</Chip> : null}
            <h3 className="pt">{p.t}</h3>
            <p className="pb">{p.b}</p>
            <div className="pm">{p.m}</div>
          </article>
        ))}
      </div>
    </>
  );
}
