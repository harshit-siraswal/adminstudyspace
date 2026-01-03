/**
 * ============================================
 * StudySpace Admin - Motion & Theme System
 * Premium Glassmorphism with 3D Tilt Effects
 * ============================================
 * 
 * HOW TO USE:
 * 1. Add class "motion-card" to any element for 3D tilt effect
 * 2. Adjust tilt settings via CSS variables:
 *    --tilt-max: Maximum rotation (default: 12deg)
 *    --tilt-scale: Scale on hover (default: 1.02)
 *    --tilt-speed: Animation duration (default: 400ms)
 * 
 * 3. Theme colors are controlled via CSS custom properties
 *    Change [data-theme="light"] or [data-theme="dark"] in CSS
 */

(function () {
    'use strict';

    // ============================================
    // CONFIGURATION (Adjustable)
    // ============================================
    const CONFIG = {
        // Maximum tilt rotation in degrees
        tiltMax: 3,

        // Scale factor on hover
        tiltScale: 1.005,

        // Perspective depth
        perspective: 1000,

        // Spring easing for smooth return
        springEasing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',

        // Reset duration in ms
        resetDuration: 500,

        // Selector for motion cards (exclude sidebar)
        cardSelector: '.motion-card:not(.sidebar)',

        // Storage key for theme preference
        themeStorageKey: 'studyspace-theme',

        // Disable on touch devices
        disableOnTouch: true
    };

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    /**
     * Check if device supports touch
     */
    function isTouchDevice() {
        return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    }

    /**
     * Check if user prefers reduced motion
     */
    function prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * Clamp a value between min and max
     */
    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * Throttle function for performance
     */
    function throttle(func, limit) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                requestAnimationFrame(() => { inThrottle = false; });
            }
        };
    }

    // ============================================
    // 3D TILT EFFECT
    // ============================================

    class MotionCard {
        constructor(element) {
            this.element = element;
            this.rect = null;
            this.isHovering = false;

            // Skip if touch device or reduced motion
            if ((CONFIG.disableOnTouch && isTouchDevice()) || prefersReducedMotion()) {
                return;
            }

            this.bindEvents();
            this.element.dataset.motionInitialized = 'true';
        }

        bindEvents() {
            // Throttled mousemove for performance
            this.handleMouseMove = throttle(this.onMouseMove.bind(this), 0);
            this.handleMouseEnter = this.onMouseEnter.bind(this);
            this.handleMouseLeave = this.onMouseLeave.bind(this);

            this.element.addEventListener('mousemove', this.handleMouseMove);
            this.element.addEventListener('mouseenter', this.handleMouseEnter);
            this.element.addEventListener('mouseleave', this.handleMouseLeave);
        }

        onMouseEnter(e) {
            this.isHovering = true;
            this.rect = this.element.getBoundingClientRect();
            this.element.style.transition = `transform 0.15s ease-out`;
        }

        onMouseMove(e) {
            if (!this.isHovering || !this.rect) return;

            // Calculate mouse position relative to card center
            const x = e.clientX - this.rect.left;
            const y = e.clientY - this.rect.top;
            const centerX = this.rect.width / 2;
            const centerY = this.rect.height / 2;

            // Calculate rotation (inverted for natural feel)
            const rotateX = ((y - centerY) / centerY) * -CONFIG.tiltMax;
            const rotateY = ((x - centerX) / centerX) * CONFIG.tiltMax;

            // Calculate shine position (percentage)
            const shineX = (x / this.rect.width) * 100;
            const shineY = (y / this.rect.height) * 100;

            // Apply transform
            this.element.style.transition = '';
            this.element.style.transform = `
        perspective(${CONFIG.perspective}px)
        rotateX(${rotateX}deg)
        rotateY(${rotateY}deg)
        scale3d(${CONFIG.tiltScale}, ${CONFIG.tiltScale}, ${CONFIG.tiltScale})
      `;

            // Update shine position via CSS custom properties
            this.element.style.setProperty('--shine-x', `${shineX}%`);
            this.element.style.setProperty('--shine-y', `${shineY}%`);
        }

        onMouseLeave(e) {
            this.isHovering = false;

            // Reset with spring animation
            this.element.style.transition = `transform ${CONFIG.resetDuration}ms ${CONFIG.springEasing}`;
            this.element.style.transform = `
        perspective(${CONFIG.perspective}px)
        rotateX(0deg)
        rotateY(0deg)
        scale3d(1, 1, 1)
      `;

            // Reset shine position
            this.element.style.setProperty('--shine-x', '50%');
            this.element.style.setProperty('--shine-y', '50%');
        }

        destroy() {
            this.element.removeEventListener('mousemove', this.handleMouseMove);
            this.element.removeEventListener('mouseenter', this.handleMouseEnter);
            this.element.removeEventListener('mouseleave', this.handleMouseLeave);
        }
    }

    // ============================================
    // THEME MANAGEMENT
    // ============================================

    const ThemeManager = {
        init() {
            // Get saved theme or use system preference
            const savedTheme = localStorage.getItem(CONFIG.themeStorageKey);
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

            this.setTheme(initialTheme);

            // Listen for system theme changes
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!localStorage.getItem(CONFIG.themeStorageKey)) {
                    this.setTheme(e.matches ? 'dark' : 'light');
                }
            });

            console.log(`🎨 Theme initialized: ${initialTheme}`);
        },

        setTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem(CONFIG.themeStorageKey, theme);

            // Reinitialize Lucide icons after theme change
            setTimeout(() => {
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }, 100);
        },

        toggle() {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            this.setTheme(newTheme);
            console.log(`🎨 Theme switched to: ${newTheme}`);

            // Show toast notification
            if (typeof window.showToast === 'function') {
                window.showToast(`Switched to ${newTheme} mode`, 'info');
            }

            return newTheme;
        },

        get current() {
            return document.documentElement.getAttribute('data-theme') || 'dark';
        }
    };

    // ============================================
    // PARALLAX SCROLLING (Optional)
    // ============================================

    const ParallaxManager = {
        elements: [],

        init() {
            if (prefersReducedMotion()) return;

            this.elements = document.querySelectorAll('[data-parallax]');
            if (this.elements.length === 0) return;

            window.addEventListener('scroll', throttle(this.onScroll.bind(this), 0), { passive: true });
        },

        onScroll() {
            const scrollY = window.scrollY;

            this.elements.forEach(element => {
                const speed = parseFloat(element.dataset.parallax) || 0.1;
                const offset = scrollY * speed;
                element.style.transform = `translateY(${offset}px)`;
            });
        }
    };

    // ============================================
    // MOTION CARDS MANAGER
    // ============================================

    const MotionManager = {
        cards: [],
        initTimeout: null,
        isInitializing: false,

        init() {
            this.initializeCards();
            this.observeDOM();
        },

        initializeCards() {
            // Prevent re-entry
            if (this.isInitializing) return;
            this.isInitializing = true;

            const elements = document.querySelectorAll(CONFIG.cardSelector);
            let newCards = 0;

            elements.forEach(element => {
                // Skip if already initialized
                if (element.dataset.motionInitialized) return;

                const card = new MotionCard(element);
                this.cards.push(card);
                newCards++;
            });

            if (newCards > 0) {
                console.log(`✅ Initialized ${newCards} new motion cards (total: ${this.cards.length})`);
            }

            this.isInitializing = false;
        },

        // Re-initialize when DOM changes (for dynamically added cards)
        observeDOM() {
            const self = this;

            const observer = new MutationObserver((mutations) => {
                // Filter out icon/SVG changes to prevent infinite loops
                const hasRelevantChanges = mutations.some(mutation => {
                    // Only care about element additions
                    if (mutation.addedNodes.length === 0) return false;

                    // Check if any added node is or contains a card
                    return Array.from(mutation.addedNodes).some(node => {
                        if (node.nodeType !== Node.ELEMENT_NODE) return false;

                        // Skip SVG elements (Lucide icons)
                        if (node.tagName === 'svg' || node.tagName === 'SVG') return false;

                        // Check if this node or its children match our card selector
                        return node.matches && (
                            node.matches(CONFIG.cardSelector) ||
                            node.querySelector && node.querySelector(CONFIG.cardSelector)
                        );
                    });
                });

                if (hasRelevantChanges) {
                    // Debounce to prevent rapid-fire initialization
                    clearTimeout(self.initTimeout);
                    self.initTimeout = setTimeout(() => self.initializeCards(), 200);
                }
            });

            // Only observe dashboard-main if it exists, otherwise skip
            const mainContent = document.querySelector('.dashboard-main');
            if (mainContent) {
                observer.observe(mainContent, { childList: true, subtree: true });
            }
        }
    };

    // ============================================
    // GLOBAL API
    // ============================================

    window.StudySpaceMotion = {
        // Toggle theme programmatically
        toggleTheme: () => ThemeManager.toggle(),

        // Set specific theme
        setTheme: (theme) => ThemeManager.setTheme(theme),

        // Get current theme
        getTheme: () => ThemeManager.current,

        // Manually reinitialize cards
        refreshCards: () => MotionManager.initializeCards(),

        // Configuration
        config: CONFIG
    };

    // Also expose toggleTheme globally for onclick handlers
    window.toggleTheme = () => ThemeManager.toggle();

    // ============================================
    // INITIALIZATION
    // ============================================

    function init() {
        console.log('🚀 Initializing StudySpace Motion System...');

        // Initialize theme first
        ThemeManager.init();

        // Initialize motion effects
        MotionManager.init();

        // Initialize parallax (if elements exist)
        ParallaxManager.init();

        console.log('✅ StudySpace Motion System initialized');
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
