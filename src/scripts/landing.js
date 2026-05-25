import { createClient } from '@supabase/supabase-js';
    const SUPABASE_URL = 'https://ttlnnirwbhmztpcyikhj.supabase.co';
    const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ZBoonLsIpoC4z-mVI-kA2g_UcNxGLF7';
    const MAIN_APP_URL = window.location.origin + '/app.html';
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    const topbarWrap = document.querySelector('.topbar-wrap');
    const themeToggle = document.getElementById('themeToggle');
    const themeToggleIcon = themeToggle?.querySelector('path');
    const loginButton = document.querySelector('.login-btn');
    const loginModal = document.getElementById('loginModal');
    const loginCloseButton = loginModal?.querySelector('.login-close');
    const loginModalDescription = document.getElementById('loginModalDescription');
    const loginEmailInput = document.getElementById('loginEmail');
    const loginForm = loginModal?.querySelector('.login-form');
    const loginSubmitButton = loginModal?.querySelector('.login-submit');
    const loginGoogleButton = loginModal?.querySelector('.login-google-btn');
    const loginSignupLink = loginModal?.querySelector('.signup-link');
    const loginSignupPrompt = loginModal?.querySelector('.login-signup span');
    const loginStatus = loginModal?.querySelector('.login-status');
    const learningButtons = document.querySelectorAll('.start-btn, .hero-primary-btn');
    const learningModal = document.getElementById('learningModal');
    const learningCloseButton = learningModal?.querySelector('.learning-close');
    const learningCancelButton = learningModal?.querySelector('.learning-cancel');
    const learningOptionButtons = learningModal?.querySelectorAll('.learning-option') ?? [];
    const learningContinueButton = learningModal?.querySelector('.learning-continue');
    const instructionStartButton = learningModal?.querySelector('.instruction-start');
    const learningPanels = learningModal?.querySelectorAll('.learning-panel') ?? [];
    const panelBackButtons = learningModal?.querySelectorAll('.instruction-back') ?? [];
    const selectedCourseName = learningModal?.querySelector('[data-selected-course-name]');
    const passwordToggle = loginModal?.querySelector('.password-toggle');
    const passwordInput = document.getElementById('loginPassword');
    const confirmPasswordInput = document.getElementById('loginConfirmPassword');
    const moduleButtons = document.querySelectorAll('.course-link');
    const navLinks = document.querySelectorAll('.nav-links a');
    const exploreCoursesButton = document.querySelector('.hero-secondary-btn');
    let lastScrollY = window.scrollY;
    let isTopbarMinimized = false;
    let isTopbarScrollTicking = false;
    let selectedLearningCourse = '';
    let authMode = 'login';
    const defaultLoginDescription = 'Log in to continue your learning journey.';
    const startLearningSignupDescription = 'Create your PreFlight account to take the initial test and see your weak areas.';
    const authModeContent = {
      login: {
        title: 'Welcome back',
        description: defaultLoginDescription,
        submit: 'Log In',
        busy: 'Logging in...',
        prompt: 'New here?',
        link: 'Create account',
        passwordAutocomplete: 'current-password',
      },
      signup: {
        title: 'Create account',
        description: startLearningSignupDescription,
        submit: 'Create account',
        busy: 'Creating account...',
        prompt: 'Already have an account?',
        link: 'Log in',
        passwordAutocomplete: 'new-password',
      },
    };

    const renderAuthMode = (mode = authMode, message) => {
      authMode = mode;
      const content = authModeContent[authMode] ?? authModeContent.login;
      const loginModalTitle = document.getElementById('loginModalTitle');
      if (loginModal) {
        loginModal.dataset.authMode = authMode;
      }
      if (loginModalTitle) {
        loginModalTitle.textContent = content.title;
      }
      if (loginModalDescription) {
        loginModalDescription.textContent = message || content.description;
      }
      if (loginSubmitButton) {
        loginSubmitButton.textContent = content.submit;
      }
      if (loginSignupPrompt) {
        loginSignupPrompt.textContent = content.prompt;
      }
      if (loginSignupLink) {
        loginSignupLink.textContent = content.link;
      }
      if (passwordInput) {
        passwordInput.autocomplete = content.passwordAutocomplete;
      }
      if (confirmPasswordInput && authMode === 'login') {
        confirmPasswordInput.value = '';
      }
    };

    const setLoginStatus = (message = '') => {
      if (loginStatus) {
        loginStatus.textContent = message;
      }
    };

    const setLoginBusy = (isBusy, label = 'Working...') => {
      const content = authModeContent[authMode] ?? authModeContent.login;
      if (loginSubmitButton) {
        loginSubmitButton.disabled = isBusy;
        loginSubmitButton.textContent = isBusy ? label : content.submit;
      }
      if (loginGoogleButton) {
        loginGoogleButton.disabled = isBusy;
      }
    };

    const goToMainApp = () => {
      window.location.href = MAIN_APP_URL;
    };

    const requireSupabase = () => {
      if (supabaseClient) {
        return true;
      }
      setLoginStatus('Supabase could not load. Check your internet connection and try again.');
      return false;
    };

    const signInWithGoogle = async () => {
      if (!requireSupabase()) {
        return;
      }

      setLoginBusy(true, 'Opening Google...');
      setLoginStatus('');
      localStorage.setItem('preflightPostLoginRedirect', MAIN_APP_URL);

      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: MAIN_APP_URL,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        setLoginBusy(false);
        setLoginStatus(error.message || 'Google login could not start. Please try again.');
      }
    };

    const signInWithPassword = async () => {
      if (!requireSupabase()) {
        return;
      }

      const email = loginEmailInput?.value.trim();
      const password = passwordInput?.value;
      if (!email || !password) {
        setLoginStatus('Enter your email and password, or continue with Google.');
        return;
      }

      setLoginBusy(true, 'Logging in...');
      setLoginStatus('');
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

      if (error) {
        setLoginBusy(false);
        setLoginStatus(error.message || 'Login failed. Please check your details.');
        return;
      }

      goToMainApp();
    };

    const signUpWithPassword = async () => {
      if (!requireSupabase()) {
        return;
      }

      const email = loginEmailInput?.value.trim();
      const password = passwordInput?.value;
      const confirmPassword = confirmPasswordInput?.value;
      if (!email || !password) {
        setLoginStatus('Enter your email and password to create an account.');
        return;
      }

      if (!confirmPassword) {
        setLoginStatus('Confirm your password to create an account.');
        return;
      }

      if (password.length < 6) {
        setLoginStatus('Use a password with at least 6 characters.');
        return;
      }

      if (password !== confirmPassword) {
        setLoginStatus('Passwords do not match.');
        return;
      }

      setLoginBusy(true, authModeContent.signup.busy);
      setLoginStatus('');

      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: MAIN_APP_URL,
        },
      });

      if (error) {
        setLoginBusy(false);
        setLoginStatus(error.message || 'Account could not be created. Please try again.');
        return;
      }

      if (data.session) {
        goToMainApp();
        return;
      }

      setLoginBusy(false);
      setLoginStatus('Account created. Check your email to confirm, then log in.');
    };

    const openLoginModal = (message = defaultLoginDescription, mode = 'login') => {
      renderAuthMode(mode, message);
      setLoginBusy(false);
      setLoginStatus('');
      loginModal?.classList.add('is-open');
      loginModal?.setAttribute('aria-hidden', 'false');
      document.body.classList.add('login-modal-open');
      window.setTimeout(() => loginEmailInput?.focus(), 80);
    };

    const openSignupModal = (message = startLearningSignupDescription) => {
      openLoginModal(message, 'signup');
    };

    const closeLoginModal = () => {
      loginModal?.classList.remove('is-open');
      loginModal?.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('login-modal-open');
    };

    const closeLearningModal = () => {
      learningModal?.classList.remove('is-open');
      learningModal?.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('learning-modal-open');
      resetLearningSelection();
    };

    const setLearningPanel = (panelName) => {
      learningPanels.forEach((panel) => {
        panel.hidden = panel.dataset.learningPanel !== panelName;
      });

      const panelLabels = {
        courses: ['learningModalTitle', 'learningModalDescription'],
        instructions: ['instructionModalTitle', 'instructionModalDescription'],
        construction: ['constructionModalTitle', 'constructionModalDescription'],
      };
      const [titleId, descriptionId] = panelLabels[panelName] ?? panelLabels.courses;
      learningModal?.querySelector('.learning-modal')?.setAttribute('aria-labelledby', titleId);
      learningModal?.querySelector('.learning-modal')?.setAttribute('aria-describedby', descriptionId);
    };

    const resetLearningSelection = () => {
      selectedLearningCourse = '';
      setLearningPanel('courses');
      if (learningContinueButton) {
        learningContinueButton.disabled = true;
      }
      learningOptionButtons.forEach((option) => {
        option.classList.remove('is-selected');
        option.setAttribute('aria-pressed', 'false');
      });
    };

    const openLearningModal = () => {
      resetLearningSelection();
      learningModal?.classList.add('is-open');
      learningModal?.setAttribute('aria-hidden', 'false');
      document.body.classList.add('learning-modal-open');
      window.setTimeout(() => learningCloseButton?.focus(), 80);
    };

    loginButton?.addEventListener('click', () => openLoginModal());
    loginCloseButton?.addEventListener('click', closeLoginModal);
    loginForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      if (authMode === 'signup') {
        signUpWithPassword();
        return;
      }
      signInWithPassword();
    });
    loginSubmitButton?.addEventListener('click', () => {
      if (authMode === 'signup') {
        signUpWithPassword();
        return;
      }
      signInWithPassword();
    });
    loginGoogleButton?.addEventListener('click', signInWithGoogle);
    loginSignupLink?.addEventListener('click', (event) => {
      event.preventDefault();
      if (authMode === 'signup') {
        renderAuthMode('login');
      } else {
        renderAuthMode('signup');
      }
      setLoginBusy(false);
      setLoginStatus('');
      window.setTimeout(() => loginEmailInput?.focus(), 40);
    });
    loginModal?.addEventListener('click', (event) => {
      if (event.target === loginModal) {
        closeLoginModal();
      }
    });

    learningButtons.forEach((button) => {
      button.addEventListener('click', () => openSignupModal());
    });

    learningOptionButtons.forEach((button) => {
      button.addEventListener('click', () => {
        learningOptionButtons.forEach((option) => {
          option.classList.remove('is-selected');
          option.setAttribute('aria-pressed', 'false');
        });
        button.classList.add('is-selected');
        button.setAttribute('aria-pressed', 'true');
        selectedLearningCourse = button.dataset.course ?? '';
        if (learningContinueButton) {
          learningContinueButton.disabled = false;
        }
      });
    });

    learningContinueButton?.addEventListener('click', () => {
      if (selectedLearningCourse === 'ppl') {
        if (selectedCourseName) {
          selectedCourseName.textContent = 'Private Pilot License (PPL)';
        }
        setLearningPanel('instructions');
      } else if (selectedLearningCourse === 'cpl' || selectedLearningCourse === 'ir') {
        setLearningPanel('construction');
      }
    });

    panelBackButtons.forEach((button) => {
      button.addEventListener('click', () => {
        setLearningPanel('courses');
      });
    });

    instructionStartButton?.addEventListener('click', () => {
      localStorage.setItem('preflightSelectedCourse', selectedLearningCourse || 'ppl');
      closeLearningModal();
      window.setTimeout(() => openSignupModal(), 120);
    });

    learningCloseButton?.addEventListener('click', closeLearningModal);
    learningCancelButton?.addEventListener('click', closeLearningModal);
    learningModal?.addEventListener('click', (event) => {
      if (event.target === learningModal) {
        closeLearningModal();
      }
    });

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && loginModal?.classList.contains('is-open')) {
        closeLoginModal();
      }

      if (event.key === 'Escape' && learningModal?.classList.contains('is-open')) {
        closeLearningModal();
      }
    });

    passwordToggle?.addEventListener('click', () => {
      if (!passwordInput) {
        return;
      }

      const shouldShowPassword = passwordInput.type === 'password';
      passwordInput.type = shouldShowPassword ? 'text' : 'password';
      passwordToggle.setAttribute('aria-label', shouldShowPassword ? 'Hide password' : 'Show password');
    });

    const setTopbarMinimized = (shouldMinimize) => {
      if (shouldMinimize === isTopbarMinimized) {
        return;
      }

      isTopbarMinimized = shouldMinimize;
      topbarWrap?.classList.toggle('is-minimized', shouldMinimize);
    };

    const updateTopbarOnScroll = () => {
      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > lastScrollY;
      const isPastHeroStart = currentScrollY > 96;

      setTopbarMinimized(isScrollingDown && isPastHeroStart);
      lastScrollY = Math.max(currentScrollY, 0);
    };

    updateTopbarOnScroll();
    window.addEventListener('scroll', () => {
      if (isTopbarScrollTicking) {
        return;
      }

      isTopbarScrollTicking = true;
      window.requestAnimationFrame(() => {
        updateTopbarOnScroll();
        isTopbarScrollTicking = false;
      });
    }, { passive: true });

    const applyPageView = () => {
      const isFeaturesView = window.location.hash === '#features';
      document.body.classList.toggle('view-features', isFeaturesView);
      document.body.classList.toggle('view-home', !isFeaturesView);

      navLinks.forEach((link) => {
        const isActive = link.getAttribute('href') === (isFeaturesView ? '#features' : '#home');
        link.classList.toggle('is-active', isActive);
        if (isActive) {
          link.setAttribute('aria-current', 'page');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    };
    applyPageView();
    window.addEventListener('hashchange', () => {
      applyPageView();
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    });

    exploreCoursesButton?.addEventListener('click', () => {
      document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    const moonIconPath = 'M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 7 7 0 1 0 20.5 14.5Z';
    const sunIconPath = 'M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66 1.41-1.41M4.93 19.07l1.41-1.41m0-11.32L4.93 4.93m14.14 14.14-1.41-1.41M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z';

    const getSavedTheme = () => {
      try {
        return window.localStorage.getItem('preflight-theme');
      } catch (error) {
        return null;
      }
    };

    const saveTheme = (theme) => {
      try {
        window.localStorage.setItem('preflight-theme', theme);
      } catch (error) {
        // File previews can block storage; the buttons should still work.
      }
    };

    const updateThemeIcon = () => {
      const isDark = document.body.classList.contains('dark-mode');
      themeToggle?.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to night mode');
      themeToggleIcon?.setAttribute('d', isDark ? sunIconPath : moonIconPath);
    };

    if (getSavedTheme() === 'dark') {
      document.body.classList.add('dark-mode');
    }

    updateThemeIcon();
    window.requestAnimationFrame(() => document.body.classList.add('is-ready'));

    themeToggle?.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      saveTheme(isDark ? 'dark' : 'light');
      updateThemeIcon();
      document.body.classList.remove('theme-pulse');
      void document.body.offsetWidth;
      document.body.classList.add('theme-pulse');
      window.setTimeout(() => document.body.classList.remove('theme-pulse'), 560);
    });

    const sharedModulePanel = document.getElementById('courseModulePanel');


    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealTargets = document.querySelectorAll('.content-feature, .course-card, .course-module-panel, .site-info-image, .site-info-copy, .site-info-dashboard, .footer-main > div');

    revealTargets.forEach((target, index) => {
      target.classList.add('motion-reveal');
      target.style.setProperty('--reveal-delay', `${Math.min(index * 45, 220)}ms`);
    });

    if (prefersReducedMotion) {
      revealTargets.forEach((target) => target.classList.add('is-visible'));
    } else {
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });

      revealTargets.forEach((target) => revealObserver.observe(target));
    }
    moduleButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const card = button.closest('.course-card');
        const modulePanel = card?.querySelector('.course-modules');
        const isAlreadyOpen = card?.classList.contains('is-open');

        document.querySelectorAll('.course-card').forEach((courseCard) => {
          courseCard.classList.remove('is-open');
        });

        moduleButtons.forEach((moduleButton) => {
          moduleButton.setAttribute('aria-expanded', 'false');
          moduleButton.textContent = 'View modules';
        });

        document.querySelectorAll('.course-modules').forEach((panel) => {
          panel.setAttribute('aria-hidden', 'true');
        });

        if (isAlreadyOpen) {
          sharedModulePanel?.classList.remove('is-visible');
          sharedModulePanel?.setAttribute('aria-hidden', 'true');
          if (sharedModulePanel) {
            sharedModulePanel.innerHTML = '';
          }
          return;
        }

        card?.classList.add('is-open');
        button.setAttribute('aria-expanded', 'true');
        button.textContent = 'Hide modules';
        modulePanel?.setAttribute('aria-hidden', 'false');

        if (sharedModulePanel && modulePanel) {
          sharedModulePanel.innerHTML = modulePanel.innerHTML;
          sharedModulePanel.classList.add('is-visible');
          sharedModulePanel.setAttribute('aria-hidden', 'false');
        }
      });
    });
    moduleButtons[0]?.click();
