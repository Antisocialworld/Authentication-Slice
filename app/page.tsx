import { redirect } from "next/navigation";

// PRD-001 has no landing page. `/` sends you to the only entry point that
// exists so far.
export default function Home() {
  redirect("/signup");
}