# ClearTask

ClearTask 的公开安装包与签名更新入口。源码保存在私有仓库 Utopian1025/cleartask。

- [镜像下载 ClearTask 0.4.3 Windows 安装包](https://cdn.jsdelivr.net/gh/Utopian1025/myvault@main/cleartask/ClearTask-0.4.3-Windows.zip)
- [GitHub Release 备用下载](https://github.com/Utopian1025/myvault/releases/tag/cleartask-v0.4.3)
- [逐项修复与验证范围](https://cdn.jsdelivr.net/gh/Utopian1025/myvault@main/cleartask/RELEASE-NOTES.md)

应用内：工作空间设置 → 备份 → 软件更新。检查更新和下载均优先使用镜像，失败时才回退 GitHub。

`latest.json` 为 RSA 签名更新清单，客户端验证签名、长度与 SHA-256 后才允许安装。`.bin` 是与 Release 安装包字节完全一致的 CDN 分发副本；手动安装请下载上方 `.zip` 并运行其中的安装程序。

此目录与仓库其他应用的版本、更新配置相互独立。

