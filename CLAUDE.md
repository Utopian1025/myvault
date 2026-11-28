# Desktopia（桌面乌托邦）— 给 Claude Code 的项目说明

一个 Electron 像素桌面宠物：宠物常驻桌面，有极简模式（任务栏上/里）、飞行城堡（3D 等距，可进每个房间，有第一人称）、风景（16 个地方，用地球地图切换）。

## 和用户合作的约定
- **永远用中文回复。** 用户界面文字、注释、changelog 也都是中文，口语、具体，不要术语。
- 用户习惯：「做好直接发布，我边用边反馈」。改完就发版，不用先问。
- 只发 **Windows** 版。
- 不要照搬参考图（比如哈尔的移动城堡只做灵感）。
- 用户在国内网络环境。
- 不要输入任何密码或凭据。
- **所有项目的经验、资源都放在 GitHub 上**：用户全部项目的索引在 [PROJECTS.md](PROJECTS.md)。每轮做完，把新学到的东西（踩坑、约定、下一步）写回本文件或 `docs/` 并推送，让另一个 AI 只读仓库就能接着做。不要只记在 AI 记忆或聊天里。

## 发版流程
0. **先对照 `docs/需求清单.md`**：用户提的每条要求都记在那里，本轮要做的全部打勾才发版（用户说过「之前说的你都记住了改完了吗就发布」）。用户提新要求时马上记进去。
1. 改 `package.json` 的 `version`，在 `changelog.json` 最前面加一条（`version/date/title/notes[]`，notes 写给用户看的中文）。
2. 提交并推到 `main`。
3. 手动触发 `.github/workflows/build.yml`（`gh workflow run build.yml`），大约 15～17 分钟。
4. 确认 `https://github.com/Utopian1025/myvault/releases/latest` 指向新版本。程序内的更新提示会读 changelog。

## 代码结构（renderer/js）
- `main.js`（主进程）：窗口、托盘、uIOhook 全局按键（连按两下 Esc = 老板键 `escTap`）。`preload.js` 暴露 `petAPI`。
- **古树水城（0.29 起的城堡）**：数字全在 `docs/古树水城-施工图.md`。树心 (24,24)，Z = [-16,0,15,30]（L0 在水下不放房间）。角度 θ=atan2(Δv,Δu)，南 = 90°。
  - `fort_city.js`（在 fort.js 前加载，导出 `PP.CITY`）：岛的岩体（`rimR/basR`）、盆地水面 WL −1.2、水下中世纪古城（半木房子 `mHouse`、教堂、市政厅、集市、领主城堡、钟塔、天文台=温室穹顶、拱桥、城墙、路灯，位置在 `LM2`）、浮石、出水口瀑布。水面材质 `MAT.lake`（29），`isle3d.js` 第二遍半透明画，`uLake` 管湖底光斑和越深越暗。
  - `fort.js`：房间都是 `POD()` 圆木屋（`deg/rc/pod`，带外接方框 `r` 给家具代码用），挂在树腰回廊 `RINGS`（L1 r 7.9～11.5，L2/L3 到 11）外沿；`treeHome()` 画空心树干（门洞 L1 南 / L2 西 / L3 北）、五条大根 `ROOT_DEG`、回廊栏杆、两面白帆、树冠。楼梯是两段螺旋 `RAMPS`（`{spiral,cu,cv,r0,r1,ang0,ang1,...}`，一层转 450°），`island.js` 里 `spPt/rampArc/endsRaw` 支持伙伴走弧线。地窖 `store` 的平屋顶 = 二层平台 `TERRACE`（蜂箱）；码头 dock 在门厅南；菜地 farmA/farmB 在东南古城台阶上（厨房、餐厅后门）；石炉（添柴）在地窖，`CHIMS` 只有它的烟道。吊篮 `LIFT`（θ72°，点选号 `PK.lift+层`，`island.js` 的 `liftPop/liftGo`）；码头到 farmB 的菜园栈道是 MODS 里 kind `walk`；码头/栈道/菜地底下的岩顶由 `CITY.FLAT` 压低。`lp(id,f,s)/lb()` 按房间局部（f 朝外）摆东西。小隔间 `HUT_SPEC` 仍是灵魂，每间在 `hutInterior()` 布置。门洞 `carveDoors()` 删掉门洞里的三角面；装饰避开 `PASS`。
  - 0.36 起：盆地填成地面（`fort_city.js` 的 `ground()`，顶面 `GT` −0.15、水洞顶 `CEIL` −1.25），古城在地面下的水洞里；只有方形的古城之池 `POND`（`inPond`）是入口：水面只画在池里，钓鱼点 `FISH/BOB/POOL_L` 都在池边，`island.js` 的 `pondPop`（钓鱼 / 下潜）、`pondDive`、`pondOut`（水下浮到池面按 E 上岸），水下不在池下面时被洞顶压住。水下光照在 `isle3d.js`（`uPond/uDay/uStone`：池口光柱、月光、浮石、探照灯）。柱廊神殿 `TEMPLES`、`cityNature()`（苔藓、沙、碎石、断柱、海带、海葵、洞顶垂根）。着色器里露天朝上的石/瓦/木长苔（`skyV` 判断露天）。神龛 `SHRINE`（`PK.shrine`，`shrinePop`：上香/许愿/还愿，存 `E().shrine`），伙伴状态栏 `petBar()`。地面上的草避开 `CITY.BUSY`（屋子、回廊、神龛）。
  - 配色（0.29 按《天空之城》/原神调）：`fort.js` 的 `C`（暖白灰泥、暖砂岩、赤陶屋顶 `SHING`、石板蓝 `TILE`、亮铜绿 `COP`），树叶 `LEAF`，岩石暖褐；光照在 `island.js lightOpts()`（很蓝的天、暖太阳、带蓝的阴影），0.34 用户嫌太艳：着色器饱和度回到 0.96～0.98、暗部稍微提亮，主色都换成柔和的粉彩，不要再往上推饱和度。树冠 `foliage()` 用 `nFn` 按整团球面算法线（原神的做法），叶片是圆的。`treeHome()` 里每间圆木屋底下有树枝托着（`tubeP`）。
