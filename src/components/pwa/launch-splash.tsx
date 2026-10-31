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
        <svg viewBox="0 0 124 122" className="h-auto w-[26vw]">
          <rect x="104" y="0" width="18" height="18" rx="3" fill="#f2a900" />
          <path d="M2 16 H60 A53 53 0 0 1 60 122 H2 Z" fill="#ffffff" />
          <path
            d="M22 104 C22 68 46 46 86 44 C84 82 60 104 22 104 Z"
            fill="#17663a"
          />
          <line
            x1="30"
            y1="96"
            x2="72"
            y2="58"
            stroke="#ffffff"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </svg>
        <p className="mt-[7vw] text-[13vw] leading-none font-bold tracking-[-0.45vw] text-white">
          Digi<span className="text-sprout">Farm</span>
        </p>
        <p className="mt-[2.5vw] text-[3.4vw] font-medium tracking-[0.9vw] text-white/75">
          FARM TO BUYER · GHANA
        </p>
      </div>
      <LaunchSplashTimer durationMs={LAUNCH_SPLASH_MS} />
    </>
  );
}
