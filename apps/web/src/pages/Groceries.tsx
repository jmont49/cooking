import { Check, CircleDollarSign, ShoppingBag, Store } from "lucide-react";
import { budgetSummary } from "@mise/domain";
import { EmptyState, PageTitle } from "../components/UI";
import { useStore } from "../store";

export function Groceries() {
  const s = useStore();
  const checkout = s.grocery.reduce(
    (n, g) => n + Math.max(1, Number(g.quantity) * 1.25),
    0,
  );
  const budget = budgetSummary(s.monthlySpent, checkout.toFixed(2), "240");
  const checked = s.grocery.filter((g) =>
    s.groceryChecked.includes(`${g.ingredientId}:${g.unit}`),
  );
  return (
    <>
      <PageTitle
        eyebrow="Consolidated from your plan"
        title="One calm grocery list."
        description="Projected kitchen quantities are subtracted first. Compatible needs are merged without making unsafe package assumptions."
        action={
          <button
            disabled={checked.length === 0}
            onClick={() => s.purchaseGroceries()}
            className="btn-primary"
          >
            <ShoppingBag size={17} />
            Add purchased to kitchen
          </button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
        <section className="card">
          {s.grocery.length === 0 ? (
            <EmptyState
              title="Nothing to buy yet"
              body="Plan a few meals and only the ingredients you’re short on will appear here."
            />
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-black/5 pb-4">
                <h2 className="text-2xl">Produce & pantry</h2>
                <span className="pill">
                  {checked.length}/{s.grocery.length} checked
                </span>
              </div>
              <ul>
                {s.grocery.map((g) => {
                  const key = `${g.ingredientId}:${g.unit}`,
                    done = s.groceryChecked.includes(key);
                  return (
                    <li
                      key={key}
                      className="flex items-center gap-4 border-b border-black/5 py-4 last:border-0"
                    >
                      <button
                        onClick={() => s.toggleGrocery(key)}
                        aria-label={`${done ? "Uncheck" : "Check"} ${g.name}`}
                        className={`grid size-6 place-items-center rounded-lg border ${done ? "border-herb-600 bg-herb-600 text-white" : "border-black/20"}`}
                      >
                        {done && <Check size={15} />}
                      </button>
                      <div
                        className={`flex-1 ${done ? "line-through opacity-45" : ""}`}
                      >
                        <p className="font-semibold">{g.name}</p>
                        <p className="text-xs text-ink/45">
                          Used in {g.recipeIds.length}{" "}
                          {g.recipeIds.length === 1 ? "meal" : "meals"}
                        </p>
                      </div>
                      <span className="font-semibold">
                        {Number(g.quantity).toFixed(2).replace(/\.00$/, "")}{" "}
                        {g.unit}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
        <aside className="space-y-5">
          <div className="card bg-herb-700 text-white">
            <CircleDollarSign className="text-gold" />
            <p className="mt-5 text-sm text-white/60">Expected checkout</p>
            <p className="font-display text-5xl">${checkout.toFixed(2)}</p>
            <div className="mt-5 border-t border-white/15 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">Consumed this week</span>
                <span>${(checkout * 0.72).toFixed(2)}</span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-white/60">Budget remaining</span>
                <span>${budget.remaining}</span>
              </div>
            </div>
          </div>
          <div className="card">
            <Store className="text-herb-600" />
            <h3 className="mt-4 text-xl">Why checkout costs more</h3>
            <p className="mt-2 text-sm leading-6 text-ink/55">
              Bulk and package purchases carry value into future weeks. Shua
              shows consumed value separately so one bottle of soy sauce does
              not distort meal cost.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
