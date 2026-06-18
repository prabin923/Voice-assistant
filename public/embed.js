/**
 * StayNEP embed loader — paste on any hotel website.
 *
 * <div id="staynep-assistant"></div>
 * <script src="https://YOUR_APP/embed.js" data-hotel="willow-hotel" data-base="https://YOUR_APP" async></script>
 */
(function () {
  var script = document.currentScript;
  if (!script) return;

  var hotel = script.getAttribute("data-hotel");
  var base = (script.getAttribute("data-base") || "").replace(/\/$/, "");
  var targetId = script.getAttribute("data-target") || "staynep-assistant";
  var height = script.getAttribute("data-height") || "640px";

  if (!hotel || !base) {
    console.warn("[StayNEP] embed.js requires data-hotel and data-base attributes.");
    return;
  }

  var container = document.getElementById(targetId);
  if (!container) {
    console.warn("[StayNEP] embed target not found:", targetId);
    return;
  }

  var iframe = document.createElement("iframe");
  iframe.src = base + "/embed/" + encodeURIComponent(hotel);
  iframe.title = "Hotel voice concierge";
  iframe.allow = "microphone";
  iframe.loading = "lazy";
  iframe.style.width = "100%";
  iframe.style.height = height;
  iframe.style.border = "0";
  iframe.style.borderRadius = "16px";
  iframe.style.background = "transparent";
  container.appendChild(iframe);
})();
