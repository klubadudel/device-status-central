
'use client';

import React, { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface NextTopLoaderProps {
  color?: string;
  initialPosition?: number;
  crawlSpeed?: number;
  height?: number;
  crawl?: boolean;
  showSpinner?: boolean;
  easing?: string;
  speed?: number;
  shadow?: string | false;
  zIndex?: number;
}

export const NextTopLoader: React.FC<NextTopLoaderProps> = ({
  color = 'hsl(var(--primary))', // Use HSL variable for primary color
  initialPosition = 0.08,
  crawlSpeed = 200,
  height = 3,
  crawl = true,
  showSpinner = true,
  easing = 'ease',
  speed = 200,
  shadow = '0 0 10px var(--primary), 0 0 5px var(--primary)', // Use HSL variable for shadow
  zIndex = 1600,
}) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const NProgressRef = React.useRef<any>(null);

  useEffect(() => {
    // Dynamically import nprogress on the client side
    import('nprogress').then((NProgress) => {
      NProgressRef.current = NProgress.default;
      if (NProgressRef.current) {
        NProgressRef.current.configure({
          minimum: initialPosition,
          easing: easing,
          speed: speed,
          showSpinner: showSpinner,
        });

        NProgressRef.current.set(initialPosition); // Start NProgress on mount

        // Helper function to apply styles
        const applyStyles = () => {
          const bar = document.getElementById('nprogress-bar');
          const peg = document.getElementById('nprogress-peg');
          const spinner = document.querySelector('#nprogress .spinner-icon');

          if (bar) {
            bar.style.background = color;
            bar.style.height = `${height}px`;
            bar.style.boxShadow = shadow === false ? 'none' : shadow;
            bar.style.zIndex = `${zIndex}`; // Ensure bar is on top
          }
          if (peg) {
            peg.style.boxShadow = shadow === false ? 'none' : shadow;
          }
          if (spinner) {
            (spinner as HTMLElement).style.borderTopColor = color;
            (spinner as HTMLElement).style.borderLeftColor = color;
          }
        };
        
        applyStyles(); // Apply styles immediately after configuration
      }
    });
  }, [color, height, initialPosition, easing, speed, showSpinner, shadow, zIndex]);


  useEffect(() => {
    if (NProgressRef.current) {
      NProgressRef.current.start();
      if (crawl) {
        const interval = setInterval(() => {
          if (NProgressRef.current) NProgressRef.current.inc();
        }, crawlSpeed);
        // Clear interval when done
        const doneLoading = () => {
          clearInterval(interval);
          if (NProgressRef.current) NProgressRef.current.done();
        };
        // Call doneLoading when component unmounts or path changes significantly
        // For Next.js, usually, NProgress.done() is called after navigation events
        // Here we simplify by just letting it crawl until route changes.
        // Proper handling might involve Router events if available/needed.
        return () => {
          clearInterval(interval);
          if (NProgressRef.current) NProgressRef.current.done(); // Ensure it's done on unmount
        };
      } else {
         if (NProgressRef.current) NProgressRef.current.done();
      }
    }
    return () => {
      if (NProgressRef.current) {
        NProgressRef.current.done();
      }
    };
  }, [pathname, searchParams, crawl, crawlSpeed]);

  // Inject NProgress CSS
  useEffect(() => {
    const nprogressStyle = document.getElementById('nprogress-custom-style');
    if (!nprogressStyle) {
      const style = document.createElement('style');
      style.id = 'nprogress-custom-style';
      style.textContent = `
        #nprogress {
          pointer-events: none;
        }
        #nprogress .bar {
          background: ${color};
          position: fixed;
          z-index: ${zIndex};
          top: 0;
          left: 0;
          width: 100%;
          height: ${height}px;
          box-shadow: ${shadow};
        }
        #nprogress .peg {
          display: block;
          position: absolute;
          right: 0px;
          width: 100px;
          height: 100%;
          box-shadow: ${shadow};
          opacity: 1.0;
          -webkit-transform: rotate(3deg) translate(0px, -4px);
              -ms-transform: rotate(3deg) translate(0px, -4px);
                  transform: rotate(3deg) translate(0px, -4px);
        }
        #nprogress .spinner {
          display: ${showSpinner ? 'block' : 'none'};
          position: fixed;
          z-index: ${zIndex};
          top: 15px;
          right: 15px;
        }
        #nprogress .spinner-icon {
          width: 18px;
          height: 18px;
          box-sizing: border-box;
          border: solid 2px transparent;
          border-top-color: ${color};
          border-left-color: ${color};
          border-radius: 50%;
          -webkit-animation: nprogress-spinner 400ms linear infinite;
                  animation: nprogress-spinner 400ms linear infinite;
        }
        .nprogress-custom-parent {
          overflow: hidden;
          position: relative;
        }
        .nprogress-custom-parent #nprogress .spinner,
        .nprogress-custom-parent #nprogress .bar {
          position: absolute;
        }
        @-webkit-keyframes nprogress-spinner {
          0%   { -webkit-transform: rotate(0deg); }
          100% { -webkit-transform: rotate(360deg); }
        }
        @keyframes nprogress-spinner {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }, [color, height, shadow, showSpinner, zIndex]);

  return null; // This component does not render anything itself
};

