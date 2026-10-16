(() => {
  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
  // GA4 custom events; no names, phone numbers, or other personal data are sent.
  const trackEvent = (eventName, params={}) => {
    if (typeof window.gtag === "function") window.gtag("event", eventName, params);
  };
  // Track key invitation interactions in addition to GA4 enhanced measurement.
  document.addEventListener("click", event => {
    const target = event.target.closest("a, button");
    if (!target) return;
    if (target.id === "openInvitation") trackEvent("open_invitation", {event_category:"engagement"});
    if (target.id === "musicToggle") trackEvent("music_toggle", {event_category:"engagement"});
    if (target.id === "calendarLink") trackEvent("add_to_calendar", {event_category:"engagement"});
    if (target.id === "shareButton") trackEvent("share_invitation", {event_category:"sharing", method:"share_button"});
    if (target.id === "galleryToggleAll") trackEvent("gallery_view_all", {event_category:"gallery"});
    if (target.closest(".promo-cta-primary") || (target.tagName === "A" && /wa\.me\//i.test(target.href))) {
      trackEvent("whatsapp_contact_click", {event_category:"contact", link_url:target.href});
    }
    if (target.closest(".promo-cta-secondary") || (target.tagName === "A" && /^mailto:/i.test(target.href))) {
      trackEvent("email_contact_click", {event_category:"contact"});
    }
    if (target.id === "galleryMainButton" || target.closest(".gallery-thumb, .gallery-mosaic-item")) {
      trackEvent("gallery_photo_open", {event_category:"gallery"});
    }
  });
  const intro = $("#intro");
  const openBtn = $("#openInvitation");
  openBtn.addEventListener("click", () => {
    document.body.classList.add("body-open");
    document.body.classList.remove("pre-open");
    window.setTimeout(() => { if (intro) intro.style.display = "none"; }, 1800);
  });

  // Mobile navigation: compact dropdown, closes after choosing a destination.
  const menuToggle = $("#mobileMenuToggle");
  const mobileNav = $("#mobileNav");
  if (menuToggle && mobileNav) {
    const closeMenu = () => {
      mobileNav.hidden = true;
      menuToggle.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation menu");
    };
    menuToggle.addEventListener("click", () => {
      const open = mobileNav.hidden;
      mobileNav.hidden = !open;
      menuToggle.classList.toggle("is-open", open);
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
    });
    $$("a", mobileNav).forEach(link => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", event => { if (event.key === "Escape") closeMenu(); });
  }

  // Smooth reveal on scroll.
  const revealItems = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -25px 0px" });
    revealItems.forEach(el => observer.observe(el));
  } else revealItems.forEach(el => el.classList.add("is-visible"));

  // Existing background music retained; browser playback begins only after a user gesture.
  const music = $("#weddingMusic");
  const musicToggle = $("#musicToggle");
  musicToggle.addEventListener("click", async () => {
    try {
      if (music.paused) {
        await music.play();
        musicToggle.classList.add("playing");
        $(".music-label", musicToggle).textContent = "Music on";
        musicToggle.setAttribute("aria-label", "Pause background music");
      } else {
        music.pause();
        musicToggle.classList.remove("playing");
        $(".music-label", musicToggle).textContent = "Music off";
        musicToggle.setAttribute("aria-label", "Play background music");
      }
    } catch (_) {
      showToast("Music could not load. Please check your internet connection.");
    }
  });

  // Countdown targets the Nikah ceremony in local time (India time for this invitation).
  const target = new Date("2026-10-23T19:00:00+05:30").getTime();
  function updateCountdown() {
    let remaining = Math.max(0, target - Date.now());
    const days = Math.floor(remaining / 86400000); remaining %= 86400000;
    const hours = Math.floor(remaining / 3600000); remaining %= 3600000;
    const minutes = Math.floor(remaining / 60000); remaining %= 60000;
    const seconds = Math.floor(remaining / 1000);
    $("#days").textContent = String(days).padStart(2, "0");
    $("#hours").textContent = String(hours).padStart(2, "0");
    $("#minutes").textContent = String(minutes).padStart(2, "0");
    $("#seconds").textContent = String(seconds).padStart(2, "0");
    if (Date.now() >= target) {
      const label = $(".countdown-label");
      if (label) label.textContent = "THE NIKAH DAY HAS ARRIVED — ALHAMDULILLAH";
    }
  }
  updateCountdown();
  window.setInterval(updateCountdown, 1000);

  // Generate calendar event file with the original dates and venues.
  const ics = [
    "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Wedding Invitation//Wazid Ali and Jeenat Parveen//EN","CALSCALE:GREGORIAN",
    "BEGIN:VEVENT","UID:wazid-jeenat-nikah-20261023@example.local","DTSTAMP:20260101T000000Z","DTSTART:20261023T133000Z","DTEND:20261023T150000Z","SUMMARY:Nikah - Wazid Ali and Jeenat Parveen","LOCATION:Garer Block, Bhaluani, District Deoria, Uttar Pradesh","DESCRIPTION:Nikah ceremony at 7:00 PM India time.","END:VEVENT",
    "BEGIN:VEVENT","UID:wazid-jeenat-walima-20261025@example.local","DTSTAMP:20260101T000000Z","DTSTART:20261025T123000Z","DTEND:20261025T153000Z","SUMMARY:Dawat-e-Walima - Wazid Ali and Jeenat Parveen","LOCATION:R.P. Marriage Hall, Bhore Road near petrol pump, Kateya, Gopalganj, Bihar","DESCRIPTION:Dawat-e-Walima at 6:00 PM India time.","END:VEVENT","END:VCALENDAR"
  ].join("\r\n");
  const calendarLink = $("#calendarLink");
  calendarLink.href = URL.createObjectURL(new Blob([ics], {type:"text/calendar;charset=utf-8"}));

  // Interactive scratch card: canvas foil clears as user scratches with mouse or finger.
  const canvas = $("#scratchCanvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const scratchInstruction = $("#scratchInstruction");
  let drawing = false, scratched = false, lastPoint = null, revealTriggered = false;

  // Celebration confetti launches once per successful scratch-card reveal.
  function launchRevealConfetti() {
    const layer = document.createElement("div");
    layer.className = "confetti-burst";
    layer.setAttribute("aria-hidden", "true");
    const palette = ["#f2d28f", "#d84c64", "#f18a48", "#70b77e", "#52a6d8", "#b58ce0", "#fff0d1", "#ef9eae"];
    const count = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : (window.innerWidth < 640 ? 46 : 76);
    for (let i = 0; i < count; i++) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.backgroundColor = palette[Math.floor(Math.random() * palette.length)];
      piece.style.setProperty("--fall-duration", `${3.1 + Math.random() * 2.1}s`);
      piece.style.setProperty("--fall-delay", `${Math.random() * 0.65}s`);
      piece.style.setProperty("--drift", `${Math.round((Math.random() - 0.5) * 220)}px`);
      piece.style.setProperty("--spin", `${Math.round(360 + Math.random() * 1080)}deg`);
      piece.style.setProperty("--piece-width", `${5 + Math.random() * 7}px`);
      piece.style.setProperty("--piece-height", `${8 + Math.random() * 10}px`);
      if (Math.random() > 0.76) piece.classList.add("confetti-round");
      layer.appendChild(piece);
    }
    if (count) document.body.appendChild(layer);
    window.setTimeout(() => layer.remove(), 6200);
  }
  function drawFoil() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width, h = rect.height;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#a7793e"); grad.addColorStop(.18, "#d9b875"); grad.addColorStop(.36, "#f0d99e");
    grad.addColorStop(.55, "#a97b42"); grad.addColorStop(.72, "#e6ca87"); grad.addColorStop(1, "#79502f");
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = grad; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle = "rgba(255,239,190,.21)"; ctx.lineWidth = 1;
    for (let x=-h; x<w+h; x+=13) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x+h,h); ctx.stroke(); }
    ctx.fillStyle = "#3b1a22"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "600 12px Montserrat, sans-serif"; ctx.fillText("SCRATCH TO REVEAL", w/2, h/2-22);
    ctx.font = "32px Georgia, serif"; ctx.fillText("✧  ♡  ✧", w/2, h/2+12);
    ctx.font = "11px Montserrat, sans-serif"; ctx.fillText("A SPECIAL INVITATION", w/2, h/2+42);
    ctx.globalCompositeOperation = "destination-out";
    scratched = false; revealTriggered = false; scratchInstruction.style.display = "block"; canvas.style.opacity = "1";
  }
  function pointFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches && event.touches[0];
    return {x:(touch ? touch.clientX : event.clientX)-rect.left, y:(touch ? touch.clientY : event.clientY)-rect.top};
  }
  function scratchStart(event) {
    if (revealTriggered) return;
    drawing = true; lastPoint = pointFromEvent(event);
    try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
    scratchLine(lastPoint,lastPoint); event.preventDefault();
  }
  function scratchMove(event) {
    if (!drawing) return;
    const p = pointFromEvent(event); scratchLine(lastPoint,p); lastPoint = p;
    if (!scratched) { scratched = true; scratchInstruction.style.display = "none"; }
    if (Math.random() > .6) checkScratchProgress();
    event.preventDefault();
  }
  function scratchEnd() { drawing = false; lastPoint = null; checkScratchProgress(); }
  function scratchLine(a,b) {
    ctx.save(); ctx.globalCompositeOperation = "destination-out"; ctx.lineWidth = Math.max(28, canvas.clientWidth * .085); ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); ctx.restore();
  }
  function checkScratchProgress() {
    try {
      const w = canvas.width, h = canvas.height;
      const pixels = ctx.getImageData(0,0,w,h).data;
      let transparent = 0, step = 24;
      for (let i=3;i<pixels.length;i+=4*step) if (pixels[i] < 20) transparent++;
      if (transparent / (pixels.length / (4*step)) > .38 && !revealTriggered) {
        revealTriggered = true;
        trackEvent("scratch_card_revealed", {event_category:"engagement"});
        drawing = false;
        canvas.style.opacity = "0";
        canvas.style.pointerEvents = "none";
        scratchInstruction.style.display = "none";
        launchRevealConfetti();
        window.setTimeout(() => showToast("Invitation revealed — You're Invited!"), 450);
      }
    } catch (_) {}
  }
  canvas.addEventListener("pointerdown", scratchStart);
  canvas.addEventListener("pointermove", scratchMove);
  window.addEventListener("pointerup", scratchEnd);
  canvas.addEventListener("pointerleave", scratchEnd);
  $("#scratchReset").addEventListener("click", () => { canvas.style.pointerEvents = "auto"; drawFoil(); });
  if ("ResizeObserver" in window) new ResizeObserver(() => { if (canvas.style.pointerEvents !== "none") drawFoil(); }).observe(canvas.parentElement);
  else window.addEventListener("resize", () => { if (canvas.style.pointerEvents !== "none") drawFoil(); });
  window.setTimeout(drawFoil, 60);

  // Photo gallery: feature carousel, live category filters, mosaic grid and accessible lightbox.
  const lightbox = $("#lightbox"), lightboxImage = $("#lightboxImage");
  const galleryMainButton = $("#galleryMainButton"), galleryMainImage = $("#galleryMainImage");
  const galleryCaption = $("#galleryCaption"), galleryCount = $("#galleryCount");
  const galleryThumbnails = $("#galleryThumbnails");
  const galleryThumbs = galleryThumbnails ? $$(".gallery-thumb", galleryThumbnails) : [];
  const galleryGrid = $("#galleryGrid"), galleryGridItems = galleryGrid ? $$('[data-gallery-item]', galleryGrid) : [];
  const galleryFilterButtons = $$("[data-gallery-filter]");
  const viewAllButton = $("#galleryToggleAll"), viewAllText = $("#galleryToggleText");
  const lightboxCaption = $("#lightboxCaption"), lightboxCount = $("#lightboxCount");
  let galleryIndex = 0;
  let activeGalleryFilter = "all";

  const visibleGalleryThumbs = () => galleryThumbs.filter(button => !button.hidden);
  const currentGalleryThumb = () => visibleGalleryThumbs()[galleryIndex] || galleryThumbs[0];
  function formatGalleryCount(index, total) {
    return `${String(Math.max(0, index) + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
  }
  function updateLightboxContent() {
    if (!lightbox || lightbox.hidden) return;
    const selected = currentGalleryThumb();
    if (!selected) return;
    lightboxImage.src = selected.dataset.image;
    lightboxImage.alt = selected.getAttribute("aria-label") || selected.dataset.caption || "Wedding photograph";
    lightboxImage.style.objectPosition = selected.dataset.position || "50% 35%";
    if (lightboxCaption) lightboxCaption.textContent = selected.dataset.caption || "Wedding memory";
    if (lightboxCount) lightboxCount.textContent = formatGalleryCount(galleryIndex, visibleGalleryThumbs().length);
  }
  function setGalleryImage(index) {
    const visible = visibleGalleryThumbs();
    if (!visible.length) return;
    galleryIndex = ((index % visible.length) + visible.length) % visible.length;
    const selected = visible[galleryIndex];
    galleryMainImage.style.opacity = "0.25";
    const nextImage = new Image();
    nextImage.onload = () => {
      galleryMainImage.src = selected.dataset.image;
      galleryMainImage.alt = selected.getAttribute("aria-label") || selected.dataset.caption || "Wedding gallery photo";
      galleryMainImage.style.objectPosition = selected.dataset.position || "50% 35%";
      galleryMainButton.dataset.image = selected.dataset.image;
      galleryMainButton.dataset.caption = selected.dataset.caption || "Wedding memory";
      galleryMainImage.style.opacity = "1";
    };
    nextImage.onerror = () => { galleryMainImage.src = selected.dataset.image; galleryMainImage.style.opacity = "1"; };
    nextImage.src = selected.dataset.image;
    galleryCaption.textContent = selected.dataset.caption || "Wedding memories";
    galleryCount.textContent = formatGalleryCount(galleryIndex, visible.length);
    galleryThumbs.forEach(button => {
      const active = button === selected;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    updateLightboxContent();
  }
  galleryThumbs.forEach((button, index) => button.addEventListener("click", () => {
    const visible = visibleGalleryThumbs();
    setGalleryImage(visible.indexOf(button) >= 0 ? visible.indexOf(button) : index);
  }));
  $("#galleryPrev")?.addEventListener("click", () => setGalleryImage(galleryIndex - 1));
  $("#galleryNext")?.addEventListener("click", () => setGalleryImage(galleryIndex + 1));
  $("#galleryThumbPrev")?.addEventListener("click", () => galleryThumbnails?.scrollBy({ left: -180, behavior: "smooth" }));
  $("#galleryThumbNext")?.addEventListener("click", () => galleryThumbnails?.scrollBy({ left: 180, behavior: "smooth" }));

  function applyGalleryFilter(filter) {
    activeGalleryFilter = filter;
    galleryFilterButtons.forEach(button => {
      const active = button.dataset.galleryFilter === filter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    galleryThumbs.forEach(button => { button.hidden = filter !== "all" && button.dataset.category !== filter; });
    galleryGridItems.forEach(button => { button.hidden = filter !== "all" && button.dataset.category !== filter; });
    const visible = visibleGalleryThumbs();
    const selected = currentGalleryThumb();
    const index = visible.indexOf(selected);
    setGalleryImage(index >= 0 ? index : 0);
  }
  galleryFilterButtons.forEach(button => button.addEventListener("click", () => applyGalleryFilter(button.dataset.galleryFilter || "all")));

  viewAllButton?.addEventListener("click", () => {
    const showing = !galleryGrid.hidden;
    galleryGrid.hidden = showing;
    viewAllButton.setAttribute("aria-expanded", String(!showing));
    if (viewAllText) viewAllText.textContent = showing ? "View All Photos" : "Hide Photo Gallery";
    if (!showing) window.setTimeout(() => galleryGrid.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
  });

  galleryGridItems.forEach(item => item.addEventListener("click", () => {
    const matchIndex = visibleGalleryThumbs().findIndex(button =>
      button.dataset.image === item.dataset.image && button.dataset.caption === item.dataset.caption
    );
    if (matchIndex >= 0) setGalleryImage(matchIndex);
    openGalleryLightbox();
  }));

  function openGalleryLightbox() {
    const selected = currentGalleryThumb();
    if (!selected || !lightbox) return;
    lightbox.hidden = false;
    updateLightboxContent();
    document.body.style.overflow = "hidden";
    $("#lightboxClose")?.focus();
  }
  function closeGalleryLightbox() {
    if (!lightbox) return;
    lightbox.hidden = true;
    lightboxImage.src = "";
    document.body.style.overflow = "";
    galleryMainButton?.focus({ preventScroll: true });
  }
  galleryMainButton?.addEventListener("click", openGalleryLightbox);
  $("#lightboxClose")?.addEventListener("click", closeGalleryLightbox);
  $("#lightboxPrev")?.addEventListener("click", () => setGalleryImage(galleryIndex - 1));
  $("#lightboxNext")?.addEventListener("click", () => setGalleryImage(galleryIndex + 1));
  lightbox?.addEventListener("click", event => { if (event.target === lightbox) closeGalleryLightbox(); });
  $("#lightboxDownload")?.addEventListener("click", () => {
    const selected = currentGalleryThumb();
    if (!selected) return;
    const downloadLink = document.createElement("a");
    downloadLink.href = selected.dataset.image;
    downloadLink.download = selected.dataset.image.split("/").pop() || "wedding-memory.jpg";
    document.body.appendChild(downloadLink); downloadLink.click(); downloadLink.remove();
  });
  document.addEventListener("keydown", event => {
    if (!lightbox || lightbox.hidden) return;
    if (event.key === "Escape") closeGalleryLightbox();
    if (event.key === "ArrowLeft") setGalleryImage(galleryIndex - 1);
    if (event.key === "ArrowRight") setGalleryImage(galleryIndex + 1);
  });
  setGalleryImage(0);

  // Share invitation
  $("#shareButton").addEventListener("click", async () => {
    const invitationUrl = "https://invitecraft-hue.github.io/wazid-wedding-invitation/";
    const shareData = {
      title: "Wazid Ali & Jeenat Parveen — Wedding Invitation",
      text: "With the blessings of Allah, you're warmly invited to the Nikah of Wazid Ali & Jeenat Parveen on Friday, 23 October 2026, and Dawat-e-Walima on Sunday, 25 October 2026.",
      url: invitationUrl
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else window.open(`https://wa.me/?text=${encodeURIComponent(`${shareData.text}\n${invitationUrl}`)}`, "_blank", "noopener,noreferrer");
    } catch (_) {}
  });

  function showToast(message) {
    const toast = $("#toast"); toast.textContent = message; toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 3000);
  }
})();