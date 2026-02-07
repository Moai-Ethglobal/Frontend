import { PublicPage } from "@/components/PublicPage";
import { MyMoaiClient } from "./MyMoaiClient";

export default function MyMoaiPage() {
  return (
    <PublicPage>
      <h1 className="mt-12 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        My Moai
      </h1>
      <MyMoaiClient />
    </PublicPage>
  );
}
