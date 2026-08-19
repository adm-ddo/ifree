"use server";

import { redirect } from "next/navigation";
import { destruirSessaoAtual } from "@/lib/auth";

export async function logout() {
  await destruirSessaoAtual();
  redirect("/login");
}
