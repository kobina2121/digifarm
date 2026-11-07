/**
 * iOS 18 bug in the installed app (black-translucent status bar): the area
 * that fixed elements are laid out in can come up shorter than the screen by
 * about the status bar's height, so bars pinned to the bottom float that far
 * above it, and jump when iOS corrects itself. This measures the gap as
 * --screen-gap on <html>; bars use the pin-to-screen utility to move down by it.
 *
 * It measures a hidden element pinned to the top and bottom of that area, not
 * window.innerHeight: iOS can report innerHeight short while the page already
 * fills the screen, and trusting it pushed the tab bar off the bottom. A gap
 * only counts when it matches the status bar's height (the bug's signature);
 * anything else leaves the bars where CSS puts them. Re-measured on resize and
 * for a few seconds after opening, since iOS fixes itself without telling us.
 */
const measure = `try{var d=document.documentElement,p=document.createElement("div");p.setAttribute("aria-hidden","true");p.style.cssText="position:fixed;top:0;bottom:0;left:0;width:0;padding-top:env(safe-area-inset-top);visibility:hidden;pointer-events:none";var s=function(){var g=0;if(!p.isConnected&&document.body)document.body.appendChild(p);var st=navigator.standalone||matchMedia("(display-mode: standalone)").matches;if(st&&p.isConnected&&innerWidth<innerHeight){var h=p.getBoundingClientRect().height,t=parseFloat(getComputedStyle(p).paddingTop)||0,x=Math.round(screen.height-h);if(t>0&&x>0&&Math.abs(x-t)<=16)g=x}d.style.setProperty("--screen-gap",g+"px")},l=function(){s();[150,600,1500,3000].forEach(function(t){setTimeout(s,t)})};l();addEventListener("resize",s);window.visualViewport&&visualViewport.addEventListener("resize",s);addEventListener("orientationchange",l);addEventListener("pageshow",l);document.addEventListener("visibilitychange",function(){document.hidden||l()})}catch(e){}`;

export function ScreenGapScript() {
  return <script dangerouslySetInnerHTML={{ __html: measure }} />;
}
