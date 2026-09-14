import { Icon } from "@/shared/components/Icon";
import type { Meal } from "@/shared/lib/data";

/* Exactly the Overview-card anatomy from the product: category label,
   white icon disc, bold title, description, tinted divider, footer row. */
export function MealCard({
  meal,
  index,
  selected,
  onSelect,
}: {
  meal: Meal;
  index: number;
  selected: boolean;
  onSelect: (i: number) => void;
}) {
  return (
    <button
      type="button"
      className={`mcard ${meal.tint}`}
      aria-pressed={selected}
      onClick={() => onSelect(index)}
    >
      <span className="cat">{meal.cat}</span>
      <span className="disc">
        <Icon name={selected ? "check" : meal.ic} />
      </span>
      <span className="mn">{meal.n}</span>
      <span className="md">{meal.d}</span>
      <span className="rule" />
      <span className="mf">
        {meal.a.map((t) =>
          t === "veg" ? (
            <span key={t} className="tag veg">
              Vegetariánske
            </span>
          ) : (
            <span key={t} className="tag">
              Alergény {t}
            </span>
          ),
        )}
        <span className="no">Obed {index + 1}</span>
      </span>
    </button>
  );
}
