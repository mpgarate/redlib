(() => {
  const setup = () => {
    const overlay = document.getElementById("image_overlay");
    if (!overlay) {
      return;
    }

    const overlayImage = document.getElementById("image_overlay_img");
    const overlayVideo = document.getElementById("image_overlay_video");
    const closeButton = overlay.querySelector(".image_overlay_close");
    const backdrop = overlay.querySelector(".image_overlay_backdrop");
    const prevButton = overlay.querySelector(".overlay_gallery_prev");
    const nextButton = overlay.querySelector(".overlay_gallery_next");
    const counter = overlay.querySelector(".overlay_gallery_counter");
    const triggers = Array.from(document.querySelectorAll(".post_thumbnail.overlay_trigger"));

    if (!overlayImage || !overlayVideo || !closeButton || !backdrop || !prevButton || !nextButton || !counter || triggers.length === 0) {
      return;
    }

    const cache = new Map();
    let hlsPlayer = null;
    let currentGallery = [];
    let currentGalleryIndex = 0;
    let touchStartX = 0;
    let touchEndX = 0;

    const prefetchImages = () => {
      const seen = new Set();
      triggers.forEach((trigger) => {
        const src = trigger.dataset.overlaySrc || "";
        const type = trigger.dataset.overlayType || "";
        if (type === "video" || type === "gif") {
          return;
        }
        if (!src || seen.has(src)) {
          return;
        }
        seen.add(src);
        const img = new Image();
        img.src = src;
        cache.set(src, img);
      });
    };

    const updateGalleryControls = () => {
      if (currentGallery.length > 1) {
        prevButton.style.display = "block";
        nextButton.style.display = "block";
        counter.style.display = "block";
        counter.textContent = `${currentGalleryIndex + 1} / ${currentGallery.length}`;
      } else {
        prevButton.style.display = "none";
        nextButton.style.display = "none";
        counter.style.display = "none";
      }
    };

    const isYouTubeUrl = (url) => {
      if (!url) return false;
      return url.includes("youtube.com") || url.includes("youtu.be");
    };

    const openOverlayImage = (src, gallery = []) => {
      if (!src && gallery.length === 0) {
        return;
      }
      currentGallery = gallery.length > 0 ? gallery : [src];
      currentGalleryIndex = 0;
      const imageSrc = currentGallery[currentGalleryIndex];
      const cached = cache.get(imageSrc);
      overlayVideo.pause();
      overlayVideo.removeAttribute("src");
      overlayVideo.load();
      overlayVideo.classList.remove("active");
      overlayImage.classList.remove("hidden");
      overlayImage.classList.add("active");
      overlayImage.src = cached ? cached.src : imageSrc;
      updateGalleryControls();
      overlay.classList.add("active");
      overlay.setAttribute("aria-hidden", "false");
      document.body.classList.add("overlay_open");
    };

    const openOverlayVideo = (mp4Src, hlsSrc, poster) => {
      if (!mp4Src && !hlsSrc) {
        return;
      }
      currentGallery = [];
      currentGalleryIndex = 0;
      prevButton.style.display = "none";
      nextButton.style.display = "none";
      counter.style.display = "none";
      if (hlsPlayer) {
        hlsPlayer.destroy();
        hlsPlayer = null;
      }
      overlayImage.removeAttribute("src");
      overlayImage.classList.remove("active");
      overlayImage.classList.add("hidden");
      overlayVideo.removeAttribute("src");
      overlayVideo.load();
      if (hlsSrc && window.Hls && window.Hls.isSupported()) {
        hlsPlayer = new window.Hls();
        hlsPlayer.loadSource(hlsSrc);
        hlsPlayer.attachMedia(overlayVideo);
      } else if (hlsSrc && overlayVideo.canPlayType("application/vnd.apple.mpegurl")) {
        overlayVideo.src = hlsSrc;
      } else if (mp4Src) {
        overlayVideo.src = mp4Src;
      }
      overlayVideo.poster = poster || "";
      overlayVideo.classList.add("active");
      overlayVideo.load();
      overlay.classList.add("active");
      overlay.setAttribute("aria-hidden", "false");
      document.body.classList.add("overlay_open");
    };

    const closeOverlay = () => {
      overlay.classList.remove("active");
      overlay.setAttribute("aria-hidden", "true");
      document.body.classList.remove("overlay_open");
      currentGallery = [];
      currentGalleryIndex = 0;
      prevButton.style.display = "none";
      nextButton.style.display = "none";
      counter.style.display = "none";
      if (hlsPlayer) {
        hlsPlayer.destroy();
        hlsPlayer = null;
      }
      overlayVideo.pause();
      overlayVideo.removeAttribute("src");
      overlayVideo.load();
      overlayVideo.classList.remove("active");
      overlayImage.classList.remove("active");
      overlayImage.classList.add("hidden");
      overlayImage.removeAttribute("src");
    };

    const showGalleryImage = (index) => {
      if (currentGallery.length === 0) {
        return;
      }
      currentGalleryIndex = (index + currentGallery.length) % currentGallery.length;
      const imageSrc = currentGallery[currentGalleryIndex];
      const cached = cache.get(imageSrc);
      overlayImage.src = cached ? cached.src : imageSrc;
      updateGalleryControls();
    };

    triggers.forEach((trigger) => {
      trigger.addEventListener("click", (event) => {
        const src = trigger.dataset.overlaySrc || "";
        const type = trigger.dataset.overlayType || "";
        const mp4Src = trigger.dataset.overlayMp4 || "";
        const hlsSrc = trigger.dataset.overlayHls || "";
        const poster = trigger.dataset.overlayPoster || "";
        const galleryData = trigger.dataset.overlayGallery || "";

        // Check if this is a YouTube link - let it navigate normally
        if (isYouTubeUrl(mp4Src) || isYouTubeUrl(hlsSrc)) {
          return;
        }

        if (type === "video" || type === "gif") {
          if (!mp4Src && !hlsSrc) {
            return;
          }
          event.preventDefault();
          openOverlayVideo(mp4Src, hlsSrc, poster);
          return;
        }
        if (type === "gallery" && galleryData) {
          event.preventDefault();
          const gallery = galleryData.split("|").filter(url => url.trim());
          openOverlayImage(src, gallery);
          return;
        }
        if (!src) {
          return;
        }
        event.preventDefault();
        openOverlayImage(src);
      });
    });

    prevButton.addEventListener("click", () => {
      showGalleryImage(currentGalleryIndex - 1);
    });

    nextButton.addEventListener("click", () => {
      showGalleryImage(currentGalleryIndex + 1);
    });

    closeButton.addEventListener("click", closeOverlay);
    backdrop.addEventListener("click", closeOverlay);

    document.addEventListener("keydown", (event) => {
      if (!overlay.classList.contains("active")) {
        return;
      }
      if (event.key === "Escape") {
        closeOverlay();
      } else if (event.key === "ArrowLeft" && currentGallery.length > 1) {
        showGalleryImage(currentGalleryIndex - 1);
      } else if (event.key === "ArrowRight" && currentGallery.length > 1) {
        showGalleryImage(currentGalleryIndex + 1);
      }
    });

    const handleTouchStart = (event) => {
      if (!overlay.classList.contains("active") || currentGallery.length <= 1) {
        return;
      }
      touchStartX = event.changedTouches[0].screenX;
    };

    const handleTouchEnd = (event) => {
      if (!overlay.classList.contains("active") || currentGallery.length <= 1) {
        return;
      }
      touchEndX = event.changedTouches[0].screenX;
      handleSwipe();
    };

    const handleSwipe = () => {
      const swipeThreshold = 50;
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) < swipeThreshold) {
        return;
      }
      if (diff > 0) {
        // Swipe left - next image
        showGalleryImage(currentGalleryIndex + 1);
      } else {
        // Swipe right - previous image
        showGalleryImage(currentGalleryIndex - 1);
      }
    };

    overlayImage.addEventListener("touchstart", handleTouchStart, { passive: true });
    overlayImage.addEventListener("touchend", handleTouchEnd, { passive: true });

    window.addEventListener("load", prefetchImages);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }
})();
