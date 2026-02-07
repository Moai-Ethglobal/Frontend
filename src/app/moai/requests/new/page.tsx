import Link from "next/link";
import { PublicPage } from "@/components/PublicPage";
import { CreateRequestForm } from "./CreateRequestForm";

export default function CreateRequestPage() {
  return (
    <PublicPage>
      <h1 className="mt-12 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        Create request
      </h1>
      <p className="mt-3 text-pretty text-base leading-7 text-neutral-800">
        Create an emergency withdrawal or a contribution change request.
      </p>
      <CreateRequestForm />

      <div className="mt-12 border-t border-neutral-200 pt-6">
        <Link
          className="text-sm font-medium text-neutral-900 hover:underline"
          href="/moai/requests"
        >
          Back to requests
        </Link>
      </div>
    </PublicPage>
  );
}
