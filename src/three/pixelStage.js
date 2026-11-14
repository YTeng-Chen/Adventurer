// 3D 像素風舞台：先用低解析度算出畫面，再放大成清楚的方格。
// 描邊有三種：外輪廓（黑線）、前後交疊處（黑線）、表面轉折處（該顏色的深色，像手繪像素圖的暗線）。
// 鏡頭固定在正前方（略往下看），和遊戲的橫向畫面一致；要看側面時轉的是角色。
import * as THREE from 'three';

const POST_VERT = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const POST_FRAG = `
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform sampler2D tNormal;
uniform vec2 texel;
uniform vec3 ink;
uniform float depthEdge;
uniform float normalEdge;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tColor, vUv);
  float d = texture2D(tDepth, vUv).r;
  vec4 nm = texture2D(tNormal, vUv);
  vec3 n = nm.rgb * 2.0 - 1.0;
  float outline = 0.0;
  float crease = 0.0;
  vec2 offs[4];
  offs[0] = vec2(texel.x, 0.0); offs[1] = vec2(-texel.x, 0.0); offs[2] = vec2(0.0, texel.y); offs[3] = vec2(0.0, -texel.y);
  for (int i = 0; i < 4; i++) {
    vec4 nc = texture2D(tColor, vUv + offs[i]);
    float nd = texture2D(tDepth, vUv + offs[i]).r;
    vec4 nn = texture2D(tNormal, vUv + offs[i]);
    if (c.a < 0.9 && nc.a > 0.9) outline = 1.0;                              // 外輪廓：畫在角色外面一格
    if (c.a > 0.9 && nc.a > 0.9) {
      if (d - nd > depthEdge) outline = 1.0;                                 // 被前面的東西擋住的邊
      else if (nn.a > 0.5 && dot(n, nn.rgb * 2.0 - 1.0) < normalEdge && d >= nd) crease = 1.0;   // 表面轉折
    }
  }
  vec4 outc = c;
  if (crease > 0.5) outc = vec4(c.rgb * 0.5, 1.0);
  if (outline > 0.5) outc = vec4(ink, 1.0);
  gl_FragColor = outc;
  #include <colorspace_fragment>
}
`;

export class PixelStage {
  // w、h：低解析度（像素格數）；pxPerUnit：1 個世界單位畫成幾格；lookY：鏡頭對準的高度
  constructor(canvas, { w, h, pxPerUnit = 1, lookY = 45, pitch = 0.14 } = {}) {
    this.w = w; this.h = h;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(w, h, false);
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    const viewW = w / pxPerUnit, viewH = h / pxPerUnit;
    this.camera = new THREE.OrthographicCamera(-viewW / 2, viewW / 2, viewH / 2, -viewH / 2, 1, 600);
    const dist = 300;
    this.camera.position.set(0, lookY + Math.sin(pitch) * dist, Math.cos(pitch) * dist);
    this.camera.lookAt(0, lookY, 0);

    // 燈光：左上前方的主光＋環境光＋右後方的補光；卡通材質把明暗分成幾階
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.25));
    const sun = new THREE.DirectionalLight(0xffffff, 2.0);
    sun.position.set(-140, 200, 170);
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0xffffff, 0.35);
    rim.position.set(160, 60, -120);
    this.scene.add(rim);

    const opts = { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter };
    this.target = new THREE.WebGLRenderTarget(w, h, { ...opts, depthTexture: new THREE.DepthTexture(w, h) });
    this.normalTarget = new THREE.WebGLRenderTarget(w, h, opts);
    this.normalMat = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
    this.skipInNormalPass = [];   // 影子這類不參與描邊的物件
    this.post = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: this.target.texture }, tDepth: { value: this.target.depthTexture }, tNormal: { value: this.normalTarget.texture },
        texel: { value: new THREE.Vector2(1 / w, 1 / h) }, ink: { value: new THREE.Color('#17141b') },
        depthEdge: { value: 0.004 }, normalEdge: { value: 0.45 },
      },
      vertexShader: POST_VERT, fragmentShader: POST_FRAG, transparent: true, depthTest: false, depthWrite: false,
    });
    this.postScene = new THREE.Scene();
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post));
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  render() {
    const r = this.renderer;
    r.setRenderTarget(this.target);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(this.scene, this.camera);
    // 法線：用來找表面轉折處
    for (const o of this.skipInNormalPass) o.visible = false;
    this.scene.overrideMaterial = this.normalMat;
    r.setRenderTarget(this.normalTarget);
    r.clear();
    r.render(this.scene, this.camera);
    this.scene.overrideMaterial = null;
    for (const o of this.skipInNormalPass) o.visible = true;
    r.setRenderTarget(null);
    r.clear();
    r.render(this.postScene, this.postCam);
  }

  dispose() { this.target.dispose(); this.normalTarget.dispose(); this.renderer.dispose(); }
}
