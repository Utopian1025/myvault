# 中国天气地区索引

`ChinaWeatherLocations.tsv` 从 QWeather 公开的中国常用城市列表提取地区名称、所属省市、英文别名、行政区代码和天气查询位置。城市搜索优先使用随应用提供的中文索引，不依赖在线名称检索；天气数据仍由 Open-Meteo 提供。

- 来源：https://github.com/qwd/LocationList/blob/master/China-City-List-latest.csv
- 官方说明：https://dev.qweather.com/docs/resource/location-list/
- 源文件版本：China-City-List v202506200
- 取得日期：2026-11-10（北京时间）
- 源文件字段顺序：Location_ID、Location_Name_ZH、Adm1_Name_ZH、Adm2_Name_ZH、Location_Name_EN、Latitude、Longitude、AD_code。

位置参数仅用于内部查询天气，不再提供手动经纬度编辑界面。旧配置保留兼容性；重新选择城市后更新关联位置。
