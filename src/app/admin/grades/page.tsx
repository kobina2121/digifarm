import type { Metadata } from "next";

import { GradeBadge } from "@/components/market/listing-bits";
import { can } from "@/lib/authz";
import { listGrades } from "@/modules/catalog";

import { requireStaff } from "../guard";
import { GradeForm } from "./grade-form";

export const metadata: Metadata = { title: "Grades" };

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function GradesPage() {
  const actor = await requireStaff();
  const categories = await listGrades(actor);
  const canEdit = can(actor, "grade.manage");

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">Grades</h1>
        <p className="mt-1 text-muted-foreground">
          What Akuafo’s A, B and C grades mean for each category. Buyers see
          this wording on every graded listing.
          {canEdit ? "" : " Only admins can change it."}
        </p>
      </div>
      {categories.map((category) => (
        <section key={category.id} className="grid gap-3">
          <h2 className="text-xl font-bold">{category.name}</h2>
          <ul className="grid gap-3 lg:grid-cols-3">
            {category.grades.map((grade) => (
              <li
                key={grade.id}
                className="grid content-start gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <GradeBadge grade={{ code: grade.code, title: grade.title }} />
                {canEdit ? (
                  <GradeForm
                    gradeId={grade.id}
                    defaults={{
                      title: grade.title,
                      description: grade.description,
                    }}
                  />
                ) : (
                  <p className="text-sm">{grade.description}</p>
                )}
                {grade.updatedBy ? (
                  <p className="text-xs text-muted-foreground">
                    Last changed by {grade.updatedBy.name} on{" "}
                    {dateFormat.format(grade.updatedAt)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
