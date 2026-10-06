# Change colors, fonts, buttons or layout (L0)

No code. These are Theme settings — and every one of them can be changed safely from the command line.

## 1. Find the setting

```bash
npm run settings -- list            # every global setting: id, current value, allowed values, English / 中文 label
npm run settings -- list 按钮        # filter by id, label (either language) or group
npm run settings -- schemes         # color schemes + contrast check
```

`CATALOG.json → theme_settings` has the same list (with `info` text) for reading without running anything.

| The operator says | Settings |
|---|---|
| "Make the main color yellow", "dark site" | `color_schemes.<scheme>.<role>` — roles: `background, background_gradient, foreground, primary, on_primary, accent, on_accent`; `body_color_scheme`, `drawer_color_scheme` |
| "Sale price / badge / stars color" | `color_sale, color_badge_sale_bg, color_badge_sale_text, color_rating` |
| "Change the font", "bigger headings", "all caps" | `type_heading_font`, `type_body_font`, `heading_scale`, `heading_uppercase`, `heading_letter_spacing`, `body_size`, `nav_*`, `button_*`, `card_*` |
| "Use our own font file" | upload .woff2 in Content → Files, then `heading_custom_font` / `body_custom_font` = file name |
| "Wider page", "more space between sections" | `page_width`, `gutter_*`, `section_spacing`, `grid_gap_*` |
| "Rounder / squarer corners" | `radius_card, radius_media, radius_input, radius_button`, `swatch_shape` |
| "Buttons like …" | `button_style, button_border, button_corner_cut, button_hover, button_shadow_*` |
| "Product cards …" | `card_style, card_text_align, card_image_ratio, card_image_fit, card_show_*, card_title_lines, badge_*` |
| "Logo / favicon" | `logo, logo_inverse, logo_mobile, logo_width*, logo_max_height, favicon` (images: `shopify://shop_images/<file>`) |
| "Less animation" | `animate_reveal, animate_images, page_transitions` |
| One section's colors | that section's `color_scheme` setting — pick an existing scheme, never hard-code colors |

## 2. Change it

- Operator prefers clicking: *Online Store → Themes → Customize → Theme settings (gear icon) → <group>*. The group names match the `##` headings of `settings -- list`.
- You do it (validated — wrong ranges, steps, options, colors or scheme ids are refused):

```bash
npm run settings -- set heading_uppercase true button_corner_cut 12
npm run settings -- set color_schemes.scheme-1.primary "#FFC619" color_schemes.scheme-1.on_primary "#0B0B0D"
npm run settings -- section index hero overlay_opacity 40          # one section in templates/index.json
npm run settings -- section index hero.title text "Audio, transformed."   # a block inside it
```

Add `--dry-run` to check first. Fix every contrast warning (text 4.5:1) before handing off.

## 3. Hand off

`npm run verify`, then preview (`npm run verify:preview` or `shopify theme dev`) and send screenshots.
If the store is connected to GitHub, pull first: the theme editor commits its own changes to the branch.

Never hard-code a color, font or size in Liquid or CSS to satisfy a style request.
