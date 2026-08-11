import { CalendarDays, CookingPot, MoreHorizontal, Sparkles, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, PageTitle } from "../components/UI";
import { useStore } from "../store";

export function ThisWeek() {
  const s = useStore();
  return (
    <>
      <PageTitle
        eyebrow="Your current plan"
        title="This week, at a glance."
        description="Cook, skip, or change a meal. Reservations and groceries adjust when the plan changes."
        action={<div className="flex flex-wrap gap-2"><Link className="btn-secondary" to="/plan"><CalendarDays size={17}/>Plan another day</Link>{s.meals.some(meal=>meal.status==='planned')&&<Link className="btn-primary" to="/prep"><Sparkles size={17}/>Build Sunday prep</Link>}</div>}
      />
      {s.meals.length === 0 ? (
        <EmptyState
          title="Your week is still open"
          body="Pick meals chronologically and Shua will keep inventory and groceries in step."
          action={
            <Link to="/plan" className="btn-primary">
              Start planning
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {s.meals.map((m) => {
            const recipe = s.recipes.find((r) => r.id === m.recipeId);
            return (
              <article
                key={m.id}
                className="card flex flex-col gap-5 sm:flex-row sm:items-center"
              >
                <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-herb-50 font-display text-2xl text-herb-700">
                  {new Date(m.date + "T12:00").getDate()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">
                    {new Date(m.date + "T12:00").toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    · Dinner
                  </p>
                  <Link
                    to={`/recipes/${m.recipeId}`}
                    className="mt-1 block font-display text-2xl hover:text-herb-700"
                  >
                    {m.title}
                  </Link>
                  <div className="mt-2 flex gap-2">
                    <span className="pill">{m.servings} servings</span>
                    {recipe && (
                      <span className="pill">
                        {recipe.prepMinutes + recipe.cookMinutes} min
                      </span>
                    )}
                    <span
                      className={`pill ${m.status === "completed" ? "bg-herb-100 text-herb-700" : m.status === "skipped" ? "bg-black/5" : ""}`}
                    >
                      {m.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
                {m.status === "planned" && (
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/cook/${m.id}`} className="btn-primary">
                      <CookingPot size={16} />
                      Cook
                    </Link>
                    <button
                      onClick={() => s.setMealStatus(m.id, "skipped")}
                      className="btn-secondary"
                    >
                      <MoreHorizontal size={16} />
                      Skip
                    </button>
                    <button
                      onClick={() => s.removeMeal(m.id)}
                      className="btn-secondary text-red-700"
                      aria-label={`Remove ${m.title}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