- `isle3d.js`：WebGL2 渲染。0.31 起有体素「光追」：`setVox()` 把碰撞体素 2×2×2 合成一张 3D 纹理（`uVox`），片元着色器 `vd()` 沿法线打几条短光线算遮蔽 `aoK`、往上打一条算天空可见度 `skyV`；阴影 12 点泊松软阴影；金属/瓦/石有高光。`island.js` 的 `fpGlow()` 画光晕和对着太阳的耀斑；滑翔伞 `fp.glide`（`fpGlideKey`）；古城遗物 `F.RELICS`（`relicFit` 挪到能游到的地方、`relicGet` 捡起，记在 `E().relics`）；第一人称默认不画手（`S().fpHands`）。等距正交投影（`uCam/uPit`），第一人称透视（`uFP/uFP2`），剖切 `uClip*`，拾取用 1×1 viewport。
- `island.js`：城堡的一切交互。网格寻路（GS 0.5，GN 144），缩放/旋转（Ctrl+左键），按层剖切、详细视图 `setFocus`、画面内标签 `.rtags`、左上角竖排按钮 `.cutbar.vert`、视角按钮 👁（`viewHTML/viewAct`）、第一人称（`fpStart/fpStop/fpTick`，`S().fpLast` 记位置，`S().fpSpeed` 速度）。
- 第一人称 / 第三人称（`island.js` 里 `// ===== 第一人称` 那一段）：**碰撞就是画出来的模型**——`voxels()` 把城堡网格的三角面撒点进 0.25 的方块（1 实心；2 会摆的树叶草丛，人能穿过、镜头不钻进去；水面不算），第一次当场生成，之后在后台更新。`surf(u,v,zmax)` 取身体底面下最高的实心面，`blocked(u,v,z)` 查身子（脚上 STEP～BODYH）有没有碰到；头顶低就弯腰（`headroom`）。能迈 1 格，楼梯范围内 1.75。方向：yaw 变大 = 往右转，往右 = (-sin, cos)。`fp.q` 每帧同步到 `p.ip` 和 `p.x`。第一人称 HUD（0.30）：左上圆形小地图（`drawMap` 非 big 时画成圆），右上一排圆图标（`.fphud`：地图 Tab / 设置 P / 全屏 F11 / 退出 Q）。城堡视图 🖼 隐藏背景 `S().isleBg`。0.32 起城堡视图默认精细画质（`pixOn()` 只在 `S().islePix === true` 时开像素风），精细时也开 4 倍抗锯齿。滚轮：第一人称调视野 `S().fpFov`，第三人称调距离 `S().fpDist`；V 切换。第一人称时主角只听玩家的（`PP.fpOwns`，`pet.run` 里拦住自己的念头）。小地图 / 大地图 / 自动走路用 `nav()`（每层 0.5 格「能站 / 挡着」，后台分批算）+ `fpPlan`。测试接口 `PP.isle.fpDebug`（`tick/go/surf/blocked/why/col/slice/triIn/who/nav/rebuild`；`who` 能查出某个位置的东西是哪行代码画的）。
- 门洞：`fort.js` 的 `carveDoors()` 会把完全落在门洞里的三角面删掉；画装饰（横条、栅栏、柱子）时要避开 `PASS` / `ENTRIES`。地下室和楼梯井上方要真的开洞（船体顶面、圆房间地板都处理过了）。
- 拟人：城堡里刺猬画成站立的小人（`sprites.js` 的 `drawHumanHedgehog`，`PP.SPR.HUMAN` 里的物种），第三人称从背后看时画背影（`p.back`）。
- `modes.js`：模式切换（`setView`）、HUD、地图弹窗（地球 `globe.js`，旗子来自 `PP.REGIONS`；「飞行城堡」旗子单独加，点了 `setView('isle')`）。
- `places.js`：地方和区域列表。浮空岛场景已去掉（城堡就是浮空岛），`PP.MINE = ['academy','undergrove']`。
- `menu.js`：右键菜单、`PP.panic()`（老板键收成极简）。右键野生动物第一项是「❤ 认养」；所有设置在 `ui.settings(tab)`（分页：基本/声音/提醒/勿扰/天气/第一人称，内部调 `PP.menuRun(id)`）。
- `onboard.js`：新手引导卡片（`PP.onboard.start/step`，进度在 `flags.onboard`，9 = 做完）。
- 认养的伙伴住城堡：`d.ownHome === 'castle'`（`wild.js` 的 `toCastle()` 迁移老存档），`eco.js` 不再模拟它们，`world.js syncPets` 在城堡里把它们都显示出来。
- 城堡里的伙伴会自己干家务（`chore()`：收菜/种菜/浇水/添柴/捡蛋/蜂蜜/钓鱼/做饭，`_chore` 防止抢同一件），串门用城堡版 `A.social`，`watchdog()` 把卡太久的动作结束掉；你给主角的指令设 `_byYou/_stayUntil`，干完在原地待一会儿。
- `quest.js`：每日委托 + 新手任务（`econ.starter`：feed → plant → pat → trip），「带我去」调 `PP.isle.questGo(k)`。成长面板（`econ.js`）分四组 `GROUPS`。
- 第一人称另有：F 全屏（`S().fpFull`，`layout()` 里把 `L.v*` 铺满）、没有快捷栏（0.28 去掉了：看着东西点一下就做对的事，对准伙伴 `aimPet` 弹 `foodPop` 摸摸 / 喂，B 自己吃，滚轮调镜头远近），C 坐 / Z 躺（`fp.pose`）、按视线看见别的动物（`sees()`，体素射线）、在城堡里后台预算碰撞和地图（`warmLoop`）。第一人称时主角从不自动走路：`walkTo` 只判断够不够得着（`REACH`），菜地用 `goPlot/nearPlot`（任意一边）。鼠标：进第一人称默认锁住，M 松开 / 锁回（`fp.freeMouse` 只管这一次，Esc 永远是老板键）；不锁时鼠标移到画面边上转头（`fpTick` 里 `fp.mx/fp.my`），指着东西显示「点一下：…」，单击就用。右下角画主角的手（0.35 起手和手持物在 `hands3d.js`：手是距离场 + Surface Nets 生成的一整块光滑曲面（按握拳程度缓存，`handWarm` 进第一人称时后台预算），手持物是解析曲面；`Mesh.triN` 带每顶点法线；0.33 起 3D 模型 `buildVM()`，`isle3d.draw` 的 `o.vm` 先清深度再画，和场景同一套光照；`drawHands` 只算姿势（`fp._vmPose`）和画手里的东西；原来的说明：矢量画在离屏画布 `fp._hc` 上再按夜里/水下染色；每个动作是一个目标姿势 RT/LT，`spring()` 弹簧追过去；左手只在双手的活里伸上来；鱼竿尖 `fp._tip` 给鱼线用），准星上方显示「正在…」进度。玻璃在第一人称里画成稀疏的淡色（`isle3d.js`）。防闪烁：**每个 box / quad 带一个先后号**（存在摆动值 aW 里用负数，顶点着色器里按号挪一丁点深度），重合的面谁在前就固定；积雪排最后。新建几何尽量用 box/quad。玻璃在第一人称里第二遍混合画（`uGP`），真半透明。第一人称用 4 倍多重采样（`msaaFb`，`o.msaa`），着色器里按 `fwidth` 把远处细花纹淡成底色；不要再加高频、随时间闪的花纹。DOM 按钮（`.rtags` 门牌、`.cutbar`）不能每帧重建：内容没变只改位置，门牌在 mousedown 就生效。BODYH 7.8（真实身高，眼睛 EYE 7.2）/ CROUCH 4.2 / STEP 1.0（家具和 `FIX` 的占地在碰撞里从离地 1 格往上填实到碰到自己为止：`stampUnder()`，桌子底下钻不进去）；第一人称里永远不剖切（`cutO()`/`setCut`/`setFocus` 在 `fp` 时不生效，否则屋顶会被切掉）；`fp.safe` 只记楼层地面（`onFloor`），跑到屋顶外沿下不来按 R（`fpRescue`）；跳起来时头顶碰天花板就停（`headroom`，按缩着身子 BODYH+0.4 算，能从横梁下跳过矮边），不能穿楼板；落地会嵌进东西时退回上一个能站的点（`fp.okUV`）；自动跳 `S().fpAutoJump`。
- 0.37 古树：`treeHome()` 里树干半径 `rr(a,z)=rOut+flute`（板根竖棱，门洞附近收平），材质 `M.bark`(30)/`M.moss`(31)（`isle3d.js` 着色器里有树皮裂纹、苔藓绒光）；`tubeP(pts,r0,r1,col,{n,flat,moss,flare,seg,seed})` 画枝和根（朝上的面长苔）；`hang()` 垂下的松萝（sway>0，人能穿过）；`cushion()` 贴树皮的苔。着色器「阴暗潮湿长苔」：墙脚、水下、屋檐/树荫（skyV、aoK）、树皮北面；屋里不长（`rlights` 现在关着的灯也传，用来判断屋里）。第一人称小窗口可拖边框（`fpEdge`，存在 `S().fpBox`）。
- 0.38：水下古城的房子是空心的（`fort_city.js` 的 `wall()` 带真洞的墙、`slab()` 带洞的楼板、`room()` 屋里布置、`winFrame/archFrame`；`HOMES` 登记水生动物的家）；水里身子 `SWH 1.3 / SWE 0.75`（`island.js`），空格上浮、C/Ctrl 下沉（`sink` 键）。`aqua3d.js`：`PP.AQUA.tpl/put/paint` 鱼和水生动物的 3D 模板（`put` 竖直方向乘 `ZK=2.83/1.155`），`fort.js` 的 `aquaLife()` 在 dyn 里画整个生态；钓鱼 `fpFish/nextFish/fishTick/fishBite/baitPop`，鱼饵和咬钩数据在 `fishdex.js` 的 `BAIT/PREF/BITE/rollBait`；`craft.js` 加工工坊配方（`PP.CRAFT`），工坊模型 `fort.js` 的 `WORKSHOP/workshop()`（`PK.workshop` 190）。`pets3d.js`：动物像素画吹鼓成 3D（`pet.frameBuf()`，`island.js` 的 `pets3d()`，`p._3d` 时不再画 2D）。`Mesh.moss/stem`、叶子有厚度、cyl/ball 自动加密。选择窗（`.seedpick`）键盘选择在 `modes.js`。界面文字「城堡」都改成了「浮岛」。
- 0.39 活的浮岛：`ecology.js`（`PP.ECO`）按现实日子累计生长日（`YEAR_GD` 300 ≈ 一年），离线按月气候补算（`catchUp`），在线按实时天气（`liveTick`）；种群 `pop`（蚯蚓/红虫/河虾/浮萍/蚱蜢/蟋蟀）、每种鱼数量 `fish`（`fishK` 影响咬钩和水下数量）、小树林 `grove`（40 个位置的年纪，`fort.js plants()` 按它画树苗/树/倒木）、居民添置 `ADDS`（`fort.js adds()`）、事件日志；`snap()` 进 `island.js opts().eco` 和 `baseKey`。设计说明在 `docs/生态岛设计.md`。0.40 随机性：每座岛自己的 PRNG（`rng()`，种子 `rs`），`randomEvents()` 产生雷击/陨石/分蜂/野鸭/蘑菇圈/野花/藻华/风筝/神树开花结果等，留在岛上的存进 `feat`（`fort.js ecoFeats()` 画静态的，`ecoDyn()` 画野鸭、萤火虫、蝴蝶），`nearPick()` 第一人称走近自动捡；树种 `gsp`（`tree(..., sp)`，`pine()`）；罕见个体在 `fishdex.caught`。鱼饵 12 种在 `craft.js`（`FIND` 找鱼饵、虾笼 `trapSet/trapGet`、`icon()` 画鱼饵小图），收菜留种在 `econ.harvest`。
- 0.41 浮岛文明：`civ.js`（`PP.CIV`）每天结算（在 `ecology.js` 的 `step` 里调 `day()`）：水窖、取暖烧柴、腐烂（`FOOD` 表）、地力 `soil`、离线时伙伴自己吃存粮；`liveTick` 伙伴饿了自己吃、在风景里待 3 分钟学本事；`KNOW` 14 门本事（`learn`，探险 `onTrip`），学会才能做的工坊配方在 `craft.js`（`need`/`act`/`cond`）；收成倍数 `yieldK`、浇地耗水 `useWater`。
- 0.42 传送门岛：`fort.js` 的 `GATEI`（θ235°，小岛 + 吊桥）、`gateIsle()`（静态：广场、亭子、地球底座 `PK.globe` 203、拉杆 `PK.lever` 204、门框）、`gateDyn()`（地球按 `PP.GLOBE.biome` 上色并转 `o.gate.rot`、红旗、拉杆、门扇）。`island.js`：`gs` 门的状态、`gSel()`=`S().gateSel`、`globeNext/leverPull/doorPush/doorWalk/travel`，没有弹窗（老的 `gatePop` 不用了）。目的地 `dest3d.js`（`PP.DEST`：15 个生态 `B`，`build/dyn`、回程门 `GATE`、出生点 `SPAWN`、地标 `LMK` 点了学本事），当前在哪 `S().dest`（`destId()`），在目的地时 `scene()` 换成 `PP.DEST.build`。「场景」按钮已去掉。
- 0.42 宠物两套形象：3D 场景里用 `pets3dm.js`（`PP.PET3DM.put`，Q 版：`headModel` 大圆头、`eye` 带高光且贴脸转、`earCone` 尖耳朵；身形 `quad/round/bird/blob/octo/upright`，姿势 `poseOf`），旧的 `pets3d.js` 只做兜底；极简模式仍是 2D 像素画。
- 屋里的灯：每个房间（含小隔间）一盏，`fort.js` 的 `lightBoxes()`（按房间范围的光，传给着色器 `uRLa/uRLb/uRLk`，最多 40 盏）、`switches()`（门边墙上的开关，点选号 `SW_PK`+房间序号）、`drawLights()`（在 `dyn()` 里画开关拨杆、吊灯灯泡、门厅蜡烛火苗）。`island.js` 的 `lightOn/toggleLight/rlights`：设置 `S().lightMode`（auto 天暗就开 / time 按 `lightFrom~lightTo` / on / off），手动开关存在 `E().lightSw[房间]`，自动状态一变就作废。
- 第一人称蹲下：按住 Ctrl，或 C / X 切换（`fp.crouch`，身高 `bodyNow`，只在 `fpTick` 那一帧里生效；不自动蹲）。按键照 GTA/MC/原神：E/F/Enter/右键 用，M/Tab 地图，Z 坐/躺，V 视角，按住 Alt 放鼠标，F11 全屏，H 收起左下角按键说明（`S().fpKeysHide`）；Esc 退出后 `fpLast` 记住位置朝向；跳跃按助跑速度加成（`fp.spd`）。
- 伙伴睡觉：`sleepSpot()` 各睡各的（床/宠物窝/沙发/靠垫……），`A.isleSleep`；钓鱼同时只一只。
- 家具：`furn.js` 新增沙发/茶几/餐椅/床头柜/衣柜/五斗柜/矮书架/插花/边几；`island.js` 的 `furnish2()`（layoutV 4）按 `ROOM_SET2` 补家具，大件 `placeWall()` 靠墙摆；门口通道 `doorKeep` 外扩 0.7。调试：`fpDebug.fok(it)` 返回 [能不能放, 原因]。
- 城堡外的世界：第一人称 `drawBelow()` 画城堡下面的大地（按 `S().scene` 的地形配色，一块块田/林子/草地/湖/村子 + 一条河，慢慢后退）、三层远山（山尖有雪）、地平线薄雾、立体的云、太阳光晕 / 星星月亮、偶尔飞过的鸟；俯视时城堡底下画几朵云。家具的动作文字和台词在 `furn.js` 的 `act/say`。第一人称里主角说的话显示成字幕，`gain()` 的小字往上飘（`fp.pops`）。
- `eco.js / wild.js / econ.js / life.js`：生态、野生动物与认养、经济/探险、种植。
- `dmaps.js / vmaps.js / worlds.js / dio.js`：各个风景的布景。

