var e=globalThis.parcelRequiredc51;(0,e.register)("iDRqh",function(t,o){Object.defineProperty(t.exports,"PspIntro",{get:()=>E,set:void 0,enumerable:!0,configurable:!0});var a=e("iM5HV"),l=e("fYo6y"),r=e("1gulE"),n=e("4xklQ"),u=e("2bh7P");let s=["M125 181 H252 V213 H127 V250","M392 181 H327 V248 H255","M413 181 H540 V213 H415 V250"],i="#6d7290",c=[["Sony",177,47.5],["Computer",227.5,96.5],["Entertainment",328.5,137]],v=[[.26,0,.16],[.32,.22,.18],[.42,.59,.2],[.52,.76,.24],[.62,.88,.26],[.82,.88,.3],[.92,.61,.32],[1.02,.44,.32],[1.12,.49,.14],[1.22,.28,.12],[1.32,.23,.08],[1.42,.17,.12],[1.52,.27,.2],[1.62,.52,.32],[1.72,.61,.42],[1.82,.67,.78],[1.92,.71,.8],[2.12,.7,.94],[2.22,.69,1.04],[2.42,.61,1.06],[2.62,.55,1.1],[2.82,.63,1.1],[2.9,.12,1.1],[2.98,0,1.1]],f=[[.9,.98,0],[1.5,.888,.14],[2,.845,.35],[2.5,.8,.55],[3.05,.75,.4],[3.45,.75,0]],p=[[2.7,"#4d86c9","#4f8ed6"],[3.2,"#92afcb","#8dafd4"],[4.2,"#7a93af","#7392b8"],[5.5,"#8491a6","#7e8eae"],[7.2,"#9898a8","#9795b0"],[8.4,"#a8a7aa","#b6adb0"],[10.35,"#a4a9a7","#aeabae"]],m=[[3.05,.3],[7.2,.3],[8.4,.07],[10.35,.07]],R=e=>e<0?0:e>1?1:e,d=(e,t,o)=>R((e-t)/(o-t)),y=e=>e*e*(3-2*e),_=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,h=`
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec3 uTop;
uniform vec3 uBottom;
uniform float uWave;
uniform float uWaveMix;
uniform vec3 uRay;
uniform vec2 uGlow;

const float RAY_Y0 = 0.5070;
const float RAY_Y1 = 0.4986;
const float RAY_CORE = 0.0055;
const float RAY_UP = 0.0220;
const float RAY_DOWN = 0.0045;
const vec3 RAY_CORE_COL = vec3(0.55, 0.76, 1.0);
const vec3 RAY_HALO_COL = vec3(0.03, 0.42, 1.0);
const float RAY_HALO_MIX = 0.30;
const float RAY_GAIN = 1.200;
const vec3 GLOW_COL = vec3(0.35, 0.64, 1.0);

const float FREQ = 4.2900;
const float OUTER_SPEED = 0.0440;
const float INNER_SPEED = 0.0640;
const float OUTER_AMP = 0.5000;
const float INNER_AMP = 0.1800;
const float OUTER_F1 = 2.0000;
const float OUTER_F2 = 2.0000;
const float INNER_F1 = 1.0000;
const float INNER_F2 = 1.0000;

float outerWave(vec2 uv, float k) {
  return sin((uv.x + (uTime * (OUTER_SPEED + 0.0025 * k))) * FREQ) * OUTER_AMP;
}
float innerWave(vec2 uv, float k) {
  return sin((uv.x + (uTime * (INNER_SPEED + 0.0025 * k))) * FREQ) * INNER_AMP;
}

float rayBell(float u) {
  float d = (u - 0.46) / 0.30;
  return 0.34 + 0.66 * exp(-d * d);
}

vec2 rayShape(float sy, float u) {
  float d = sy - mix(RAY_Y0, RAY_Y1, u);
  float core = exp(-(d / RAY_CORE) * (d / RAY_CORE));
  float halo = exp(-abs(d) / (d < 0.0 ? RAY_UP : RAY_DOWN));
  return vec2(core, halo);
}

float rayLit(float u) {
  return uRay.z + (1.0 - uRay.z) * (1.0 - smoothstep(uRay.y - 0.16, uRay.y, u));
}

void main() {
  vec2 uv = vUv;

  float topOuter = outerWave(uv, 1.0);
  float bottomOuter = outerWave(uv, 20.0);
  float topInner = innerWave(uv, 8.0);
  float bottomInner = innerWave(uv, 40.0);

  float topOuterF = topOuter;
  float bottomOuterF = bottomOuter;
  float topInnerF = topInner;
  float bottomInnerF = bottomInner;

  topOuter += 1.0 - (1.0 - uv.y) * 6.0;
  bottomOuter += 1.0 - (uv.y * 6.0);
  topInner += 1.0 - (uv.y) * 2.5;
  bottomInner += 1.0 - (1.0 - uv.y) * 2.5;

  topOuterF += 1.0 - (1.0 - uv.y - 0.2) * 6.0;
  bottomOuterF += 1.0 - ((uv.y - 0.2) * 6.0);
  topInnerF += 1.0 - ((uv.y - 0.1) * 2.2);
  bottomInnerF += 1.0 - (((1.0 - uv.y - 0.1)) * 2.2);

  float w1 = 1.0 - smoothstep(0.0, 0.025, topOuter);
  float w2 = 1.0 - smoothstep(0.0, 0.025, bottomOuter);
  float w3 = 1.0 - smoothstep(0.0, 0.025, topInner);
  float w4 = 1.0 - smoothstep(0.0, 0.025, bottomInner);

  float f1 = 1.0 - smoothstep(0.0, OUTER_F1, topOuterF);
  float f2 = 1.0 - smoothstep(0.0, OUTER_F2, bottomOuterF);
  float f3 = 1.0 - smoothstep(0.0, INNER_F1, topInnerF);
  float f4 = 1.0 - smoothstep(0.0, INNER_F2, bottomInnerF);

  w1 = clamp(w1 - f1, 0.0, 1.0);
  w2 = clamp(w2 - f2, 0.0, 1.0);
  w3 = clamp(w3 - f3, 0.0, 1.0);
  w4 = clamp(w4 - f4, 0.0, 1.0);

  float wave = clamp(w1 + w2 + w3 + w4, 0.0, 1.0) * uWave * uWaveMix;

  vec3 base = mix(uBottom, uTop, uv.y);
  vec3 col = mix(base, vec3(1.0), wave);

  float sy = 1.0 - uv.y;
  float lit = uRay.x * rayLit(uv.x) * rayBell(uv.x) * RAY_GAIN;
  vec2 shape = rayShape(sy, uv.x);
  col += lit * (RAY_CORE_COL * shape.x + RAY_HALO_COL * shape.y * RAY_HALO_MIX);

  col += GLOW_COL * uGlow.y * clamp((sy - uGlow.x) / max(1e-4, 0.975 - uGlow.x), 0.0, 1.0);

  gl_FragColor = vec4(min(col, vec3(1.0)), 1.0);
}
`;function x(e,t){let o=parseInt(t.slice(1),16);return e.setRGB((o>>16&255)/255,(o>>8&255)/255,(255&o)/255,n.LinearSRGBColorSpace)}let w=new n.Color;function O(e,t,o){let a=0;for(;a<p.length-2&&p[a+1][0]<e;)a++;let l=p[a],r=p[a+1],n=R((e-l[0])/(r[0]-l[0]));x(o,l[t]).lerp(x(w,r[t]),n)}function A(e,t,o){let a=e[0],l=e[e.length-1];if(t<=a[0])return void o.set(a[1],a[2]);if(t>=l[0])return void o.set(l[1],l[2]);let r=0;for(;r<e.length-2&&e[r+1][0]<t;)r++;let n=e[r],u=e[r+1],s=R((t-n[0])/(u[0]-n[0]));o.set(n[1]+(u[1]-n[1])*s,n[2]+(u[2]-n[2])*s)}function E({onDone:e}){let t=(0,l.useRef)(null),o=(0,l.useRef)(null),w=(0,l.useRef)(null),C=(0,l.useRef)(null),b=(0,l.useRef)(e);return b.current=e,(0,l.useEffect)(()=>{let e,a,l=t.current,s=o.current,i=w.current,c=C.current;if(!l||!s||!i||!c)return;let E=!1,g=!1,F=0,N=0,I=()=>{g||E||(g=!0,F&&cancelAnimationFrame(F),F=0,clearTimeout(N),b.current())},Y=(0,u.acquireRenderer)(),T=Y.domElement;T.className="teevy-pspintro__canvas",l.insertBefore(T,s);let W=Y.getPixelRatio(),P=Y.getClearColor(new n.Color),S=Y.getClearAlpha(),L=Y.outputColorSpace;Y.setPixelRatio(1),Y.setClearColor(0,1),Y.outputColorSpace=n.SRGBColorSpace;let M=new r.Scene,G=new r.Camera,j=new n.PlaneGeometry(2,2),U={uTime:{value:0},uTop:{value:x(new n.Color,p[0][1])},uBottom:{value:x(new n.Color,p[0][2])},uWave:{value:0},uWaveMix:{value:m[0][1]},uRay:{value:new n.Vector3(0,v[0][2],0)},uGlow:{value:new n.Vector2(f[0][1],0)}},H=new n.ShaderMaterial({vertexShader:_,fragmentShader:h,uniforms:U,depthTest:!1,depthWrite:!1});M.add(new n.Mesh(j,H));let B=()=>{let e=l.clientWidth,t=l.clientHeight;e&&t&&Y.setSize(e,t,!1)},k=new ResizeObserver(B);k.observe(l),B();let V=new n.Color(0),D=new n.Color,q=new n.Color,z=new n.Vector2,Q=e=>{U.uTime.value=e,O(e,1,D),O(e,2,q);let t=1-y(d(e,10.3,10.35)),o=y(d(e,2.7,3.05));U.uTop.value.copy(V).lerp(D,o*t),U.uBottom.value.copy(V).lerp(q,o*t),U.uWave.value=o,U.uWaveMix.value=function(e,t){let o=e[0],a=e[e.length-1];if(t<=o[0])return o[1];if(t>=a[0])return a[1];let l=0;for(;l<e.length-2&&e[l+1][0]<t;)l++;let r=e[l],n=e[l+1];return r[1]+(n[1]-r[1])*R((t-r[0])/(n[0]-r[0]))}(m,e),A(v,e,z),U.uRay.value.set(z.x*t,z.y,.25*R((e-.35)/.65)),A(f,e,U.uGlow.value),U.uGlow.value.y*=t,i.style.opacity=(d(e,.31,.62)*(1-d(e,1.85,2.22))).toFixed(3),c.style.opacity=(d(e,7.2,8)*t).toFixed(3),Y.render(M,G)};return Q(0),e=performance.now(),a=()=>{let t=(performance.now()-e)/1e3;(Q(Math.min(t,10.35)),t>=10.35)?I():F=requestAnimationFrame(a)},F=requestAnimationFrame(a),N=window.setTimeout(I,12350),()=>{E=!0,F&&cancelAnimationFrame(F),clearTimeout(N),k.disconnect(),j.dispose(),H.dispose(),M.clear(),T.parentNode===l&&l.removeChild(T),T.className="",Y.setPixelRatio(W),Y.setClearColor(P,S),Y.outputColorSpace=L,(0,u.releaseRenderer)(Y)}},[]),(0,a.jsx)("div",{className:"teevy-pspintro",ref:t,"aria-hidden":"true",children:(0,a.jsx)("div",{className:"teevy-pspintro__overlay",ref:o,children:(0,a.jsxs)("svg",{className:"teevy-pspintro__svg",viewBox:"0 0 640 480",preserveAspectRatio:"xMidYMid meet",children:[(0,a.jsx)("g",{ref:w,opacity:0,children:c.map(([e,t,o])=>(0,a.jsx)("text",{className:"teevy-pspintro__sce",x:t,y:237.5,fill:"#d6e5f8",textLength:o,lengthAdjust:"spacingAndGlyphs",children:e},e))}),(0,a.jsxs)("g",{ref:C,opacity:0,children:[s.map(e=>(0,a.jsx)("path",{d:e,fill:"none",stroke:i,strokeWidth:3.5,strokeLinecap:"butt",strokeLinejoin:"miter"},e)),(0,a.jsx)("text",{className:"teevy-pspintro__tm",x:553,y:246,fill:i,children:"™"}),(0,a.jsxs)("text",{className:"teevy-pspintro__sub",x:330,y:301,fill:i,textAnchor:"middle",textLength:275,lengthAdjust:"spacingAndGlyphs",children:["PlayStation",(0,a.jsx)("tspan",{className:"teevy-pspintro__reg",children:"®"}),"Portable"]})]})]})})})}});