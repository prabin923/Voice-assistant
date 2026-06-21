/**
 * StayNep floating voice concierge widget.
 *
 * Usage — paste before </body> on any hotel website:
 *   <script src="https://YOUR_APP/widget.js"
 *     data-hotel="your-hotel-slug"
 *     data-base="https://YOUR_APP"
 *     data-color="#c9a227"
 *     data-position="bottom-right"
 *     async></script>
 */
(function () {
  var script =
    document.currentScript ||
    (function () {
      var s = document.getElementsByTagName("script");
      return s[s.length - 1];
    })();

  var hotel    = script.getAttribute("data-hotel");
  var base     = (script.getAttribute("data-base") || "").replace(/\/$/, "");
  var color    = script.getAttribute("data-color") || "#c9a227";
  var position = script.getAttribute("data-position") || "bottom-right";
  var label    = script.getAttribute("data-label") || "Chat with us";

  if (!hotel || !base) {
    console.warn("[StayNep] widget.js requires data-hotel and data-base attributes.");
    return;
  }

  var embedUrl = base + "/embed/" + encodeURIComponent(hotel);
  var isOpen = false;
  var iframeLoaded = false;

  /* ── Helpers ── */
  function hexToRgb(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return r + "," + g + "," + b;
  }

  var isLeft = position === "bottom-left";
  var side   = isLeft ? "left" : "right";

  /* ── Styles ── */
  var css = "\
    #sn-widget-btn {\
      position: fixed;\
      bottom: 24px;\
      " + side + ": 24px;\
      width: 60px;\
      height: 60px;\
      border-radius: 50%;\
      background: " + color + ";\
      border: none;\
      cursor: pointer;\
      box-shadow: 0 4px 20px rgba(" + hexToRgb(color) + ",0.45), 0 2px 8px rgba(0,0,0,0.2);\
      z-index: 2147483640;\
      display: flex;\
      align-items: center;\
      justify-content: center;\
      transition: transform 0.18s ease, box-shadow 0.18s ease;\
      padding: 0;\
    }\
    #sn-widget-btn:hover {\
      transform: scale(1.07);\
      box-shadow: 0 6px 28px rgba(" + hexToRgb(color) + ",0.55), 0 2px 10px rgba(0,0,0,0.25);\
    }\
    #sn-widget-btn:active { transform: scale(0.96); }\
    #sn-widget-btn svg { width: 26px; height: 26px; display: block; }\
    #sn-widget-pulse {\
      position: fixed;\
      bottom: 24px;\
      " + side + ": 24px;\
      width: 60px;\
      height: 60px;\
      border-radius: 50%;\
      background: " + color + ";\
      opacity: 0;\
      z-index: 2147483639;\
      animation: sn-pulse 2.4s ease-out infinite;\
      pointer-events: none;\
    }\
    @keyframes sn-pulse {\
      0%   { transform: scale(1);   opacity: 0.55; }\
      60%  { transform: scale(1.7); opacity: 0; }\
      100% { transform: scale(1.7); opacity: 0; }\
    }\
    #sn-widget-tooltip {\
      position: fixed;\
      bottom: 32px;\
      " + (isLeft ? "left: 92px" : "right: 92px") + ";\
      background: #1a1a2e;\
      color: #f5f0e8;\
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;\
      font-size: 13px;\
      font-weight: 500;\
      white-space: nowrap;\
      padding: 8px 12px;\
      border-radius: 8px;\
      box-shadow: 0 2px 12px rgba(0,0,0,0.3);\
      z-index: 2147483641;\
      opacity: 0;\
      pointer-events: none;\
      transform: translateX(" + (isLeft ? "-4px" : "4px") + ");\
      transition: opacity 0.15s, transform 0.15s;\
    }\
    #sn-widget-tooltip::after {\
      content: '';\
      position: absolute;\
      top: 50%;\
      " + (isLeft ? "left: -5px" : "right: -5px") + ";\
      transform: translateY(-50%);\
      border: 5px solid transparent;\
      " + (isLeft ? "border-right-color: #1a1a2e" : "border-left-color: #1a1a2e") + ";\
    }\
    #sn-widget-btn:hover ~ #sn-widget-tooltip,\
    #sn-widget-tooltip.sn-show {\
      opacity: 1;\
      transform: translateX(0);\
    }\
    #sn-widget-panel {\
      position: fixed;\
      bottom: 96px;\
      " + side + ": 20px;\
      width: 390px;\
      height: 640px;\
      max-height: calc(100vh - 120px);\
      border-radius: 20px;\
      overflow: hidden;\
      box-shadow: 0 12px 48px rgba(0,0,0,0.4), 0 2px 12px rgba(0,0,0,0.2);\
      z-index: 2147483641;\
      transform-origin: " + (isLeft ? "left" : "right") + " bottom;\
      transform: scale(0.92) translateY(12px);\
      opacity: 0;\
      pointer-events: none;\
      transition: transform 0.28s cubic-bezier(0.34,1.45,0.64,1), opacity 0.2s ease;\
      background: #0d0d14;\
    }\
    #sn-widget-panel.sn-open {\
      transform: scale(1) translateY(0);\
      opacity: 1;\
      pointer-events: all;\
    }\
    #sn-widget-panel iframe {\
      width: 100%;\
      height: 100%;\
      border: 0;\
      display: block;\
    }\
    #sn-widget-panel-close {\
      position: absolute;\
      top: 10px;\
      right: 10px;\
      width: 28px;\
      height: 28px;\
      border-radius: 50%;\
      background: rgba(255,255,255,0.12);\
      border: none;\
      cursor: pointer;\
      display: flex;\
      align-items: center;\
      justify-content: center;\
      z-index: 1;\
      transition: background 0.15s;\
      padding: 0;\
    }\
    #sn-widget-panel-close:hover { background: rgba(255,255,255,0.2); }\
    #sn-widget-panel-close svg { width: 14px; height: 14px; display: block; }\
    @media (max-width: 500px) {\
      #sn-widget-panel {\
        bottom: 0;\
        " + side + ": 0;\
        width: 100%;\
        height: 100%;\
        max-height: 100%;\
        border-radius: 0;\
        transform-origin: bottom;\
      }\
      #sn-widget-btn { bottom: 20px; " + side + ": 16px; }\
      #sn-widget-pulse { bottom: 20px; " + side + ": 16px; }\
      #sn-widget-tooltip { display: none; }\
    }\
  ";

  var styleEl = document.createElement("style");
  styleEl.textContent = css;
  (document.head || document.documentElement).appendChild(styleEl);

  /* ── SVG icons ── */
  var MIC_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="9" y="1" width="6" height="13" rx="3"/>' +
    '<path d="M19 10v2a7 7 0 0 1-14 0v-2"/>' +
    '<line x1="12" y1="19" x2="12" y2="23"/>' +
    '<line x1="8" y1="23" x2="16" y2="23"/>' +
    "</svg>";

  var CLOSE_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">' +
    '<line x1="18" y1="6" x2="6" y2="18"/>' +
    '<line x1="6" y1="6" x2="18" y2="18"/>' +
    "</svg>";

  /* ── DOM elements ── */
  var pulse = document.createElement("div");
  pulse.id = "sn-widget-pulse";

  var btn = document.createElement("button");
  btn.id = "sn-widget-btn";
  btn.setAttribute("aria-label", label);
  btn.setAttribute("aria-expanded", "false");
  btn.innerHTML = MIC_ICON;

  var tooltip = document.createElement("div");
  tooltip.id = "sn-widget-tooltip";
  tooltip.textContent = label;

  var panel = document.createElement("div");
  panel.id = "sn-widget-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Hotel AI concierge");

  var closeBtn = document.createElement("button");
  closeBtn.id = "sn-widget-panel-close";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.innerHTML = CLOSE_ICON;
  panel.appendChild(closeBtn);

  document.body.appendChild(pulse);
  document.body.appendChild(btn);
  document.body.appendChild(tooltip);
  document.body.appendChild(panel);

  /* ── Lazy-load iframe on first open ── */
  function ensureIframe() {
    if (iframeLoaded) return;
    iframeLoaded = true;
    var iframe = document.createElement("iframe");
    iframe.src = embedUrl;
    iframe.title = "Hotel AI concierge";
    iframe.allow = "microphone";
    panel.appendChild(iframe);
  }

  /* ── Open / close ── */
  function open() {
    isOpen = true;
    ensureIframe();
    panel.classList.add("sn-open");
    btn.innerHTML = CLOSE_ICON;
    btn.setAttribute("aria-label", "Close concierge");
    btn.setAttribute("aria-expanded", "true");
    pulse.style.animationPlayState = "paused";
    tooltip.classList.remove("sn-show");
  }

  function close() {
    isOpen = false;
    panel.classList.remove("sn-open");
    btn.innerHTML = MIC_ICON;
    btn.setAttribute("aria-label", label);
    btn.setAttribute("aria-expanded", "false");
    pulse.style.animationPlayState = "running";
  }

  btn.addEventListener("click", function () {
    if (isOpen) close(); else open();
  });
  closeBtn.addEventListener("click", close);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) close();
  });

  /* ── Tooltip show on hover ── */
  btn.addEventListener("mouseenter", function () { tooltip.classList.add("sn-show"); });
  btn.addEventListener("mouseleave", function () { tooltip.classList.remove("sn-show"); });

  /* ── Pause pulse after first open ── */
  setTimeout(function () {
    if (!isOpen) pulse.style.animationIterationCount = "3";
  }, 8000);
})();
