# Desktopia（桌面乌托邦）— 给 Claude Code 的项目说明

一个 Electron 像素桌面宠物：宠物常驻桌面，有极简模式（任务栏上/里）、飞行城堡（3D 等距，可进每个房间，有第一人称）、风景（16 个地方，用地球地图切换）。

## 和用户合作的约定
- **永远用中文回复。** 用户界面文字、注释、changelog 也都是中文，口语、具体，不要术语。
- 用户习惯：「做好直接发布，我边用边反馈」。改完就发版，不用先问。
- 只发 **Windows** 版。
- 不要照搬参考图（比如哈尔的移动城堡只做灵感）。
- 用户在国内网络环境。
- 不要输入任何密码或凭据。

## 发版流程
1. 改 `package.json` 的 `version`，在 `changelog.json` 最前面加一条（`version/date/title/notes[]`，notes 写给用户看的中文）。
2. 提交并推到 `main`。
3. 手动触发 `.github/workflows/build.yml`（`gh workflow run build.yml`），大约 15～17 分钟。
4. 确认 `https://github.com/Utopian1025/myvault/releases/latest` 指向新版本。程序内的更新提示会读 changelog。

## 代码结构（renderer/js）
- `main.js`（主进程）：窗口、托盘、uIOhook 全局按键（连按两下 Esc = 老板键 `escTap`）。`preload.js` 暴露 `petAPI`。
- `fort.js`：城堡的建筑模型。房间是矩形或圆形（可带 `rot`），`ROOMS / PASS（门洞走廊）/ RAMPS（楼梯）`，`build(o)` 生成几何；`cut={lv,vu,vv,low}` 剖切；`o.focus` 只画一个房间。树 `tree()`、果树院子 `yard()`、房子间缝隙 `joins()`。
- `isle3d.js`：WebGL2 渲染。等距正交投影（`uCam/uPit`），第一人称透视（`uFP/uFP2`），剖切 `uClip*`，拾取用 1×1 viewport。
- `island.js`：城堡的一切交互。网格寻路（GS 0.5，GN 144），缩放/旋转（Ctrl+左键），按层剖切、详细视图 `setFocus`、画面内标签 `.rtags`、左上角竖排按钮 `.cutbar.vert`、视角按钮 👁（`viewHTML/viewAct`）、第一人称（`fpStart/fpStop/fpTick`，`S().fpLast` 记位置，`S().fpSpeed` 速度）。
- 第一人称 / 第三人称（`island.js` 里 `// ===== 第一人称` 那一段）：**碰撞就是画出来的模型**——`voxels()` 把城堡网格的三角面撒点进 0.25 的方块（1 实心；2 会摆的树叶草丛，人能穿过、镜头不钻进去；水面不算），第一次当场生成，之后在后台更新。`surf(u,v,zmax)` 取身体底面下最高的实心面，`blocked(u,v,z)` 查身子（脚上 STEP～BODYH）有没有碰到；头顶低就弯腰（`headroom`）。能迈 1 格，楼梯范围内 1.75。方向：yaw 变大 = 往右转，往右 = (-sin, cos)。`fp.q` 每帧同步到 `p.ip` 和 `p.x`。滚轮：第一人称调视野 `S().fpFov`，第三人称调距离 `S().fpDist`；V 切换。第一人称时主角只听玩家的（`PP.fpOwns`，`pet.run` 里拦住自己的念头）。小地图 / 大地图 / 自动走路用 `nav()`（每层 0.5 格「能站 / 挡着」，后台分批算）+ `fpPlan`。测试接口 `PP.isle.fpDebug`（`tick/go/surf/blocked/why/col/slice/triIn/who/nav/rebuild`；`who` 能查出某个位置的东西是哪行代码画的）。
- 门洞：`fort.js` 的 `carveDoors()` 会把完全落在门洞里的三角面删掉；画装饰（横条、栅栏、柱子）时要避开 `PASS` / `ENTRIES`。地下室和楼梯井上方要真的开洞（船体顶面、圆房间地板都处理过了）。
- 拟人：城堡里刺猬画成站立的小人（`sprites.js` 的 `drawHumanHedgehog`，`PP.SPR.HUMAN` 里的物种），第三人称从背后看时画背影（`p.back`）。
- `modes.js`：模式切换（`setView`）、HUD、地图弹窗（地球 `globe.js`，旗子来自 `PP.REGIONS`；「飞行城堡」旗子单独加，点了 `setView('isle')`）。
- `places.js`：地方和区域列表。浮空岛场景已去掉（城堡就是浮空岛），`PP.MINE = ['academy','undergrove']`。
- `menu.js`：右键菜单、`PP.panic()`（老板键收成极简）。
- `eco.js / wild.js / econ.js / life.js`：生态、野生动物与认养、经济/探险、种植。
- `dmaps.js / vmaps.js / worlds.js / dio.js`：各个风景的布景。

## 测试方法
没有单元测试。用 Playwright + Chrome（swiftshader）打开 `renderer/index.html`，在页面里调 `PP.*` 再截图看：
- 预置存档：`localStorage['pixelpets.save.v1']`。
- 进城堡：`PP.setView('isle')`；剖层 `PP.isle.setCut(lv)`；进房间 `PP.isle.setFocus(id)`；第一人称 `PP.isle.fpStart()`；地图弹窗 `PP.modes.showMap()`。
- 改了城堡布局后，要检查宠物能走到每块菜地、每个门（网格 BFS），并且房间之间不重叠。
- 改了第一人称或城堡布局后：用 `PP.isle.fpDebug.go(u,v,lv)` + `tick` 让它自己走到每个房间 / 菜地 / 院子（都要到、层要对），再乱走乱跳几分钟，检查 `blocked` 始终为 false（不穿墙）。

## 下一步（用户已同意，还没做）
- **风景的旋转**：要先给每个风景做寻路，动物在世界坐标里走，才能自由转。
- **认养动物住进城堡**：现在城堡只显示主角；原浮空岛的住户临时搬到了魔法学院。

设计文档在仓库的 `DESIGN.md`，以及 claude.ai 项目「桌面宠物」里的几篇设计说明。
