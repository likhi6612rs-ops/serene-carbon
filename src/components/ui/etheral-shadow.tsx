"use client";

import React, { useRef, useId, useEffect, type CSSProperties } from "react";
import { animate, useMotionValue, type AnimationPlaybackControls } from "motion/react";

interface AnimationConfig {
  scale: number;
  speed: number;
}

interface NoiseConfig {
  opacity: number;
  scale: number;
}

interface ShadowOverlayProps {
  sizing?: "fill" | "stretch";
  color?: string;
  animation?: AnimationConfig;
  noise?: NoiseConfig;
  style?: CSSProperties;
  className?: string;
}

function mapRange(value: number, fromLow: number, fromHigh: number, toLow: number, toHigh: number) {
  if (fromLow === fromHigh) return toLow;
  const pct = (value - fromLow) / (fromHigh - fromLow);
  return toLow + pct * (toHigh - toLow);
}

const useInstanceId = () => {
  const id = useId();
  return `shadowoverlay-${id.replace(/:/g, "")}`;
};

export function Component({
  sizing = "fill",
  color = "rgba(128, 128, 128, 1)",
  animation,
  noise,
  style,
  className,
}: ShadowOverlayProps) {
  const id = useInstanceId();
  const animationEnabled = !!animation && animation.scale > 0;
  const feColorMatrixRef = useRef<SVGFEColorMatrixElement | null>(null);
  const hueRotateMotionValue = useMotionValue(180);
  const hueRotateAnimation = useRef<AnimationPlaybackControls | null>(null);

  const displacementScale = animation ? mapRange(animation.scale, 1, 100, 20, 100) : 0;
  const animationDuration = animation ? mapRange(animation.speed, 1, 100, 1000, 50) : 1;

  useEffect(() => {
    if (feColorMatrixRef.current && animationEnabled) {
      hueRotateAnimation.current?.stop();
      hueRotateMotionValue.set(0);
      hueRotateAnimation.current = animate(hueRotateMotionValue, 360, {
        duration: animationDuration / 25,
        repeat: Infinity,
        repeatType: "loop",
        ease: "linear",
        onUpdate: (value: number) => {
          feColorMatrixRef.current?.setAttribute("values", String(value));
        },
      });
      return () => hueRotateAnimation.current?.stop();
    }
  }, [animationEnabled, animationDuration, hueRotateMotionValue]);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        height: "100%",
        backgroundColor: color,
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          filter: animationEnabled ? `url(#${id}-filter)` : undefined,
        }}
      >
        {animationEnabled && (
          <svg style={{ position: "absolute", width: 0, height: 0 }} aria-hidden="true">
            <defs>
              <filter id={`${id}-filter`} x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.005" numOctaves="2" seed="1" />
                <feColorMatrix ref={feColorMatrixRef} type="hueRotate" values="180" />
                <feDisplacementMap in="SourceGraphic" scale={displacementScale} />
              </filter>
            </defs>
          </svg>
        )}

        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(at 27% 37%, hsla(265, 80%, 60%, 0.6) 0px, transparent 50%)," +
              "radial-gradient(at 97% 21%, hsla(280, 80%, 55%, 0.55) 0px, transparent 50%)," +
              "radial-gradient(at 52% 99%, hsla(295, 80%, 70%, 0.55) 0px, transparent 50%)," +
              "radial-gradient(at 10% 80%, hsla(255, 80%, 65%, 0.55) 0px, transparent 50%)," +
              "radial-gradient(at 80% 95%, hsla(300, 80%, 60%, 0.55) 0px, transparent 50%)",
            backgroundSize: sizing === "stretch" ? "100% 100%" : "cover",
          }}
        />
      </div>

      {noise && noise.opacity > 0 && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: noise.opacity,
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/></svg>\")",
            backgroundSize: `${noise.scale * 160}px ${noise.scale * 160}px`,
            mixBlendMode: "overlay",
          }}
        />
      )}
    </div>
  );
}