/**
 * iOS 18 bug in the installed app (black-translucent status bar): the page's
 * layout viewport can come up shorter than the screen by about the status
 * bar's height, so bars pinned to the bottom float that far above it, and
 * jump back when iOS corrects itself. This measures the gap as --screen-gap
 * on <html>, and keeps it current; bars use the pin-to-screen utility to move
 * down by it. iOS 26 and browsers measure no gap, so nothing moves there.
 */
const measure = `try{var d=document.documentElement,s=function(){var g=0,st=navigator.standalone||matchMedia("(display-mode: standalone)").matches;if(st&&innerHeight>innerWidth){var x=screen.height-innerHeight;if(x>0&&x<=80)g=x}d.style.setProperty("--screen-gap",g+"px")};s();addEventListener("resize",s);addEventListener("orientationchange",function(){setTimeout(s,300)});addEventListener("pageshow",s);document.addEventListener("visibilitychange",s)}catch(e){}`;

export function ScreenGapScript() {
  return <script dangerouslySetInnerHTML={{ __html: measure }} />;
}
