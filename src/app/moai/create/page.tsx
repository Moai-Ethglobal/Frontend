import Link from "next/link";
import { PublicPage } from "@/components/PublicPage";
import { CreateMoaiForm } from "./CreateMoaiForm";

export default function CreateMoaiPage() {
  return (
    <PublicPage>
      <h1 className="mt-10 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        Create a Moai
      </h1>
      <p className="mt-3 text-pretty text-base leading-7 text-neutral-800">
        Create a small group, invite 5–10 people, and set up monthly
        contributions and meetings.
      </p>

      <CreateMoaiForm />

      <div className="mt-12 border-t border-neutral-200 pt-6">
        <Link
          className="text-sm font-medium text-neutral-900 hover:underline"
          href="/"
        >
          Back to home
        </Link>
      </div>
    </PublicPage>
  );
}
