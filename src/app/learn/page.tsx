import Link from "next/link";
import { PublicPage } from "@/components/PublicPage";

export default function LearnPage() {
  return (
    <PublicPage>
      <h1 className="mt-10 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        What is a Moai?
      </h1>
      <p className="mt-4 text-pretty text-base leading-7 text-neutral-800">
        A moai is a group of individuals who trust each other and share lifelong
        bonds that helps them feel connected, battling loneliness and financial
        hardships throughout their old age.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">Origins</h2>
      <p className="mt-3 text-base leading-7 text-neutral-800">
        The concept has been in practice for decades in Okinawa, Japan,
        contributing to the longevity of people in the region. A variation of
        this can also be found in the villages of Tamil Nadu known as
        &apos;Magalir Suya Udhavi Kulu&apos; (Women self help group).
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">
        How it works
      </h2>
      <ul className="mt-4 list-disc space-y-3 pl-5 text-base leading-7 text-neutral-800">
        <li>
          Anyone can create a group (called a moai) and send invites over email
          or share a link to join.
        </li>
        <li>
          A member can join via an invite link. Each member can only be part of
          one group.
        </li>
        <li>Each moai has a maximum of 5 to 10 members.</li>
        <li>An ENS name is created for every moai.</li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">
        Monthly contributions
      </h2>
      <ul className="mt-4 list-disc space-y-3 pl-5 text-base leading-7 text-neutral-800">
        <li>Every month, each member pays a fixed amount before a set date.</li>
        <li>
          Missed payments can be made within the same calendar month due to
          unforeseen circumstances and are added to the following month&apos;s
          pool.
        </li>
        <li>Members can view past transactions in My History.</li>
        <li>
          Consistent savings can be invested each month into a low-risk, easily
          liquidifiable yield strategy.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">Meetings</h2>
      <p className="mt-3 text-base leading-7 text-neutral-800">
        A calendar invite is created every month to meet on Huddle at the same
        time. Only members of the moai are invited, and the system enforces
        participation of all members. This continuous communication creates a
        sense of community and builds relationships over decades.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">Safety net</h2>
      <p className="mt-3 text-base leading-7 text-neutral-800">
        When a member has an emergency situation, they can raise a request with
        the amount they need (or anyone on their behalf). At least 51% of the
        members need to approve for it to pass through, and the amount is sent
        to the beneficiary.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">
        Rotation (when no emergencies)
      </h2>
      <p className="mt-3 text-base leading-7 text-neutral-800">
        If no one has raised an emergency request in the previous cycle (each
        cycle is 6 months), a member is chosen to receive the pool based on
        mutual understanding and need. The goal is for everyone to eventually
        receive the pot before the cycle repeats, excluding emergency
        withdrawals.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">
        USDC on Arc
      </h2>
      <p className="mt-3 text-base leading-7 text-neutral-800">
        The currency used is USDC, on Arc.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">
        Why onchain
      </h2>
      <p className="mt-3 text-base leading-7 text-neutral-800">
        While this concept has been live with cash and in-person meetings, a
        decentralized moai helps sustain money and resolve geographic dispersion
        for reasons like jobs and studies. This is solved with Huddle.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">
        Leaving and demise
      </h2>
      <ul className="mt-4 list-disc space-y-3 pl-5 text-base leading-7 text-neutral-800">
        <li>
          A member can leave the moai but will not seek any benefits on doing
          so.
        </li>
        <li>
          When a member passes away, any member can submit a register demise
          request. Upon approval of at least 2 members, the demised member will
          be removed from the moai.
        </li>
      </ul>

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
