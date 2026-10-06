# agentsws-theme（中文说明）

一个开源 Shopify 主题：**Tailwind CSS v4 + theme blocks**，专门设计成**让 AI Agent 替不懂代码的运营安全地改主题**。

> 状态：**第 1 批（共 6 批）· 地基**。设计 token、布局、自由容器 section、基础 blocks 和 Agent 工具链已就位。
> 页头菜单、商品页、集合页、购物车、搜索在第 2 批。暂不适合正式店铺使用。

工作方式：运营用自然语言提需求 → Agent 按 `AGENTS.md` 只改 `custom-` 文件 → 推到预览主题 → 运营看截图确认 → 人工发布。

- `AGENTS.md`：Agent 必须遵守的规则（改动阶梯、命名、样式与脚本约定、交付格式）
- `CATALOG.json`：自动生成的组件目录
- `recipes/`：常见需求的标准做法
- `npm run new`：生成升级安全的 `custom-` block/section
- `npm run verify`：交付门禁；`verify:preview` 额外推预览主题、截图、无障碍扫描
- `CLASS_VOCAB.md`：不构建也一定可用的样式类

许可证：MIT。
