import { PublicPage } from "@/components/PublicPage";
import { DepositClient } from "./DepositClient";

export default function DepositPage() {
  return (
    <PublicPage>
      <h1 className="mt-12 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        Deposit
      </h1>
      <DepositClient />
    </PublicPage>
  );
}
