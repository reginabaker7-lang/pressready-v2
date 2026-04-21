import { getUserPlan as getPlanFromSubscription, type PlanName } from "@/app/lib/subscription";

export async function getUserPlan(userId: string): Promise<PlanName> {
  return getPlanFromSubscription(userId);
}