- 设计原则（`DESIGN.md` 第 5 节）：城堡里每样东西都要挂在「火和热 / 水 / 吃的 / 飞」某条命脉上、有人用；看不出用途又不能用的不加。室内「温暖杂乱的小屋」风格在 `fort.js` 的 `COZY`/`cozy()`（置物架、挂着的香草和锅）、`HEARTH`（卧室壁炉 + 墙外砖烟囱 + 炉台座钟指真实时间）。
- 钓鱼：`island.js` 的 `castPoint/fpFish/fishTick/bobNow`，浮漂在 `fort.js dyn` 里画（`o.bob`），锦鲤在蓄水池 `dyn`。

- 外观：0.28 的「林间白石城」塔楼、`giantTree()`、翅膀都已被 0.29 的古树水城取代；配色见上面「古树水城」那条。

## 测试方法
没有单元测试。用 Playwright + Chrome（swiftshader）打开 `renderer/index.html`，在页面里调 `PP.*` 再截图看：
- 预置存档：`localStorage['pixelpets.save.v1']`。
- 进城堡：`PP.setView('isle')`；剖层 `PP.isle.setCut(lv)`；进房间 `PP.isle.setFocus(id)`；第一人称 `PP.isle.fpStart()`；地图弹窗 `PP.modes.showMap()`。
- 改了城堡布局后，要检查宠物能走到每块菜地、每个门（网格 BFS），并且房间之间不重叠。
- 测试环境（swiftshader）一秒只有几帧，游戏时间走得很慢：测动作要在页面里手动推进（`p.update(dt)` + `fpDebug.tick(dt)`），点东西前先等一帧让拾取用上新画面。
- 改了第一人称或城堡布局后：用 `PP.isle.fpDebug.go(u,v,lv)` + `tick` 让它自己走到每个房间 / 菜地 / 院子（都要到、层要对），再乱走乱跳几分钟，检查 `blocked` 始终为 false（不穿墙）。

## 下一步（用户已同意，还没做）
- **风景的旋转**：要先给每个风景做寻路，动物在世界坐标里走，才能自由转。
- （已做）认养动物住进城堡。

设计文档在仓库的 `DESIGN.md` 和 `docs/`，以这两处为准。
