"use client";

/**
 * Interactive "Goodson" wordmark.
 *
 * Adapted from "Vector Wordmark" by Originkit (credited in README > Credits).
 * The word is drawn into a texture with two channels — a solid fill and a
 * dotted outline — and a WebGL shader blends between them around the pointer,
 * as if the cursor reveals the vector points of the letters. Three small
 * "handles" with coordinate readouts follow the pointer like a design tool.
 *
 * Changes for this project:
 *   - sizes to its container (no 1200×800 minimum), so it works on phones;
 *   - decorative only: aria-hidden, the real heading is normal HTML text;
 *   - reduced motion: no automatic sweep or drift, frames only on pointer move;
 *   - pauses when the tab is hidden; typed without `any`.
 */
import { useEffect, useRef } from "react";
import { useReducedMotionRef } from "./use-reduced-motion";

const MAX_DPR = 2;
const REF_WIDTH = 1200; // the font size is quoted at this container width
const MAX_TEX = 4096;
const HANDLES = 3;
const CELL_ASPECT = 0.6;
const DRIFT_X = 0.08;
const DRIFT_Y = 0.04;
const DRIFT_RATE = 1.3;
const DRIFT_RATE_Y = 1.3 * 1.3;
const SWEEP_RATE = 0.5;
const SWEEP_BAND = 0.28;
const RESNAP = 0.2;
const DAMP_REF = 20;
const SPEED_REF = 50;
const LABEL_OPACITY = 0.6;
const DOT_DIAMETER = 4 / 440;
const DOT_PITCH = 12 / 440;

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const fract = (x: number) => x - Math.floor(x);

/** "#89CFF0" → [r, g, b] in 0..1 */
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
uniform sampler2D uMap;
uniform vec2 uRes;
uniform vec2 uAtlas;
uniform vec2 uPtr;
uniform float uReach;
uniform vec3 uText;
uniform vec3 uShade;
uniform vec4 uAccent;
uniform vec2 uV0;
uniform vec2 uV1;
uniform vec2 uV2;
uniform float uHalf;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

vec2 blurRG(vec2 uv, float e) {
  vec4 sum = vec4(0.0);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float th = radians(fi / 6.0 * 360.0);
    vec2 off = vec2(cos(th), sin(th)) * (hash(vec2(fi, uv.x + uv.y)) + e);
    sum += texture2D(uMap, uv + off * e);
  }
  return (sum / 6.0).rg;
}

vec2 segment(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  vec2 ap = p - a;
  float t = clamp(dot(ap, ab) / max(dot(ab, ab), 1e-8), 0.0, 1.0);
  return vec2(length(ap - ab * t), t);
}

float stroke(float d, float lw, float px) { return 1.0 - smoothstep(lw, lw + px, d); }

float dashedLine(vec2 p, vec2 a, vec2 b, float lw, float px) {
  vec2 s = segment(p, a, b);
  return stroke(s.x, lw, px) * step(0.5, fract(s.y * length(b - a) * 100.0));
}

