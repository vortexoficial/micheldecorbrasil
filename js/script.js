(function () {
      'use strict';

      const body = document.body;
      const nav = document.querySelector('.floating-nav');
      const menuToggle = document.querySelector('.menu-toggle');
      const menuList = document.querySelector('.menu-list');
      const menuLinks = document.querySelectorAll('.menu-link');

      function setupMobileMenu() {
        if (!menuToggle || !menuList) return;

        const closeMenu = () => {
          body.classList.remove('menu-open');
          menuToggle.setAttribute('aria-expanded', 'false');
        };

        menuToggle.addEventListener('click', () => {
          const isOpen = body.classList.toggle('menu-open');
          menuToggle.setAttribute('aria-expanded', String(isOpen));
        });

        menuLinks.forEach((link) => link.addEventListener('click', closeMenu));

        document.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') closeMenu();
        });

        window.addEventListener('resize', () => {
          if (window.innerWidth > 992) closeMenu();
        });
      }

      function setupSiteLoader() {
        const loader = document.querySelector('.site-loader');
        if (!loader) {
          document.body.classList.remove('is-loading');
          document.body.classList.remove('is-loading-lock');
          return;
        }

        const nowMs = () =>
          window.performance && typeof window.performance.now === 'function' ? window.performance.now() : Date.now();

        let start = nowMs();
        const parseCssTimeToMs = (value) => {
          const raw = String(value || '').trim();
          if (!raw) return null;
          const match = raw.match(/^(-?\d*\.?\d+)(ms|s)$/i);
          if (!match) return null;
          const amount = Number(match[1]);
          if (!Number.isFinite(amount)) return null;
          const unit = match[2].toLowerCase();
          return unit === 's' ? amount * 1000 : amount;
        };

        const cssDuration = parseCssTimeToMs(getComputedStyle(loader).getPropertyValue('--loader-duration'));
        const baseDurationMs = Number.isFinite(cssDuration) ? cssDuration : 2500;
        // Pequena folga para garantir que a barra seja percebida como 100% antes do fade-out.
        // Em deploys muito rápidos (cache/CDN), sem isso o loader pode sumir visualmente "antes".
        const minDurationMs = baseDurationMs + 180;

        // Em páginas muito rápidas (cache), o evento `load` pode acontecer antes do primeiro rAF.
        // Se agendarmos o hide antes de iniciar a animação da barra, ela pode não completar.
        let hasBegun = false;
        let pendingSchedule = false;

        let hideTimeout = 0;
        let cleanupTimeout = 0;
        let hasHidden = false;

        const hide = () => {
          if (hasHidden) return;
          hasHidden = true;

          document.body.classList.remove('is-loading');
          loader.classList.add('is-hidden');

          if (cleanupTimeout) window.clearTimeout(cleanupTimeout);
          cleanupTimeout = window.setTimeout(() => {
            document.body.classList.remove('is-loading-lock');
            if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
            window.dispatchEvent(new Event('site-loader:done'));
          }, 600);
        };

        const scheduleHide = () => {
          if (!hasBegun) {
            pendingSchedule = true;
            return;
          }
          if (hideTimeout) window.clearTimeout(hideTimeout);
          const now = nowMs();
          const elapsed = now - start;
          const remaining = Math.max(0, minDurationMs - elapsed);
          hideTimeout = window.setTimeout(hide, remaining);
        };

        const begin = () => {
          start = nowMs();
          loader.classList.add('is-running');
          hasBegun = true;
          scheduleHide();
        };

        begin();
        window.addEventListener('load', scheduleHide, { once: true });
        window.addEventListener('pageshow', scheduleHide);

        if (pendingSchedule) scheduleHide();
      }

      function setupActiveSectionIndicator() {
        const sections = document.querySelectorAll('section[id], header[id]');
        if (!sections.length || !menuLinks.length) return;

        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              const id = entry.target.getAttribute('id');
              if (!id) return;
              menuLinks.forEach((link) => {
                const active = link.getAttribute('href') === `#${id}`;
                link.classList.toggle('active', active);
              });
            });
          },
          {
            rootMargin: '-40% 0px -45% 0px',
            threshold: 0.1,
          }
        );

        sections.forEach((section) => observer.observe(section));
      }

      function setupLightbox() {
        const lightbox = document.querySelector('.lightbox');
        if (!lightbox) return;
        const closeBtn = lightbox.querySelector('.lightbox-close');
        const lightboxImg = lightbox.querySelector('img');
        const items = document.querySelectorAll('[data-lightbox]');

        if (!closeBtn || !lightboxImg || !items.length) return;

        let previousFocus = null;

        const closeLightbox = () => {
          lightbox.hidden = true;
          body.style.overflow = '';
          lightboxImg.removeAttribute('src');
          if (previousFocus) previousFocus.focus();
        };

        items.forEach((item) => {
          item.addEventListener('click', () => {
            const image = item.getAttribute('data-lightbox');
            if (!image) return;
            previousFocus = document.activeElement;
            lightboxImg.src = image;
            lightbox.hidden = false;
            body.style.overflow = 'hidden';
            closeBtn.focus();
          });
        });

        closeBtn.addEventListener('click', closeLightbox);

        lightbox.addEventListener('click', (event) => {
          if (event.target === lightbox || event.target === lightboxImg.parentElement) closeLightbox();
        });

        lightboxImg.addEventListener('click', (event) => event.stopPropagation());

        document.addEventListener('keydown', (event) => {
          if (event.key === 'Escape' && !lightbox.hidden) closeLightbox();
        });
      }

      function setupReviewsMarquee() {
        const marquee = document.querySelector('.reviews-marquee');
        const track = document.querySelector('.reviews-track');
        if (!marquee || !track) return;

        // Duplica o conteúdo para criar o efeito infinito
        // Clonamos os nodes para não prejudicar referência
        const content = Array.from(track.children);
        content.forEach(item => {
          track.appendChild(item.cloneNode(true));
        });

        // Intersection Observer para iniciar apenas quando visível
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              track.classList.add('active');
              // Opcional: parar de observar após ativar, se quiser que continue rodando mesmo ao sair
              // observer.unobserve(marquee); 
            } else {
               // Se quiser pausar quando sair da tela para economizar recurso:
               track.classList.remove('active');
            }
          });
        }, { rootMargin: "0px 0px -100px 0px" });

        observer.observe(marquee);
      }


      function setupFormValidation() {
        const form = document.querySelector('#contato-form');
        const feedback = document.querySelector('.form-feedback');
        if (!form || !feedback) return;

        const fields = {
          nome: form.querySelector('#nome'),
          telefone: form.querySelector('#telefone'),
          tipoEvento: form.querySelector('#tipo-evento'),
          dataEvento: form.querySelector('#data-evento'),
          mensagem: form.querySelector('#mensagem'),
        };

        if (!fields.nome || !fields.telefone || !fields.tipoEvento || !fields.dataEvento || !fields.mensagem) return;

        const setError = (element, message) => {
          element.setCustomValidity(message);
          element.reportValidity();
        };

        form.addEventListener('submit', (event) => {
          event.preventDefault();
          feedback.textContent = '';

          const nome = fields.nome.value.trim();
          const telefone = fields.telefone.value.trim();
          const tipoEvento = fields.tipoEvento.value.trim();
          const dataEvento = fields.dataEvento.value;
          const mensagem = fields.mensagem.value.trim();

          Object.values(fields).forEach((field) => field.setCustomValidity(''));

          if (nome.length < 3) {
            setError(fields.nome, 'Informe seu nome.');
            return;
          }

          const phoneDigits = telefone.replace(/\D/g, '');
          if (phoneDigits.length < 10 || phoneDigits.length > 13) {
            setError(fields.telefone, 'Informe um telefone válido com DDD.');
            return;
          }

          if (tipoEvento.length < 3) {
            setError(fields.tipoEvento, 'Informe o tipo de evento.');
            return;
          }

          if (!dataEvento) {
            setError(fields.dataEvento, 'Selecione a data do evento.');
            return;
          }

          const selectedDate = new Date(`${dataEvento}T00:00:00`);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (selectedDate < today) {
            setError(fields.dataEvento, 'A data do evento não pode ser no passado.');
            return;
          }

          if (mensagem.length < 10) {
            setError(fields.mensagem, 'Descreva sua necessidade com mais detalhes.');
            return;
          }

          feedback.textContent = 'Mensagem enviada! Em breve nossa equipe entrará em contato.';
          form.reset();
        });
      }

      function setupHeroVideo() {
        const frame = document.querySelector('.hero-video-frame');
        const video = document.querySelector('.hero-video-el');
        const playButton = document.querySelector('.hero-video-play');
        if (!frame || !video || !playButton) return;

        let userActivatedAudio = false;

        const showPlayButton = () => {
          playButton.hidden = false;
          frame.classList.remove('is-playing');
        };

        const hidePlayButton = () => {
          playButton.hidden = true;
          frame.classList.add('is-playing');
        };

        const attemptAutoplay = async () => {
          if (userActivatedAudio) return;
          try {
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            video.controls = false;
            await video.play();
          } catch (_) {
            // ignore
          }
        };

        const seekToStart = () => {
          try {
            video.currentTime = 0;
          } catch (_) {
            // ignore
          }
        };

        const forceAudioOn = () => {
          userActivatedAudio = true;
          video.muted = false;
          video.defaultMuted = false;
          video.removeAttribute('muted');
          video.volume = 1;
        };

        const playFromStartWithAudio = () => {
          video.loop = false;
          video.controls = false;
          video.playsInline = true;
          video.setAttribute('playsinline', '');
          video.setAttribute('webkit-playsinline', '');

          try {
            video.pause();
          } catch (_) {
            // ignore
          }

          if (video.readyState >= 1) {
            seekToStart();
          } else {
            video.addEventListener('loadedmetadata', seekToStart, { once: true });
          }

          forceAudioOn();

          let playPromise = null;
          try {
            playPromise = video.play();
          } catch (_) {
            showPlayButton();
            return;
          }

          // Reforça o desmute após iniciar (alguns navegadores “grudam” o muted do autoplay).
          const reinforce = () => {
            forceAudioOn();
            if (video.muted) {
              try {
                video.muted = false;
              } catch (_) {
                // ignore
              }
            }
          };

          if (playPromise && typeof playPromise.then === 'function') {
            playPromise
              .then(() => {
                reinforce();
                hidePlayButton();
              })
              .catch(() => {
                // Em clique do usuário, a intenção é tocar COM áudio.
                // Se falhar, não fazemos fallback para mutado.
                showPlayButton();
              });
          } else {
            reinforce();
            hidePlayButton();
          }
        };

        const pauseIfOutOfView = () => {
          if (!video.paused) video.pause();
        };

        if (video.readyState >= 2) {
          attemptAutoplay();
        } else {
          video.addEventListener('canplay', attemptAutoplay, { once: true });
        }

        playButton.addEventListener('click', (event) => {
          if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
          playFromStartWithAudio();
        });

        // Permite clicar no vídeo/frame (não só no botão).
        frame.addEventListener('click', (event) => {
          const target = event && event.target ? event.target : null;
          if (target === playButton) return;
          playFromStartWithAudio();
        });

        const onStop = () => {
          userActivatedAudio = false;
          showPlayButton();
          attemptAutoplay();
        };

        video.addEventListener('ended', onStop);
        video.addEventListener('pause', () => {
          if (userActivatedAudio) onStop();
          else showPlayButton();
        });

        if ('IntersectionObserver' in window) {
          const observer = new IntersectionObserver(
            (entries) => {
              const entry = entries[0];
              if (!entry) return;
              const sufficientlyVisible = entry.isIntersecting && entry.intersectionRatio >= 0.2;
              if (!sufficientlyVisible) {
                pauseIfOutOfView();
                return;
              }
              if (!userActivatedAudio) attemptAutoplay();
            },
            { threshold: [0, 0.2, 0.6, 1] }
          );
          observer.observe(frame);
        }
      }

      function setupReelsCarousel() {
        const track = document.querySelector('.reels-track');
        if (!track) return;
        const carousel = track.closest('.reels-carousel');
        const cards = Array.from(track.querySelectorAll('.reel-card'));
        if (!carousel || !cards.length) return;

        const prefersReducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

        const anyVideoPlaying = () => Array.from(track.querySelectorAll('video')).some((video) => !video.paused);

        const parsePx = (value) => {
          const n = Number.parseFloat(String(value || '').replace('px', ''));
          return Number.isFinite(n) ? n : null;
        };

        const getGapPx = () => {
          const styles = window.getComputedStyle(track);
          return parsePx(styles.gap) ?? 16;
        };

        const wrap = (value, min, max) => {
          const range = max - min;
          if (range === 0) return min;
          let v = (value - min) % range;
          if (v < 0) v += range;
          return v + min;
        };

        const state = {
          offset: 0,
          step: 0,
          total: 0,
          width: 0,
          height: 0,
        };

        const marquee = {
          running: !prefersReducedMotion,
          speed: 80, // px/s
          rafId: 0,
          lastTs: 0,
          tweenRaf: 0,
        };

        const render = () => {
          if (!state.total || !state.step) return;
          const min = -state.step;
          const max = state.total - state.step;
          for (let i = 0; i < cards.length; i += 1) {
            const card = cards[i];
            const base = i * state.step;
            const x = wrap(base + state.offset, min, max);
            card.style.transform = `translate3d(${x}px, 0, 0)`;
          }
        };

        const measureAndLayout = () => {
          const first = cards[0];
          if (!first) return false;
          const rect = first.getBoundingClientRect();
          const w = rect.width || first.offsetWidth || 0;
          const h = rect.height || first.offsetHeight || 0;
          if (w < 2 || h < 2) return false;

          const gap = getGapPx();
          state.width = w;
          state.height = h;
          state.step = w + gap;
          state.total = state.step * cards.length;
          track.style.height = `${h}px`;

          state.offset = wrap(state.offset, -state.total, 0);
          render();
          return true;
        };

        const initLayoutWhenReady = () => {
          let attempts = 0;
          const attempt = () => {
            if (measureAndLayout()) return;
            attempts += 1;
            if (attempts < 60) window.requestAnimationFrame(attempt);
          };
          attempt();
        };

        const pauseMarquee = () => {
          marquee.running = false;
        };

        const resumeMarquee = () => {
          if (prefersReducedMotion) return;
          if (anyVideoPlaying()) return;
          marquee.running = true;
          marquee.lastTs = 0;
        };

        const stopTween = () => {
          if (marquee.tweenRaf) window.cancelAnimationFrame(marquee.tweenRaf);
          marquee.tweenRaf = 0;
        };

        const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

        const animateOffsetTo = (targetOffset, durationMs) => {
          stopTween();
          const startOffset = state.offset;
          const startTs = window.performance && typeof window.performance.now === 'function' ? window.performance.now() : Date.now();
          const duration = Math.max(1, durationMs);

          const tick = () => {
            const now = window.performance && typeof window.performance.now === 'function' ? window.performance.now() : Date.now();
            const t = Math.min(1, (now - startTs) / duration);
            const eased = easeOutCubic(t);
            state.offset = startOffset + (targetOffset - startOffset) * eased;
            state.offset = wrap(state.offset, -state.total, 0);
            render();
            if (t < 1) marquee.tweenRaf = window.requestAnimationFrame(tick);
            else marquee.tweenRaf = 0;
          };

          marquee.tweenRaf = window.requestAnimationFrame(tick);
        };

        const centerCard = (card) => {
          if (!card || !carousel) return;
          if (!state.total) return;
          pauseMarquee();
          const carRect = carousel.getBoundingClientRect();
          const cardRect = card.getBoundingClientRect();
          const targetCenter = carRect.left + carRect.width / 2;
          const cardCenter = cardRect.left + cardRect.width / 2;
          const dx = targetCenter - cardCenter;
          animateOffsetTo(state.offset + dx, 520);
        };

        const pauseAllExcept = (exceptVideo) => {
          Array.from(track.querySelectorAll('video')).forEach((video) => {
            if (video === exceptVideo) return;
            if (!video.paused) video.pause();
            const parentCard = video.closest ? video.closest('.reel-card') : null;
            if (parentCard) parentCard.classList.remove('is-playing');
          });
        };

        const initVideos = () => {
          Array.from(track.querySelectorAll('video')).forEach((video) => {
            video.controls = false;
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            video.pause();

            const warmFrame = () => {
              if (!Number.isFinite(video.duration) || video.duration <= 0) return;
              try {
                video.currentTime = Math.min(0.05, Math.max(0, video.duration - 0.05));
              } catch (_) {
                // ignore
              }
            };

            if (video.readyState >= 2) warmFrame();
            else video.addEventListener('loadeddata', warmFrame, { once: true });
          });

          cards.forEach((card) => {
            const video = card.querySelector('video');
            if (!video) return;
            card.classList.toggle('is-playing', !video.paused);
          });
        };

        const toggleVideo = async (card) => {
          const video = card.querySelector('video');
          if (!video) return;

          if (video.paused) {
            pauseAllExcept(video);
            pauseMarquee();
            centerCard(card);
            video.loop = false;
            video.controls = false;
            video.muted = false;
            video.volume = 1;
            try {
              await video.play();
            } catch (_) {
              try {
                video.muted = true;
                await video.play();
              } catch (__) {
                // ignore
              }
            }
          } else {
            video.pause();
            video.muted = true;
            video.loop = true;
          }

          card.classList.toggle('is-playing', !video.paused);
          if (video.paused && !anyVideoPlaying()) resumeMarquee();
        };

        // Drag
        let dragging = false;
        let startX = 0;
        let startOffset = 0;

        track.addEventListener('pointerdown', (event) => {
          const target = event.target;
          const isBlockedTarget = target && target.closest ? target.closest('.reel-play, video.reel-video') : null;
          if (isBlockedTarget) return;
          if (event.button !== 0) return;
          dragging = true;
          startX = event.clientX;
          startOffset = state.offset;
          track.classList.add('is-dragging');
          pauseMarquee();
          stopTween();
          if (track.setPointerCapture) track.setPointerCapture(event.pointerId);
        });

        track.addEventListener('pointermove', (event) => {
          if (!dragging) return;
          const dx = event.clientX - startX;
          state.offset = startOffset + dx;
          state.offset = wrap(state.offset, -state.total, 0);
          render();
        });

        const stopDrag = (event) => {
          if (!dragging) return;
          dragging = false;
          track.classList.remove('is-dragging');
          try {
            if (track.releasePointerCapture) track.releasePointerCapture(event.pointerId);
          } catch (_) {
            // ignore
          }
          if (!anyVideoPlaying()) resumeMarquee();
        };

        track.addEventListener('pointerup', stopDrag);
        track.addEventListener('pointercancel', stopDrag);

        // Play/pause via delegation
        track.addEventListener('click', (event) => {
          const target = event.target;
          const playBtn = target && target.closest ? target.closest('.reel-play') : null;
          const videoEl = target && target.closest ? target.closest('video.reel-video') : null;
          if (!playBtn && !videoEl) return;
          event.preventDefault();
          const card = (playBtn || videoEl).closest('.reel-card');
          if (!card) return;
          toggleVideo(card);
        });

        track.addEventListener(
          'play',
          (event) => {
            const video = event.target;
            if (!(video instanceof HTMLVideoElement)) return;
            const card = video.closest('.reel-card');
            if (!card) return;
            card.classList.add('is-playing');
            pauseMarquee();
            centerCard(card);
          },
          true
        );

        const onVideoStop = (event) => {
          const video = event.target;
          if (!(video instanceof HTMLVideoElement)) return;
          const card = video.closest('.reel-card');
          if (!card) return;
          card.classList.remove('is-playing');
          if (!anyVideoPlaying()) resumeMarquee();
        };

        track.addEventListener('pause', onVideoStop, true);
        track.addEventListener('ended', onVideoStop, true);

        // Pausa vídeos quando o card sai da tela
        if ('IntersectionObserver' in window) {
          const observer = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) return;
                const card = entry.target;
                const video = card.querySelector('video');
                if (video && !video.paused) video.pause();
                card.classList.remove('is-playing');
              });
              if (!anyVideoPlaying()) resumeMarquee();
            },
            { threshold: 0.15 }
          );
          cards.forEach((card) => observer.observe(card));
        }

        // Loop do marquee
        const tick = (ts) => {
          if (marquee.running && state.total) {
            if (!marquee.lastTs) marquee.lastTs = ts;
            const dt = Math.min(0.05, Math.max(0, (ts - marquee.lastTs) / 1000));
            marquee.lastTs = ts;
            state.offset -= marquee.speed * dt;
            state.offset = wrap(state.offset, -state.total, 0);
            render();
          } else {
            marquee.lastTs = ts;
          }
          marquee.rafId = window.requestAnimationFrame(tick);
        };

        initLayoutWhenReady();
        initVideos();
        marquee.rafId = window.requestAnimationFrame(tick);

        window.addEventListener('resize', initLayoutWhenReady);
      }

      function setupNavShadowOnScroll() {
        if (!nav) return;
        const onScroll = () => {
          const scrolled = window.scrollY > 10;
          nav.classList.toggle('is-scrolled', scrolled);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
      }

      function setupSmoothAnchorScroll() {
        const anchorLinks = document.querySelectorAll('a[href^="#"]');
        if (!anchorLinks.length) return;

        anchorLinks.forEach((link) => {
          const href = link.getAttribute('href');
          if (!href || href === '#') return;

          link.addEventListener('click', (event) => {
            const target = document.querySelector(href);
            if (!target) return;

            event.preventDefault();

            const navOffset = nav ? nav.offsetHeight + 12 : 0;
            const targetTop = target.getBoundingClientRect().top + window.scrollY - navOffset;

            window.scrollTo({
              top: Math.max(0, targetTop),
              behavior: 'smooth',
            });
          });
        });
      }

      setupMobileMenu();
      setupSiteLoader();

      const runAfterLoader = () => {
        setupSmoothAnchorScroll();
        setupActiveSectionIndicator();
        setupLightbox();
        setupReviewsMarquee();
        setupFormValidation();
        setupHeroVideo();
        setupReelsCarousel();
        setupNavShadowOnScroll();
      };

      if (body.classList.contains('is-loading')) {
        window.addEventListener('site-loader:done', runAfterLoader, { once: true });
      } else {
        runAfterLoader();
      }
    })();