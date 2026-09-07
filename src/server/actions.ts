"use server";

import { headers } from "next/headers";
import { createLead, type LeadInput } from "@/lib/leads";
import { clientIp } from "@/server/rate-limit";

export async function submitLead(input: LeadInput) {
  const hdrs = await headers();
  return createLead(input, clientIp(hdrs));
}
