/** Where the chosen theme is kept on this device: "light", "dark" or "system". */
export const THEME_STORAGE_KEY = "df-theme";

/**
 * Runs before first paint so the page never flashes the wrong theme. With
 * "system" (the default) it follows the phone's setting, live.
 */
const apply = `try{var k="${THEME_STORAGE_KEY}",m=matchMedia("(prefers-color-scheme: dark)"),a=function(){var t=localStorage.getItem(k)||"system";document.documentElement.classList.toggle("dark",t==="dark"||(t==="system"&&m.matches))};a();m.addEventListener("change",a);window.addEventListener("df-theme",a)}catch(e){}`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: apply }} />;
}
