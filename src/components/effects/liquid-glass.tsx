"use client";

/**
 * Liquid-glass shader background.
 *
 * Adapted from "Prismatic Liquid Glass" (generated with Shader Studio,
 * https://shaderstudio.com) — credited in README > Credits. Changes for this
 * project:
 *   - it is only a BACKGROUND: page text and buttons are normal HTML children,
 *     so they stay translatable, accessible and clickable;
 *   - no 3D tilt (it makes text harder to read for older customers);
 *   - one still frame instead of animation when reduced motion is on;
 *   - a CSS gradient fallback when WebGL is not available;
 *   - pauses when off-screen or when the tab is hidden (0% GPU).
 */
import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "@/lib/utils";
import { useReducedMotionRef } from "./use-reduced-motion";

// Fragment shader from Shader Studio (unchanged maths): refraction,
// dispersion, caustics and specular highlights over a soft studio backdrop.
const FRAG = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform float u_time;
uniform vec2  u_resolution;
uniform vec3 u_colorA;
uniform vec3 u_colorB;
uniform vec3 u_colorC;
const float GLASS_SCALE = 3.2;
const float DISPERSION = 0.035;
const float CAUSTIC_POWER = 1.6;
const float REFRACT_DEPTH = 1.4;

float field(vec2 p, float time, out vec2 q1Out){
  vec2 q1 = p + vec2(sin(p.y * 1.45 + time * 0.8), cos(p.x * 1.35 - time * 0.65)) * 0.55;
  vec2 q2 = p + vec2(cos(q1.y * 1.25 - time * 0.75), sin(q1.x * 1.4 + time * 0.85)) * 0.45;
  float h = sin(q2.x * 1.8 + time * 0.9) * 0.45 + cos(q2.y * 1.9 - time * 0.75) * 0.45;
  h += sin((q2.x + q2.y) * 1.5 + time * 1.2) * 0.22;
  h += cos(length(q1) * 2.2 - time * 1.4) * 0.14;
  q1Out = q1;
  return h;
}

vec3 band(vec2 uvc, float time, vec3 base){
  float b1 = smoothstep(0.65, 0.0, abs(uvc.x * 1.2 - 0.2 + sin(uvc.y * 2.0 + time * 0.3) * 0.25));
  float b2 = smoothstep(0.75, 0.0, abs(uvc.y * 1.2 + 0.15 - cos(uvc.x * 1.8 - time * 0.25) * 0.22));
  return mix(base, u_colorA * 0.75, b1 * 0.6) + mix(vec3(0.0), u_colorB * 0.6, b2 * 0.55);
}

void main(){
  float uvScale = max(1.0 / u_resolution.y, (16.0 / 9.0) / u_resolution.x);
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) * uvScale;
  float time = u_time * 0.35;
  vec2 p = uv * GLASS_SCALE;

  vec2 q; vec2 qx; vec2 qy;
  float h0 = field(p, time, q);
  vec2 eps = vec2(0.008, 0.0);
  float hX = field(p + eps.xy, time, qx);
  float hY = field(p + eps.yx, time, qy);
  vec2 grad = vec2(hX - h0, hY - h0) / eps.x;
  vec3 normal = normalize(vec3(-grad * REFRACT_DEPTH * 0.42, 1.25));

  vec2 refr = normal.xy * (DISPERSION * 1.4);
  vec3 base = mix(u_colorC, u_colorC * 1.6 + vec3(0.02, 0.03, 0.06), smoothstep(1.4, 0.0, length(uv)));
  vec3 scene = vec3(
    band(uv + refr * 0.82, time, base).r,
    band(uv + refr * 1.0, time, base).g,
    band(uv + refr * 1.22, time, base).b
  );

  float thickness = clamp(0.6 + h0 * 0.45, 0.15, 1.5) * REFRACT_DEPTH;
  scene *= exp(-thickness * mix(vec3(0.12, 0.08, 0.04), vec3(1.0) - u_colorA * 0.4, 0.3));

  float caustic = exp(-pow(h0 * 1.8, 2.0) * 4.0) * pow(clamp(length(grad) * 0.75, 0.0, 1.0), 1.8) * CAUSTIC_POWER;
  vec3 view = vec3(0.0, 0.0, 1.0);
  float fresnel = pow(1.0 - clamp(dot(normal, view), 0.0, 1.0), 3.8);
  float spec = pow(max(dot(normal, normalize(normalize(vec3(0.5, 0.7, 0.85)) + view)), 0.0), 42.0)
             + pow(max(dot(normal, normalize(normalize(vec3(-0.65, -0.4, 0.75)) + view)), 0.0), 20.0) * 0.45;

  vec3 col = mix(scene, mix(vec3(1.0), u_colorB, 0.25), fresnel * 0.65);
  col += mix(vec3(0.9, 0.95, 1.0), u_colorA, 0.35) * caustic * 0.75;
  col += vec3(1.0, 0.98, 0.96) * spec * (0.9 + 0.3 * REFRACT_DEPTH) * 1.1;
  col = tanh(col * 1.12);
  col = clamp((col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14), 0.0, 1.0);
  fragColor = vec4(col, 1.0);
}`;

const VERT = `#version 300 es
layout(location = 0) in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