float boxEdge(vec2 p, vec2 c, float h, float lw, float px) {
  vec2 q = abs(p - c) - vec2(h);
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  return stroke(abs(d), lw, px);
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 E = (vUv * uRes - (uRes - uAtlas) * 0.5) / uAtlas;
  float inside = step(0.0, E.x) * step(E.x, 1.0) * step(0.0, E.y) * step(E.y, 1.0);
  vec2 safeUv = clamp(E, 0.0, 1.0);

  float b = clamp(1.0 - E.y * 3.5, 0.0, 1.0) * 0.008;
  vec2 soft = blurRG(safeUv, b);
  vec2 sharp = blurRG(safeUv, b * 0.1);

  float d = length((vUv - uPtr) / vec2(1.0, aspect));
  float k = 1.0 - pow(smoothstep(0.0, max(uReach, 1e-4), d), 3.0);
  float mask = mix(soft.r, sharp.g, k) * inside;
  vec3 fill = mix(uShade, uText, smoothstep(0.0, 1.0, E.y));

  vec2 P = vec2(vUv.x * aspect, vUv.y);
  float px = 1.0 / uRes.y;
  float lw = px * 0.2;
  float lines = max(max(dashedLine(P, uV0, uV1, lw, px), dashedLine(P, uV1, uV2, lw, px)), dashedLine(P, uV2, uV0, lw, px));
  float boxes = max(max(boxEdge(P, uV0, uHalf, lw, px), boxEdge(P, uV1, uHalf, lw, px)), boxEdge(P, uV2, uHalf, lw, px));
  float A = max(lines, boxes) * uAccent.a * (1.0 - vUv.y);

  vec4 card = vec4(fill * mask, mask);
  vec4 comp = vec4(uAccent.rgb * A, A) + card * (1.0 - A);
  gl_FragColor = comp * pow(clamp(E.y, 0.0, 1.0), 0.7);
}`;

function compile(gl: WebGLRenderingContext) {
  const make = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, make(gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, make(gl.FRAGMENT_SHADER, FRAG));
  gl.bindAttribLocation(program, 0, "aPos");
  gl.linkProgram(program);
  return program;
}

type FontSpec = { family: string; weight: string; size: number; letterSpacing: string };

/**
 * Draw the two-channel texture: red = solid letters, green = dotted outline.
 * Returns the canvas plus its size in CSS pixels.
 */
function buildAtlas(text: string, font: FontSpec, drawFontPx: number, dpr: number) {
  const probe = document.createElement("canvas").getContext("2d");
  if (!probe) return null;
  const setFont = (ctx: CanvasRenderingContext2D, px: number) => {
    ctx.font = `normal ${font.weight} ${px}px ${font.family}`;
    if ("letterSpacing" in ctx) (ctx as { letterSpacing: string }).letterSpacing = font.letterSpacing;
  };
  const measure = (px: number) => {
    setFont(probe, px);
    const m = probe.measureText(text);
    return {
      w: Math.max(1, m.width),
      asc: m.actualBoundingBoxAscent || px * 0.8,
      desc: m.actualBoundingBoxDescent || px * 0.22,
    };
  };

  let fpx = Math.max(8, drawFontPx * dpr);
  let m = measure(fpx);
  let pad = fpx * 0.12;
  const over = Math.max((m.w + pad * 2) / MAX_TEX, (m.asc + m.desc + pad * 2) / MAX_TEX);
  if (over > 1) {
    fpx = Math.max(8, fpx / over);
    m = measure(fpx);
    pad = fpx * 0.12;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(m.w + pad * 2);
  canvas.height = Math.ceil(m.asc + m.desc + pad * 2);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  setFont(ctx, fpx);
  ctx.textBaseline = "alphabetic";
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "#ff0000";
  ctx.fillText(text, pad, pad + m.asc);

  // Round-capped zero-length dashes ARE the dots along each letter's path.
  const block = m.asc + m.desc;
  ctx.strokeStyle = "#00ff00";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(1, block * DOT_DIAMETER);
  ctx.setLineDash([0, Math.max(2, block * DOT_PITCH)]);
  ctx.strokeText(text, pad, pad + m.asc);

  const cssPerPx = drawFontPx / fpx;
  return { canvas, cssW: canvas.width * cssPerPx, cssH: canvas.height * cssPerPx };
}

type VectorWordmarkProps = {
  text?: string;
  /** CSS font-family string, e.g. fraunces.style.fontFamily */
  fontFamily: string;
  fontWeight?: number;
  /** Font size in px when the container is 1200px wide; scales with width. */
  fontSize?: number;
  textColor?: string;
  shade?: string;
  accent?: string;
  /** Strength (0–1) of the handle rig lines. */
  accentAlpha?: number;
  reach?: number;
  className?: string;
};

export function VectorWordmark({
  text = "Goodson",
  fontFamily,
  fontWeight = 600,
  fontSize = 300,
  textColor = "#89CFF0",
  shade = "#D9EEFB",
  accent = "#A9D8F5",
  accentAlpha = 0.45,
  reach = 290,
  className,
}: VectorWordmarkProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRefs = useRef<Array<HTMLDivElement | null>>([null, null, null]);
  const reducedMotion = useReducedMotionRef();

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const attrs: WebGLContextAttributes = { alpha: true, antialias: false, premultipliedAlpha: true };
    const gl = (canvas.getContext("webgl2", attrs) || canvas.getContext("webgl", attrs)) as WebGLRenderingContext | null;
    if (!gl) return;
    const isGL2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;

    const font: FontSpec = { family: fontFamily, weight: String(fontWeight), size: fontSize, letterSpacing: "-0.02em" };
    const textRgb = hexToRgb(textColor);
    const shadeRgb = hexToRgb(shade);
    const accentRgb = hexToRgb(accent);

    const program = compile(gl);
    const U = Object.fromEntries(
      ["uMap", "uRes", "uAtlas", "uPtr", "uReach", "uText", "uShade", "uAccent", "uV0", "uV1", "uV2", "uHalf"].map((n) => [
        n,
        gl.getUniformLocation(program, n),
      ]),
    ) as Record<string, WebGLUniformLocation | null>;

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    let alive = true;
    let boxW = Math.max(1, host.offsetWidth);
    let boxH = Math.max(1, host.offsetHeight);
    let dpr = 1;
    let atlasRatioW = 1;
    let atlasRatioH = 1;
    let atlasKey = "";
    const drawFontPx = () => Math.max(8, font.size * (boxW / REF_WIDTH));

    const resize = () => {
      boxW = Math.max(1, host.offsetWidth);
      boxH = Math.max(1, host.offsetHeight);
      dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
      canvas.width = Math.round(boxW * dpr);
      canvas.height = Math.round(boxH * dpr);
    };

    const rebuildAtlas = () => {
      const px = drawFontPx();
      const atlas = buildAtlas(text, font, px, dpr);
      if (!atlas) return;
      atlasRatioW = atlas.cssW / px;
      atlasRatioH = atlas.cssH / px;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      const { width, height } = atlas.canvas;
      const powerOfTwo = (width & (width - 1)) === 0 && (height & (height - 1)) === 0;
      if (isGL2 || powerOfTwo) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
    };

    // Pointer, eased pointer and the three handle positions (screen uv).
    const target = { x: -0.5, y: 0.5 };
    const eased = { x: -0.5, y: 0.5 };
    const cells = Array.from({ length: HANDLES }, () => ({ x: -0.5, y: 0.5 }));
    const verts = Array.from({ length: HANDLES }, () => ({ x: -0.5, y: 0.5 }));
    let hasPointer = false;
    let sweepClock = 0;
    let driftT = 0;

    /** Snap the handles to the 3 lattice cells nearest the pointer (skipping its own cell). */
    const snap = (x: number, y: number, cw: number, ch: number) => {
      const cx = Math.floor(x / cw);
      const cy = Math.floor(y / ch);
      const found: Array<{ x: number; y: number; d: number }> = [];
      for (let i = -1; i <= 1; i += 1) {
        for (let j = -1; j <= 1; j += 1) {
          const px = (cx + i + 0.5) * cw;
          const py = (cy + j + 0.5) * ch;
          found.push({ x: px, y: py, d: Math.hypot(px - x, py - y) });
        }
      }
      found.sort((a, b) => a.d - b.d);
      for (let i = 0; i < HANDLES; i += 1) {
        cells[i].x = found[i + 1].x;
        cells[i].y = found[i + 1].y;
      }
    };

    const step = (dt: number) => {
      const still = reducedMotion.current;
      const rate = still ? 0 : 1;
      const cw = 0.27;
      const ch = cw * CELL_ASPECT;
      const aspect = boxW / boxH;
      if (!hasPointer) {
        // No pointer yet (or a phone): sweep a pretend pointer across the word.
        const band = (atlasRatioH * drawFontPx()) / boxH;
        target.y = (1 - band) / 2 + SWEEP_BAND * band;
        if (still) target.x = 0.62;
        else target.x += dt * SWEEP_RATE * rate;
        if (target.x > 1.5) target.x = eased.x = -0.5;
        sweepClock += dt;
        if (sweepClock >= RESNAP || still) {
          sweepClock = 0;
          snap(target.x * aspect, target.y, cw, ch);
        }
      } else {
        snap(target.x * aspect, target.y, cw, ch);
      }
      const damp = still ? 1 : clamp(0.6 * DAMP_REF * dt, 0, 1);
      eased.x += (target.x - eased.x) * damp;
      eased.y += (target.y - eased.y) * damp;
      driftT += dt * rate * (SPEED_REF / 50);
      for (let i = 0; i < HANDLES; i += 1) {
        const c = cells[i];
        const sx = Math.round(c.x / cw - 0.5);
        const sy = Math.round(c.y / ch - 0.5);
        const h1 = fract(Math.sin(sx * 127.1 + sy * 311.7) * 43758.5453);
        const h2 = fract(Math.sin(sx * 269.5 + sy * 183.3) * 43758.5453);
        verts[i].x = c.x + DRIFT_X * cw * Math.sin(driftT * DRIFT_RATE + h1 * Math.PI * 2);
        verts[i].y = c.y + DRIFT_Y * ch * Math.sin(driftT * DRIFT_RATE_Y + h2 * Math.PI * 2);
      }
    };

    const writeLabels = () => {
      const aspect = boxW / boxH;
      const half = 109 / 2;
      for (let i = 0; i < HANDLES; i += 1) {
        const el = labelRefs.current[i];
        if (!el) continue;
        const bx = verts[i].x / aspect;
        const by = verts[i].y;
        el.style.transform = `translate(${bx * boxW - half}px, ${(1 - by) * boxH - half}px)`;
        el.textContent = `${Math.round(clamp(bx * 100, 0, 100))}, ${Math.round(clamp(by * 100, 0, 100))}`;
      }
    };

    const draw = () => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.uniform1i(U.uMap, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform2f(U.uRes, boxW, boxH);
      const px = drawFontPx();
      gl.uniform2f(U.uAtlas, atlasRatioW * px, atlasRatioH * px);
      gl.uniform2f(U.uPtr, eased.x, eased.y);
      gl.uniform1f(U.uReach, Math.max(1, reach) / boxW);
      gl.uniform3f(U.uText, ...textRgb);
      gl.uniform3f(U.uShade, ...shadeRgb);
      gl.uniform4f(U.uAccent, accentRgb[0], accentRgb[1], accentRgb[2], accentAlpha);
      gl.uniform2f(U.uV0, verts[0].x, verts[0].y);
      gl.uniform2f(U.uV1, verts[1].x, verts[1].y);
      gl.uniform2f(U.uV2, verts[2].x, verts[2].y);
      gl.uniform1f(U.uHalf, 109 / 2 / boxH);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    let raf = 0;
    let last = 0;
    let sizeDirty = true;
    const frame = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      if (sizeDirty) {
        sizeDirty = false;
        resize();
      }
      const key = `${dpr}|${Math.ceil(drawFontPx() / 64)}`;
      if (key !== atlasKey) {
        atlasKey = key;
        rebuildAtlas();
      }
      step(dt);
      writeLabels();
      draw();
      canvas.dataset.ready = "true";
      // With reduced motion, draw only when something changes.
      raf = !document.hidden && !reducedMotion.current ? requestAnimationFrame(frame) : 0;
    };
    const requestFrame = () => {
      if (!raf && !document.hidden) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    const onMove = (event: PointerEvent) => {
      hasPointer = true;
      const rect = host.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      target.x = (event.clientX - rect.left) / rect.width;
      target.y = 1 - (event.clientY - rect.top) / rect.height;
      requestFrame();
    };
    // Listen on the parent section, so the reveal follows the pointer even
    // over the heading text that sits on top of the canvas.
    const pointerArea = host.parentElement ?? host;
    pointerArea.addEventListener("pointermove", onMove);

    const resizeObserver = new ResizeObserver(() => {
      sizeDirty = true;
      requestFrame();
    });
    resizeObserver.observe(host);
    const onVisibility = () => requestFrame();
    document.addEventListener("visibilitychange", onVisibility);
    // Re-bake once the web font has loaded so fallback glyphs are not kept.
    document.fonts?.ready.then(() => {
      if (!alive) return;
      atlasKey = "";
      requestFrame();
    });
    requestFrame();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      pointerArea.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
      gl.deleteTexture(texture);
      gl.deleteBuffer(quad);
      gl.deleteProgram(program);
    };
  }, [text, fontFamily, fontWeight, fontSize, textColor, shade, accent, accentAlpha, reach, reducedMotion]);

  return (
    <div ref={hostRef} aria-hidden="true" className={className} style={{ position: "relative", overflow: "hidden" }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block size-full opacity-0 transition-opacity duration-700 data-[ready=true]:opacity-100"
      />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          ref={(el) => {
            labelRefs.current[i] = el;
          }}
          className="pointer-events-none absolute top-0 left-0 font-mono text-[11px] tracking-[0.08em] whitespace-nowrap"
          style={{ opacity: LABEL_OPACITY, color: accent }}
        />
      ))}
    </div>
  );
}
