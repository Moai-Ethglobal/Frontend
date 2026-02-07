import { PublicPage } from "@/components/PublicPage";
import { DemiseClient } from "./DemiseClient";

export default function DemisePage() {
  return (
    <PublicPage>
      <h1 className="mt-12 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        Demise / AWOL
      </h1>
      <DemiseClient />
    </PublicPage>
  );
}
