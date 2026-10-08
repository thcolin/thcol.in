var e=globalThis.parcelRequiredc51;(0,e.register)("lXdFx",function(a,o){Object.defineProperty(a.exports,"mountAurora",{get:()=>n,set:void 0,enumerable:!0,configurable:!0});var t=e("4xklQ"),r=e("1gulE"),u=e("2bh7P");let l=`
      uniform vec3 iResolution;
      
      uniform float uWavePhase;
      uniform float uPatternPhase;
      uniform float uWaveHeight;

      uniform float uWave1Freq;
      uniform float uWave1Amp;
      uniform float uWave2Freq;
      uniform float uWave2Amp;
      uniform float uWave3FreqX;
      uniform float uWave3FreqZ;
      uniform float uWave3Amp;

      uniform float uNoiseAmount;
      uniform float uFoldingOffset;
      uniform float uStepBase;
      uniform float uGlowIntensity;
      uniform float uGlowSpread;
      uniform float uHue;
      uniform vec3 uColorA;
      uniform vec3 uColorB;

      float generateFineNoise(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 8.6231);
        p3 += dot(p3, p3.yzx + 67.92);
        return fract((p3.x + p3.y) * p3.z);
      }

      vec3 hueRotate(vec3 c, float a) {
        float ca = cos(a);
        float sa = sin(a);
        mat3 m = mat3(
          0.299 + 0.701 * ca + 0.168 * sa, 0.587 - 0.587 * ca + 0.330 * sa, 0.114 - 0.114 * ca - 0.497 * sa,
          0.299 - 0.299 * ca - 0.328 * sa, 0.587 + 0.413 * ca + 0.035 * sa, 0.114 - 0.114 * ca + 0.292 * sa,
          0.299 - 0.300 * ca + 1.250 * sa, 0.587 - 0.588 * ca - 1.050 * sa, 0.114 + 0.886 * ca - 0.203 * sa
        );
        return clamp(m * c, 0.0, 100.0);
      }

      void main() {
        vec2 fragCoord = gl_FragCoord.xy;
        vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;

        vec3 rayDir = normalize(vec3(uv, 1.0));

        vec4 finalColor = vec4(0.0);
        float totalDistance = 0.0;

        float pixelNoise = generateFineNoise(fragCoord) * uNoiseAmount;

        for (int i = 0; i < 38; i++) {
          vec3 currentPos = rayDir * totalDistance;
          currentPos.z -= 2.0;

          float wTime = uWavePhase;
          float waveHeight = (sin(currentPos.x * uWave1Freq + wTime) * uWave1Amp +
                              sin(currentPos.z * uWave2Freq - wTime * 0.6) * uWave2Amp +
                              sin((currentPos.x * uWave3FreqX) - (currentPos.z * uWave3FreqZ) + (wTime * 1.6)) * uWave3Amp) * uWaveHeight;

          float distToWave = abs(currentPos.y - waveHeight);

          currentPos /= uFoldingOffset;

          float stepSize = min(distToWave - 0.080, pixelNoise) + uStepBase;
          totalDistance += stepSize;

          float patternX = sin(currentPos.x + cos(currentPos.y) * cos(currentPos.z));
          float patternY = sin(currentPos.z + sin(currentPos.y) * cos(currentPos.x + uPatternPhase));
          float basePattern = smoothstep(0.5, 0.7, patternX * patternY);

          float blendFactor = 0.15 / (distToWave * distToWave + 0.01);
          float mixedPattern = mix(basePattern, 1.0, blendFactor);

          float glow = uGlowIntensity / (uGlowSpread + stepSize);
          float distanceFade = smoothstep(36.5, 7.3, totalDistance);
          vec3 paletteColor = 2.0 * mix(uColorA, uColorB, 0.5 + 0.5 * cos(totalDistance * 3.0));

          finalColor.rgb += glow * mixedPattern * distanceFade * paletteColor;
        }

        if (uHue != 0.0) {
          finalColor.rgb = hueRotate(finalColor.rgb, uHue);
        }

        float dither = (generateFineNoise(fragCoord + vec2(12.34, 56.78)) - 0.5) / 128.0;
        finalColor.rgb += vec3(dither);

        gl_FragColor = vec4(finalColor.rgb, 1.0);
      }
    `,n=(e,{colors:a,still:o})=>{let n=(0,u.acquireRenderer)(),i=n.domElement;i.className="teevy-aurora__canvas",e.appendChild(i);let s=n.getPixelRatio(),v={iResolution:{value:new t.Vector3(1,1,1)},uWavePhase:{value:0},uPatternPhase:{value:0},uWaveHeight:{value:1},uWave1Freq:{value:4.8},uWave1Amp:{value:.038},uWave2Freq:{value:.3},uWave2Amp:{value:-.09},uWave3FreqX:{value:-.6},uWave3FreqZ:{value:-.7},uWave3Amp:{value:.12},uNoiseAmount:{value:.004},uFoldingOffset:{value:9.291},uStepBase:{value:.146},uGlowIntensity:{value:.0085},uGlowSpread:{value:5.1},uHue:{value:0},uColorA:{value:new t.Color(a[0])},uColorB:{value:new t.Color(a[1])}},c=new t.ShaderMaterial({vertexShader:"void main() { gl_Position = vec4(position, 1.0); }",fragmentShader:l,uniforms:v,depthTest:!1,depthWrite:!1}),f=new t.PlaneGeometry(2,2),m=new r.Scene;m.add(new t.Mesh(f,c));let d=new t.OrthographicCamera(-1,1,1,-1,0,1),p=0,h=performance.now(),P=0,g=0,W=()=>{n.setSize(e.clientWidth,e.clientHeight,!1),v.iResolution.value.set(e.clientWidth*s,e.clientHeight*s,1)},F=()=>{let e=performance.now(),a=Math.min((e-h)/1e3,.05);h=e;let o=Math.max(0,Math.sin(e/1e3*Math.PI*2*(95/60)))**4,t=.25+.35*o;g+=.5*a*(1+.5*t),P+=.5*a*(1+.5*t)*(1+.9*t),v.uWavePhase.value=P,v.uPatternPhase.value=g,v.uWaveHeight.value=+(1+.6*o),v.uGlowIntensity.value=.0085*(1+.8*t),n.render(m,d),p=requestAnimationFrame(F)},w=new ResizeObserver(W);return w.observe(e),W(),o?(v.uWavePhase.value=1.2,v.uPatternPhase.value=1.2,n.render(m,d)):F(),()=>{cancelAnimationFrame(p),w.disconnect(),f.dispose(),c.dispose(),i.parentNode===e&&e.removeChild(i),i.className="",(0,u.releaseRenderer)(n)}}});