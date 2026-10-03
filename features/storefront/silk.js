/* Silk - the hero's 3D strand.
   A satin lock of hair coils around the real product jar in true depth
   (it passes behind and in front of the jar). Its curl tightness follows the
   hair type the product suits, and its colours come from the jar itself.
   Raw WebGL, no dependencies, about one draw of 5k triangles per frame. */
  var VS = [
    'attribute vec2 aUV;',
    'uniform mat4 uPV; uniform float uTime, uCurl, uSpin;',
    'varying vec3 vN, vT, vP; varying vec2 vUV;',
    'vec3 center(float u){',
    '  float turns = mix(1.1, 2.9, uCurl);',
    '  float a = u * turns * 6.28318 + uSpin;',
    '  float R = mix(1.34, 1.1, uCurl) + 0.08 * sin(u * 7.0 + uTime * 0.55);',
    '  float y = mix(-1.18, 1.22, u) + 0.07 * sin(u * 11.0 - uTime * 0.7);',
    '  vec3 c = vec3(cos(a) * R, y, sin(a) * R);',
    '  float a2 = u * turns * 6.28318 * 4.0 - uTime * 0.35;',
    '  vec3 rad = vec3(cos(a), 0.0, sin(a));',
    '  c += uCurl * uCurl * 0.15 * (cos(a2) * rad + sin(a2) * vec3(0.0, 1.0, 0.0));',
    '  return c;',
    '}',
    'vec3 surf(float u, float v){',
    '  vec3 c = center(u);',
    '  vec3 t = normalize(center(u + 0.004) - center(u - 0.004));',
    '  vec3 rad = normalize(vec3(c.x, 0.0, c.z));',
    '  vec3 w = normalize(cross(t, rad));',
    '  vec3 b = cross(t, w);',
    '  float tw = u * 4.2 + uTime * 0.22;',
    '  vec3 dir = cos(tw) * w + sin(tw) * b;',
    '  float taper = smoothstep(0.0, 0.16, u) * smoothstep(1.0, 0.8, u);',
    '  float front = smoothstep(-0.25, 0.55, c.z / 1.2);',
    '  float hw = mix(0.2, 0.125, uCurl) * taper * mix(1.0, 0.42, front);',
    '  return c + dir * v * hw + b * (1.0 - v * v) * 0.035 * taper;',
    '}',
    'void main(){',
    '  float u = aUV.x, v = aUV.y;',
    '  vec3 p = surf(u, v);',
    '  vec3 du = surf(u + 0.003, v) - surf(u - 0.003, v);',
    '  vec3 dv = surf(u, v + 0.05) - surf(u, v - 0.05);',
    '  vN = normalize(cross(du, dv)); vT = normalize(du); vP = p; vUV = aUV;',
    '  gl_Position = uPV * vec4(p, 1.0);',
    '}'
  ].join('\n');

  var FS = [
    'precision mediump float;',
    'uniform vec3 uC1, uC2, uEye;',
    'varying vec3 vN, vT, vP; varying vec2 vUV;',
    'void main(){',
    '  vec3 V = normalize(uEye - vP);',
    '  vec3 N = normalize(vN); float face = dot(N, V) < 0.0 ? -1.0 : 1.0; N *= face;',
    '  vec3 L = normalize(vec3(-0.55, 0.85, 0.75));',
    '  vec3 H = normalize(L + V);',
    '  vec3 T = normalize(vT);',
    '  float strands = 0.90 + 0.10 * sin(vUV.y * 26.0 + sin(vUV.x * 40.0) * 1.5);',
    '  vec3 base = mix(uC1, uC2, smoothstep(0.15, 0.85, vUV.x + vUV.y * 0.12)) * strands;',
    '  float wrap = 0.5 + 0.5 * dot(N, L);',
    '  float th = dot(T, H);',
    '  float aniso = pow(sqrt(max(0.0, 1.0 - th * th)), 46.0);',
    '  float aniso2 = pow(sqrt(max(0.0, 1.0 - th * th)), 9.0);',
    '  float fres = pow(1.0 - abs(dot(N, V)), 3.0);',
    '  vec3 col = base * (0.30 + 0.82 * wrap);',
    '  col += mix(base, vec3(1.0), 0.75) * aniso * 0.62 * strands;',
    '  col += base * aniso2 * 0.22;',
    '  col += mix(base, vec3(1.0), 0.5) * fres * 0.28;',
    '  col *= face < 0.0 ? 0.78 : 1.0;',
    '  col *= 1.0 - 0.22 * vUV.y * vUV.y;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  var QVS = 'precision mediump float; attribute vec2 aP; uniform mat4 uPV; uniform vec4 uRect; uniform float uGround; varying vec2 vQ;' +
    'void main(){ vQ = aP * 0.5 + 0.5; vec3 p = uGround > 0.5 ? vec3(aP.x * uRect.z, uRect.y, aP.y * uRect.w) : vec3(uRect.x + aP.x * uRect.z, uRect.y + aP.y * uRect.w, 0.0); gl_Position = uPV * vec4(p, 1.0); }';
  var QFS = 'precision mediump float; uniform sampler2D uTex; uniform float uGround, uAlpha; varying vec2 vQ;' +
    'void main(){ if (uGround > 0.5) { float d = length(vQ - 0.5) * 2.0; float a = smoothstep(1.0, 0.1, d); gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0) * a * a * 0.34 * uAlpha; }' +
    ' else { vec4 c = texture2D(uTex, vec2(vQ.x, 1.0 - vQ.y)); c.rgb *= c.a; gl_FragColor = c * uAlpha; } }';

  function prog(gl, vs, fs) {
    var p = gl.createProgram();
    [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].forEach(function (s) {
      var sh = gl.createShader(s[0]); gl.shaderSource(sh, s[1]); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      gl.attachShader(p, sh);
    });
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  function hex(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
  function mul(a, b) { var o = new Float32Array(16); for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) { var s = 0; for (var k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }

export function Silk(canvas, opts) {
    opts = opts || {};
    var gl;
    try { gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'low-power' }); } catch (e) {}
    if (!gl) return null;
    var reduce = !!opts.reduce, P1, P2;
    try { P1 = prog(gl, VS, FS); P2 = prog(gl, QVS, QFS); } catch (e) { if (window.console) console.warn('Silk: ' + e.message); return null; }

    /* ribbon grid */
    var NU = 240, NV = 8, verts = [], idx = [];
    for (var i = 0; i <= NU; i++) for (var j = 0; j <= NV; j++) verts.push(i / NU, j / NV * 2 - 1);
    for (i = 0; i < NU; i++) for (j = 0; j < NV; j++) { var a = i * (NV + 1) + j, b = a + NV + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    var vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    var ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
    var qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    var U1 = {}, U2 = {};
    ['uPV', 'uTime', 'uCurl', 'uSpin', 'uC1', 'uC2', 'uEye'].forEach(function (n) { U1[n] = gl.getUniformLocation(P1, n); });
    ['uPV', 'uRect', 'uGround', 'uTex', 'uAlpha'].forEach(function (n) { U2[n] = gl.getUniformLocation(P2, n); });
    var aUV = gl.getAttribLocation(P1, 'aUV'), aP = gl.getAttribLocation(P2, 'aP');

    var tex = gl.createTexture(), hasTex = false, texCache = {};
    /* alpha is premultiplied in the shader, so the result never depends on how a browser decodes the image */
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

    var st = { c1: hex('#b4125f'), c2: hex('#f2a12a'), curl: 0.5, t1: null, t2: null, tcurl: 0.5, jar: 0, jarT: 1, yaw: 0, pitch: 0, tyaw: 0, tpitch: 0, time: 0, spin: 0 };
    st.t1 = st.c1.slice(); st.t2 = st.c2.slice();
    var W = 1, H = 1, running = false, raf = 0, last = 0, pending = null, tainted = false;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, opts.maxDpr || 2);
      var r = canvas.getBoundingClientRect();
      W = Math.max(2, Math.round(r.width * dpr)); H = Math.max(2, Math.round(r.height * dpr));
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      gl.viewport(0, 0, W, H);
      draw();
    }

    function upload(img) {
      try {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        hasTex = true; return true;
      } catch (e) { tainted = true; return false; }
    }

    function draw() {
      var asp = W / H, fov = 0.5, f = 1 / Math.tan(fov / 2);
      /* frame: fit the 2.9-unit tall, 3.3-unit wide coil */
      var dist = Math.max(1.5 * f, 1.62 * f / asp) + 0.9;
      var n = 0.5, fr = 30;
      var Pm = new Float32Array([f / asp, 0, 0, 0, 0, f, 0, 0, 0, 0, (fr + n) / (n - fr), -1, 0, 0, 2 * fr * n / (n - fr), 0]);
      var cy = Math.cos(st.yaw), sy = Math.sin(st.yaw), cx = Math.cos(st.pitch), sx = Math.sin(st.pitch);
      var Ry = new Float32Array([cy, 0, -sy, 0, 0, 1, 0, 0, sy, 0, cy, 0, 0, 0, 0, 1]);
      var Rx = new Float32Array([1, 0, 0, 0, 0, cx, sx, 0, 0, -sx, cx, 0, 0, 0, 0, 1]);
      var Tm = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -0.02, -dist, 1]);
      var PV = mul(Pm, mul(Tm, mul(Rx, Ry)));
      var eye = [-dist * sy * cx, dist * sx, dist * cy * cx];

      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      var k = st.jar, ease = 1 - Math.pow(1 - k, 3);

      /* ground shadow */
      gl.useProgram(P2); gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
      gl.bindBuffer(gl.ARRAY_BUFFER, qb); gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
      gl.uniformMatrix4fv(U2.uPV, false, PV); gl.uniform1f(U2.uGround, 1); gl.uniform1f(U2.uAlpha, ease);
      gl.uniform4f(U2.uRect, 0, -1.2, 1.25, 0.85); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      /* ribbon: opaque, writes depth */
      gl.useProgram(P1); gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.depthFunc(gl.LEQUAL); gl.disable(gl.BLEND);
      gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.enableVertexAttribArray(aUV); gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.uniformMatrix4fv(U1.uPV, false, PV); gl.uniform1f(U1.uTime, st.time); gl.uniform1f(U1.uCurl, st.curl); gl.uniform1f(U1.uSpin, st.spin);
      gl.uniform3fv(U1.uC1, st.c1); gl.uniform3fv(U1.uC2, st.c2); gl.uniform3fv(U1.uEye, eye);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);

      /* jar: blended, depth-tested against the ribbon so the strand wraps it */
      if (hasTex) {
        gl.useProgram(P2); gl.enable(gl.BLEND); gl.depthMask(false);
        gl.bindBuffer(gl.ARRAY_BUFFER, qb); gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
        gl.uniformMatrix4fv(U2.uPV, false, PV); gl.uniform1f(U2.uGround, 0); gl.uniform1f(U2.uAlpha, Math.min(1, k * 1.6));
        var bob = reduce ? 0 : Math.sin(st.time * 0.9) * 0.025, sc = 0.9 + 0.1 * ease;
        gl.uniform4f(U2.uRect, 0, 0.02 + bob - (1 - ease) * 0.12, 1.02 * sc, 1.18 * sc);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(U2.uTex, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }

    function frame(now) {
      raf = 0; if (!running) return;
      var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
      st.time += dt; st.spin += dt * 0.11;
      var e = 1 - Math.exp(-dt / 0.35);
      for (var i = 0; i < 3; i++) { st.c1[i] += (st.t1[i] - st.c1[i]) * e; st.c2[i] += (st.t2[i] - st.c2[i]) * e; }
      st.curl += (st.tcurl - st.curl) * (1 - Math.exp(-dt / 0.5));
      st.yaw += (st.tyaw - st.yaw) * (1 - Math.exp(-dt / 0.25)); st.pitch += (st.tpitch - st.pitch) * (1 - Math.exp(-dt / 0.25));
      if (st.jarT === 0) { st.jar = Math.max(0, st.jar - dt / 0.16); if (st.jar === 0 && pending) { upload(pending); pending = null; st.jarT = 1; } }
      else st.jar = Math.min(1, st.jar + dt / 0.6);
      draw();
      raf = requestAnimationFrame(frame);
    }

    var api = {
      ok: true,
      resize: resize,
      get tainted() { return tainted; },
      set: function (p) {
        st.t1 = hex(p.r1); st.t2 = hex(p.r2); st.tcurl = p.curl;
        var apply = function (img) {
          if (reduce || !hasTex) { if (upload(img)) { st.jar = reduce ? 1 : 0; st.jarT = 1; if (reduce) { st.c1 = st.t1.slice(); st.c2 = st.t2.slice(); st.curl = st.tcurl; draw(); } if (opts.onReady) opts.onReady(); } else if (opts.onFail) opts.onFail(); }
          else { pending = img; st.jarT = 0; }
        };
        if (texCache[p.src]) return apply(texCache[p.src]);
        var img = new Image(); img.decoding = 'async'; img.crossOrigin = 'anonymous';
        img.onload = function () { texCache[p.src] = img; apply(img); };
        img.src = p.src;
      },
      tilt: function (x, y) { st.tyaw = x * 0.2; st.tpitch = y * 0.1; },
      start: function () { if (reduce) { draw(); return; } if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); },
      stop: function () { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    };
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); api.stop(); if (opts.onFail) opts.onFail(); });
    resize();
    return api;
}
