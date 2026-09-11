import { redirect } from "next/navigation";

export default function AuthorityRequestsPage() {
  redirect("/authority/dashboard#requests");
}
