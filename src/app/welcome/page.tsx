import type { Metadata } from "next";

import { WelcomeSteps } from "./welcome-steps";

export const metadata: Metadata = { title: "Welcome" };

/** Shown after the launch screen the first time the app is opened. */
export default function WelcomePage() {
  return <WelcomeSteps />;
}
