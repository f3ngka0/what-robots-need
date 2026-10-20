# WHAT ROBOTS NEED — Win98 蒸汽波 MV

一个纯前端（HTML / CSS / JS，无框架、无构建）的音乐视频工程：在一台魔改 Windows 98 的
CRT 桌面上，用五幕剧本走完「像素公主 → 算力女巫 → 弹窗瀑布 → 资本野猪 → 系统自我格式化」，
画面与文字随音频包络推进。

- **片长** 4:08.98（248.98s）· **60fps** · **1920×1080**
- **音乐** AWAAWA - WHAT ROBOTS NEED（本仓库**不含**音频、渲染帧、成片和依赖）

## 运行

```powershell
node tools/serve.mjs --port 8899
# 浏览器打开 http://127.0.0.1:8899/index.html ，点 ▶ EXECUTE
```

音频不入库，需放在工程上一级目录（`..\AWAAWA - WHAT ROBOTS NEED.mp3`），
或改 `js/app.js` 里 `new Audio(...)` 的路径。空格暂停，方向键 ±5s。

## 目录

```
index.html      舞台骨架
css/            Win98 组件皮肤、场景布局、字幕样式
js/             时间轴与五幕剧本、窗口/特效/字幕、程序化像素美术
data/           预计算音频包络与节拍
tools/          静态服务、逐帧录制、NVENC 编码、自测
```

## 出片

逐帧渲染与编码分两步，全部状态都是 `t` 的纯函数，`MV.seek(t)` 设为某时刻后截图：

```powershell
node tools/fast-record.mjs --from 0 --to 249 --fps 60 --workers 3 --out frames
node tools/encode.mjs --frames frames --from 0 --to 249 --fps 60 --crf 19 --name WHAT_ROBOTS_NEED_win98_mv --out out
```

编码优先走 NVENC（`hevc_nvenc` / `h264_nvenc`），工具链细节见 `tools/README.md`。
