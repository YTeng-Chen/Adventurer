// 3D 像素風舞台：先用低解析度算出畫面，再放大成清楚的方格，並在輪廓與前後交疊處描 1 格黑線。
// 鏡頭固定在正面（略往下看），和遊戲的橫向畫面一致。
import * as THREE from 'three';

const POST_VERT = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
// 外輪廓：自己透明、旁邊有東西 → 黑線；內輪廓：自己比旁邊遠很多（例如手臂在身體前面）→ 黑線
const POST_FRAG = `
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 texel;
uniform vec3 ink;
uniform float depthEdge;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tColor, vUv);
  float d = texture2D(tDepth, vUv).r;
  float edge = 0.0;
  vec2 offs[4];
  offs[0] = vec2(texel.x, 0.0); offs[1] = vec2(-texel.x, 0.0); offs[2] = vec2(0.0, texel.y); offs[3] = vec2(0.0, -texel.y);
  for (int i = 0; i < 4; i++) {
    vec4 n = texture2D(tColor, vUv + offs[i]);
    float nd = texture2D(tDepth, vUv + offs[i]).r;
    if (c.a < 0.5 && n.a > 0.5) edge = 1.0;
    if (c.a > 0.5 && n.a > 0.5 && d - nd > depthEdge) edge = 1.0;
  }
  gl_FragColor = edge > 0.5 ? vec4(ink, 1.0) : c;
  #include <colorspace_fragment>
}
`;

export class PixelStage {
  // canvas：要畫的 canvas；w、h：低解析度（像素格數）；viewH：鏡頭看得到的高度（世界單位，1 單位 = 1 格）
  constructor(canvas, { w, h, viewH = h, lookY = 45, pitch = 0.18 } = {}) {
    this.w = w; this.h = h;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(w, h, false);
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    const viewW = viewH * (w / h);
    this.camera = new THREE.OrthographicCamera(-viewW / 2, viewW / 2, viewH / 2, -viewH / 2, 1, 600);
    // 鏡頭在正前方，略往下看
    const dist = 300;
    this.camera.position.set(0, lookY + Math.sin(pitch) * dist, Math.cos(pitch) * dist);
    this.camera.lookAt(0, lookY, 0);

    // 燈光：左上主光＋環境光；卡通材質會分成三階明暗
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.35));
    const sun = new THREE.DirectionalLight(0xffffff, 1.9);
    sun.position.set(-120, 220, 160);
    this.scene.add(sun);

    this.target = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      depthTexture: new THREE.DepthTexture(w, h),
    });
    this.post = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: this.target.texture }, tDepth: { value: this.target.depthTexture },
        texel: { value: new THREE.Vector2(1 / w, 1 / h) }, ink: { value: new THREE.Color('#17141b') },
        depthEdge: { value: 0.012 },
      },
      vertexShader: POST_VERT, fragmentShader: POST_FRAG, transparent: true, depthTest: false, depthWrite: false,
    });
    this.postScene = new THREE.Scene();
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post));
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  render() {
    this.renderer.setRenderTarget(this.target);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.postScene, this.postCam);
  }

  dispose() { this.target.dispose(); this.renderer.dispose(); }
}
