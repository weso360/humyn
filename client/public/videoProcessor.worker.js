/* global OffscreenCanvas, VideoFrame */
let active = false;
let fx = { brightness: 1, contrast: 1, saturation: 1, lut: 'none', digitalZoom: 1, panX: 0, panY: 0, lutStrength: 1 };
let lut = null;

const LOOKS = {
  none: '', cinematic: 'contrast(1.1) saturate(.85) sepia(.12)', vivid: 'saturate(1.45) contrast(1.15)',
  moody: 'contrast(1.2) saturate(.7) brightness(.9)', warm: 'sepia(.28) saturate(1.1) hue-rotate(-6deg)',
  cool: 'hue-rotate(8deg) saturate(1.05)', bw: 'grayscale(1) contrast(1.1)', vintage: 'sepia(.4) contrast(.9) saturate(.8)',
};

const VERTEX = `attribute vec2 p; varying vec2 uv; void main(){uv=(p+1.0)*.5;gl_Position=vec4(p,0,1);}`;
const FRAGMENT = `precision mediump float; varying vec2 uv; uniform sampler2D src; uniform sampler2D lutTex; uniform float lutSize; uniform float useLut; uniform float strength;
vec3 applyLut(vec3 c){float n=lutSize;float b=c.b*(n-1.0);float b0=floor(b);float b1=min(n-1.0,b0+1.0);float x0=(b0*n+c.r*(n-1.0)+.5)/(n*n);float x1=(b1*n+c.r*(n-1.0)+.5)/(n*n);float y=(c.g*(n-1.0)+.5)/n;return mix(texture2D(lutTex,vec2(x0,y)).rgb,texture2D(lutTex,vec2(x1,y)).rgb,fract(b));}
void main(){vec4 c=texture2D(src,uv);if(useLut>.5)c.rgb=mix(c.rgb,applyLut(c.rgb),strength);gl_FragColor=c;}`;

function shader(gl, type, source) { const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s); return s; }
function createRenderer(width, height) {
  const base = new OffscreenCanvas(width, height), output = new OffscreenCanvas(width, height);
  const ctx = base.getContext('2d');
  const gl = output.getContext('webgl', { preserveDrawingBuffer: true, alpha: false });
  const program = gl.createProgram(); gl.attachShader(program, shader(gl, gl.VERTEX_SHADER, VERTEX)); gl.attachShader(program, shader(gl, gl.FRAGMENT_SHADER, FRAGMENT)); gl.linkProgram(program); gl.useProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(program, 'p'); gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  const texture = () => { const t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,t); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR); return t; };
  return { base, output, ctx, gl, sourceTex: texture(), lutTex: texture(), uploadedLut: null, uniforms: { src: gl.getUniformLocation(program,'src'), lutTex: gl.getUniformLocation(program,'lutTex'), lutSize: gl.getUniformLocation(program,'lutSize'), useLut: gl.getUniformLocation(program,'useLut'), strength: gl.getUniformLocation(program,'strength') } };
}

function render(frame, r) {
  const { width, height } = r.base;
  r.ctx.filter = `brightness(${fx.brightness}) contrast(${fx.contrast}) saturate(${fx.saturation}) ${LOOKS[fx.lut] || ''}`;
  const z = Math.max(1, fx.digitalZoom || 1), sw = frame.displayWidth / z, sh = frame.displayHeight / z;
  const sx = (frame.displayWidth - sw) * (.5 + (fx.panX || 0) * .5), sy = (frame.displayHeight - sh) * (.5 + (fx.panY || 0) * .5);
  r.ctx.drawImage(frame, sx, sy, sw, sh, 0, 0, width, height);
  const { gl, uniforms } = r; gl.viewport(0,0,width,height); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,r.sourceTex); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,r.base); gl.uniform1i(uniforms.src,0);
  if (fx.lut === 'custom' && lut) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,r.lutTex); if (r.uploadedLut !== lut) { gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,lut.width,lut.height,0,gl.RGBA,gl.UNSIGNED_BYTE,lut.pixels); r.uploadedLut=lut; } gl.uniform1i(uniforms.lutTex,1); gl.uniform1f(uniforms.lutSize,lut.size); gl.uniform1f(uniforms.useLut,1); gl.uniform1f(uniforms.strength,fx.lutStrength); } else gl.uniform1f(uniforms.useLut,0);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
}

async function process(readable, writable) {
  const reader = readable.getReader(), writer = writable.getWriter(); let renderer;
  try { while (active) { const { value: frame, done } = await reader.read(); if (done) break; try { if (!renderer || renderer.base.width !== frame.displayWidth || renderer.base.height !== frame.displayHeight) renderer=createRenderer(frame.displayWidth,frame.displayHeight); render(frame,renderer); const output=new VideoFrame(renderer.output,{timestamp:frame.timestamp,duration:frame.duration}); await writer.write(output); output.close(); } finally { frame.close(); } } }
  catch (error) { self.postMessage({ type:'error', message:error.message }); }
  finally { try { await reader.cancel(); } catch (_) {} try { await writer.close(); } catch (_) {} }
}

self.onmessage = event => {
  const data = event.data;
  if (data.type === 'start') { active=true; fx=data.fx || fx; lut=data.lut || null; process(data.readable,data.writable); }
  if (data.type === 'effects') fx=data.fx || fx;
  if (data.type === 'lut') lut=data.lut || null;
  if (data.type === 'stop') active=false;
};
