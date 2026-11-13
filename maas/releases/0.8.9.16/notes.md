## 自动更新下载修订
- 增加 GHFast、GHProxy.net 独立下载通道，保留既有镜像及官方备用。
- 最多并行尝试两个通道，采用首个通过长度和 SHA-256 校验的完整包，取消其他下载。
- 连接无响应、传输停滞时自动切换；全部失败时显示每条通道的具体错误。
- WN、QF、SP 等业务功能沿用0.8.9.15；收藏、项目和配置保留。

完整解压 ZIP 后运行 Maas_Excel.exe。若旧版内置下载仍失败，请使用独立镜像下载本版完整 ZIP：
[镜像一](https://ghfast.top/https://github.com/Utopian1025/myvault/releases/download/maas-excel-v0.8.9.16/Maas_Excel_v0.8.9.16.zip)
[镜像二](https://ghproxy.net/https://github.com/Utopian1025/myvault/releases/download/maas-excel-v0.8.9.16/Maas_Excel_v0.8.9.16.zip)

下载修订已通过隔离测试和完整包校验；企业网络可达性仍以实际网络为准。版本仍为 beta。