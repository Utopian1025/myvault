# ClearTask 0.4.7

公开安装包与签名更新入口。源码保存在私有仓库 Utopian1025/cleartask。

- [镜像下载 Windows 安装包](https://fastly.jsdelivr.net/gh/Utopian1025/myvault@main/cleartask/ClearTask-0.4.7-Windows.zip)
- [备用镜像](https://gcore.jsdelivr.net/gh/Utopian1025/myvault@main/cleartask/ClearTask-0.4.7-Windows.zip)
- [GitHub 安装包](https://github.com/Utopian1025/myvault/blob/main/cleartask/ClearTask-Setup-0.4.7.exe)
- [本版逐项更新说明](RELEASE-NOTES.md)

应用内入口：工作空间设置 → 更新。

当前发布验收：0.4.7 安装包、隔离升级和两条镜像 ZIP 哈希验证通过；旧版软件内检查更新仍被 CDN 旧清单缓存阻塞，刷新接口返回限流。暂请使用上方主镜像或备用镜像下载安装包，不能将此状态视为软件内自动更新已验收通过。

更新清单经过 RSA 签名，客户端验证签名、长度和 SHA-256 后才允许安装。
.bin 为与 .exe 完全相同的镜像分发副本；手动安装请下载 ZIP 并运行其中的安装程序。
升级保留已有任务、备忘录与配置。

0.4.7：修复备忘录格式菜单报错、合并侧边栏切换刷新；小组件统一尺寸和字号、默认 8 像素边距、延后保存翻页位置；小组件与设置支持可中断过渡和减少动态效果。项目和清单继续直接切换。

本目录与仓库内其他应用的版本和更新配置相互独立。
