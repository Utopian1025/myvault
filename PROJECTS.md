# 全部项目总索引（给接手的 AI 和维护者）

> 规则：所有开发中项目的源码、经验、踩坑、资源和下一步都放在 GitHub 上。任何 AI 模型只读这些仓库，就应该能理解整个项目并继续开发。
> 每做完一轮工作，都要把新学到的东西写回对应仓库的交接文档并推送。不要只留在聊天记录、AI 记忆或本机里。

## 项目一览

| 项目 | 是什么 | 源码仓库 | 发布物在哪 | 先读哪个文件 |
|---|---|---|---|---|
| **Desktopia 桌面乌托邦** | Electron 像素桌面宠物 + 3D 浮岛 | `Utopian1025/myvault`（本仓库，公开） | 本仓库 Releases | [CLAUDE.md](CLAUDE.md) → [DESIGN.md](DESIGN.md) → [docs/需求清单.md](docs/需求清单.md) |
| **AIO Workspace**（原名 ClearTask / OIA） | Windows 本地任务、计划、复盘、备忘录工作台（C# / .NET 4.8） | `Utopian1025/cleartask`（私有） | 本仓库 `cleartask/` 子目录 | 私库的 `CLAUDE-HANDOFF.md` |
| **Maas**（Excel / Word / WPS 插件） | Office 插件，三条产品线各自发版 | `Utopian1025/maas-source`（私有） | 本仓库 `maas/` 子目录 + `maas-*` 工作流 | 私库的 `CLAUDE.md` |
| **ToolVault** | Windows 批量工具箱：批量压缩、转 PDF、拆表格（Python） | `Utopian1025/toolvault-source`（私有） | `Utopian1025/toolvault`（公开）的 Releases | 私库的 `CLAUDE.md` → `AGENTS.md` → `docs/CLAUDE_HANDOFF.md` → `work/PROGRESS.md` |

## 共同约定（所有项目通用）

- 用中文回复、写说明、写更新日志。语气口语化、具体，少用术语。
- 用户的习惯是「做好直接发布，我边用边反馈」。只发 Windows 版。
- 用户在国内网络环境，下载和更新都要有国内能用的线路（jsDelivr / 镜像）。
- **源码只放私有仓库，公开仓库只放发布物**（Desktopia 例外，它的源码本来就在公开的 myvault）。往公开仓库提交前，检查里面没有其他项目的源码、测试证据、签名私钥或用户数据。
- 不要输入任何密码或凭据，也不要把它们写进任何仓库。
- 不要照搬参考图或别人的作品，只当灵感用。

## 本仓库（myvault）的目录

| 位置 | 属于 |
|---|---|
| 根目录、`renderer/`、`assets/`、`build/`、`scripts/`、`docs/`、`play/` | Desktopia 源码 |
| `cleartask/` | AIO Workspace 发布物（安装包、`latest.json` 更新清单） |
| `maas/` | Maas 发布物、更新清单和诊断脚本 |
| `.github/workflows/build.yml` | Desktopia 打包发布 |
| `.github/workflows/maas-*.yml` | Maas 发布和下载检查 |

## 接手时怎么做

1. 先读这份索引，找到要改的项目，打开它的源码仓库。
2. 读那个仓库的交接文档（上表最后一列），按里面的流程开发、测试、发版。
3. 做完以后更新交接文档：改了什么、学到了什么、哪里没做完、下一步是什么。然后推送。
4. 加了新项目或换了仓库，就更新这份索引。