/** "#A9D8F5" → [0.66, 0.85, 0.96] for the shader. */
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Compile and link the shader program; returns null if the GPU refuses. */
function createProgram(gl: WebGL2RenderingContext): WebGLProgram | null {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

type LiquidGlassProps = {
  children?: ReactNode;
  className?: string;
  /** Highlight colour (light bands). */
  colorA?: string;
  /** Reflection colour. */
  colorB?: string;
  /** Deep background colour. */
  colorC?: string;
  speed?: number;
  /**
   * Strength (0–1) of the navy tint laid over the glass so white text on top
   * stays readable. The shader itself is bright and pale.
   */
  tint?: number;
};

export function LiquidGlass({
  children,
  className,
  colorA = "#3FA2E8",
  colorB = "#BFE3FA",
  colorC = "#061321",
  speed = 0.8,
  tint = 0.62,
}: LiquidGlassProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotionRef();

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const gl = canvas.getContext("webgl2", { antialias: false, powerPreference: "low-power" });
    if (!gl) return; // CSS fallback background stays visible
    const program = createProgram(gl);
    if (!program) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "u_time");
    const uRes = gl.getUniformLocation(program, "u_resolution");
    for (const [name, hex] of [["u_colorA", colorA], ["u_colorB", colorB], ["u_colorC", colorC]] as const) {
      const [r, g, b] = hexToRgb(hex);
      gl.uniform3f(gl.getUniformLocation(program, name), r, g, b);
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      const width = Math.max(1, Math.round(host.clientWidth * dpr));
      const height = Math.max(1, Math.round(host.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
        gl.uniform2f(uRes, width, height);
      }
    };
    resize();
    canvas.dataset.ready = "true";

    let frame = 0;
    let visible = true;
    let last = performance.now();
    let simTime = 7; // start mid-flow so the first (or only) frame looks finished

    const draw = (now: number) => {
      simTime += Math.min((now - last) / 1000, 0.1) * speed;
      last = now;
      gl.uniform1f(uTime, simTime);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      frame = visible && !reducedMotion.current ? requestAnimationFrame(draw) : 0;
    };
    const start = () => {
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      start(); // redraw at the new size (one frame if motion is reduced)
    });
    resizeObserver.observe(host);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = (entry?.isIntersecting ?? true) && !document.hidden;
      if (visible) start();
    });
    intersection.observe(host);
    const onVisibility = () => {
      visible = !document.hidden;
      if (visible) start();
    };
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [colorA, colorB, colorC, speed, reducedMotion]);

  return (
    <div
      ref={hostRef}
      className={cx("relative isolate overflow-hidden", className)}
      style={{ background: `radial-gradient(120% 90% at 30% 20%, ${colorA}55, transparent 60%), ${colorC}` }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 -z-20 block size-full opacity-0 transition-opacity duration-700 data-[ready=true]:opacity-100"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background: `linear-gradient(115deg, rgb(6 19 33 / ${tint + 0.2}) 0%, rgb(6 19 33 / ${tint}) 45%, rgb(6 19 33 / ${Math.max(0, tint - 0.3)}) 100%)`,
        }}
      />
      {children}
    </div>
  );
}
