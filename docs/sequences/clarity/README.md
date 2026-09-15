# 三组动作的清晰度与帧一致性修正

原拼图中展翅、扭转每帧约 313 像素，上下齐发约 444 像素，放到 750 CSS 像素显示后模糊。使用内置 image_gen 逐对重绘为 887 × 887 单帧，共 40 帧；来源、提示词和五处姿态修正见 generation-manifest.json。

第二轮检查确认，独立生成帧的躯干比例和毛色有差异，播放器又按含手臂的整体外框缩放，造成身体随动作变大变小。现在按共同躯干宽高和脚底中心配准，不再用手臂范围决定缩放。扭转宽度沿用原序列的视角比例。毛发中间调统一到同一 RGB 参考，保留眼睛、腮红和掌垫；源图片分辨率和 Alpha 不变。

网页实际读取 public/assets/sequences/*-pair-stable-*.png 和 motion-calibration.json。未校准的高清素材保留为 *-pair-hq-*.png。

重建校准素材：node scripts/package-stable-sequences.mjs。打包：npm run build。检查：node scripts/sequence-stability-check.mjs、node scripts/sequence-frame-check.mjs、npm test。

实际播放测量显示，三组躯干高度波动小于 0.5%，腹部采样亮度波动小于 0.4%。展翅、上下齐发躯干宽度波动小于 0.8%；扭转保留约 4.2% 的原始视角变化。详细结果见 visual-fidelity-check.json。毛发纹理与部分微小五官仍存在独立重绘的帧间差异，不作影视级绑定动画或像素一致承诺。

可播放、暂停和拖动逐帧的对比：artifacts/sequence-consistency/frame-review.html。
