import { LaunchSplashTimer } from "./launch-splash-timer";

/** How long the launch screen stays up, counted from when the app was opened. */
export const LAUNCH_SPLASH_MS = 3000;

/**
 * Before first paint, decide whether to show the launch screen: only in the
 * installed app, and once per launch (sessionStorage is cleared when the app
 * is closed, but survives reloads and sign-in redirects).
 */
const decide = `try{var s=navigator.standalone===true||matchMedia("(display-mode: standalone)").matches;if(s&&!sessionStorage.getItem("df-launch-splash")){sessionStorage.setItem("df-launch-splash","1");document.documentElement.classList.add("df-splash")}}catch(e){}`;

/**
 * iOS shows its launch image only until the first page has loaded, which can
 * be a split second. This copy of it takes over seamlessly and holds the brand
 * on screen until {@link LAUNCH_SPLASH_MS} after launch, then fades out.
 * Hidden by CSS unless the script above chose to show it.
 */
export function LaunchSplash() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: decide }} />
      <div
        aria-hidden="true"
        className="launch-splash fixed inset-0 z-[100] flex-col items-center justify-center bg-field-green"
      >
        <svg viewBox="13 4 54 70" className="h-auto w-[20vw]">
          <path
            d="M18 68 L40 22 L62 68"
            fill="none"
            stroke="#ffffff"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M26 51 C32 42 46 41 54 47 C47 57 33 57 26 51 Z"
            fill="#8fd16a"
          />
          <circle cx="40" cy="11" r="6" fill="#f2a900" />
        </svg>
        <p className="mt-[7vw] text-[13vw] leading-none font-bold tracking-[-0.45vw] text-white">
          Akuafo
        </p>
        <p className="mt-[2.5vw] text-[3.4vw] font-medium tracking-[0.9vw] text-white/75">
          FARM TO BUYER · GHANA
        </p>
      </div>
      <LaunchSplashTimer durationMs={LAUNCH_SPLASH_MS} />
    </>
  );
}
