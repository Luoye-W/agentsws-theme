"""Generates the Tech demo preset (home page, header/footer groups, settings). Run: python3 presets/tech/build.py
Demo content uses Shopify mock.shop catalogs (Sonic Haven, Beam & Byte) imported into the demo store."""
import json, pathlib
HERE = pathlib.Path(__file__).parent
img = lambda f: f"shopify://shop_images/{f}"
def blk(type_, settings=None, blocks=None):
    b = {"type": type_, "settings": settings or {}}
    if blocks:
        b["blocks"] = dict(blocks); b["block_order"] = [k for k, _ in blocks]
    return b
def section(type_, settings=None, blocks=None):
    return blk(type_, settings, blocks)
def heading(text, size="h2", tag="h2", align="left"): return blk("heading", {"text": text, "size": size, "tag": tag, "alignment": align})
def text(html, size="body", muted=False, align="left"): return blk("text", {"text": html, "size": size, "muted": muted, "alignment": align})
def button(label, link, style="primary"): return blk("button", {"label": label, "link": link, "style": style})

S = {}
S["slideshow"] = section("slideshow", {"layout": "peek", "autoplay": True, "autoplay_interval": 6, "height": "large", "full_width": False, "padding_top": 16, "padding_bottom": 0}, [
    (f"slide-{i}", blk("_slide", {"image": img(im), "overlay_opacity": 25, "position": pos, "content_align": "start", "text_color_scheme": "scheme-3"}, [
        ("title", heading(t, "display", "h2")), ("cta", button(cta, link, "secondary"))]))
    for i, (im, t, cta, link, pos) in enumerate([
        ("16300863-4570-4a7c-b43e-b8c3a49f96ad.png", "Hear every groove", "Shop turntables", "shopify://collections/analog-vinyl-foundations", "bottom_left"),
        ("565c5d31-1dc6-4bbf-aa43-6fd4f9f72b75.png", "Studio sound, at home", "Shop interfaces", "shopify://collections/reference-monitor-series", "bottom_left"),
        ("42fd740c-5025-43b4-8c32-a9290ae1f762.png", "Record like a pro", "Shop microphones", "shopify://collections/reference-monitor-series", "bottom_left")], 1)])
S["intro"] = section("container", {"direction": "row", "align": "start", "justify": "between", "gap": 48, "padding_top": 72, "padding_bottom": 56}, [
    ("left", blk("group", {"width": "half", "gap": 24}, [("h", heading("We believe in the power of <em>sound</em>", "h1", "h2")), ("b", button("Our story", "shopify://pages/contact", "secondary"))])),
    ("right", blk("group", {"width": "half", "gap": 16}, [("t", text("<p><strong>Demo store.</strong> This layout shows how the theme's sections recreate a full audio storefront: products, collections and imagery come from Shopify's sample catalogs.</p><p>Swap in your own brand story here.</p>", "body", True))]))])
S["collections"] = section("collection-list", {"collections": ["demo-tech-all", "reference-monitor-series", "analog-vinyl-foundations", "ergonomic-surface-essentials", "seamless-power-hubs"],
    "heading": "", "card_style": "tile", "tile_image_fit": "contain", "image_ratio": "portrait", "title_position": "below", "show_count": True, "layout": "slider", "columns": 4, "mobile_layout": "slider", "padding_top": 0, "padding_bottom": 72})
S["banner"] = section("hero", {"image": img("78832378-e5d6-4a87-94b9-21ea47157ece.png"), "height": "large", "position": "middle_center", "mobile_position": "middle", "content_align": "center", "text_color_scheme": "scheme-3", "overlay_opacity": 35}, [
    ("h", heading("Sound. Sculpted.", "display", "h2", "center")), ("t", text("<p>A turntable that excites the eye and the ear from every angle.</p>", "lg", False, "center")), ("b", button("Shop turntables", "shopify://collections/analog-vinyl-foundations", "secondary"))])
S["featured"] = section("featured-product", {"product": "brushed-steel-turntable", "gallery_layout": "slider", "thumbnail_position": "start", "media_width": "large", "badge_text": "Featured • Featured • Featured • ", "badge_icon": "star", "enable_zoom": True, "show_details_link": True, "padding_top": 72, "padding_bottom": 72}, [
    ("title", blk("product-title", {"size": "h3", "show_vendor": True})), ("price", blk("product-price", {"show_tax_note": False})),
    ("picker", blk("product-variant-picker", {"style": "buttons", "swatches": True})), ("buy", blk("product-buy-buttons", {"show_quantity": True, "show_dynamic_checkout": False}))])
S["bundle"] = section("bundle-builder", {"heading": "Build your bundle", "description": "<p>Pick any three pieces for your setup and add them to the cart together.</p>",
    "products": ["compact-audio-interface", "anodized-aluminum-professional-microphone", "brushed-steel-turntable", "premium-audio-cable", "adjustable-laptop-stand", "eco-power-extension-cord"],
    "columns_desktop": 3, "columns_mobile": "2", "min_items": 3, "max_items": 6, "allow_duplicates": False, "panel_heading": "Your bundle", "note": "Choose at least three products.", "padding_top": 72, "padding_bottom": 72})
S["compare"] = section("image-comparison", {"eyebrow": "Two finishes", "heading": "Choose your <em>finish</em>", "heading_highlight": "underline",
    "image_before": img("47dab7aa-3114-459e-aa0b-8c16dde5f042.png"), "label_before": "Brushed steel", "image_after": img("55c3197c-9776-4e26-9a3a-bb700517e873.png"), "label_after": "Brushed metal", "ratio": "wide", "padding_top": 72, "padding_bottom": 72})
S["marquee"] = section("marquee", {"separator": "dot", "text_size": "xlarge", "font": "heading", "outline": True, "speed": "slow", "padding_top": 24, "padding_bottom": 24},
    [(f"m{i}", blk("_marquee-item", {"text": t})) for i, t in enumerate(["Studio-grade clarity", "Play anything", "Built to last", "Hear the details"], 1)])
S["countdown"] = section("countdown", {"end_date": "2026-12-31", "end_time": "23:59", "when_ended": "hide_section", "layout": "banner", "heading": "Holiday sale on studio cables", "text": "<p>Demo countdown — set a real end date for your own sale.</p>",
    "button_label": "Shop cables", "button_link": "shopify://collections/analog-vinyl-foundations", "image": img("36d36cf1-604f-4dd8-a87d-08d4cc371098.png"), "overlay_opacity": 55, "color_scheme": "scheme-3", "timer_size": "lg", "padding_top": 96, "padding_bottom": 96})
S["lookbook"] = section("lookbook", {"eyebrow": "Premium setups", "heading": "Bring quality sound <em>home</em>", "heading_highlight": "underline", "image": img("c55ba300-0e09-4129-8ee7-ceb34f774469.png"), "layout": "list", "list_position": "end", "padding_top": 72, "padding_bottom": 72}, [
    ("h1", blk("hotspot", {"product": "graphite-top-coffee-table-with-brushed-aluminum-legs", "x": 50, "y": 62})),
    ("h2", blk("hotspot", {"product": "brushed-steel-turntable", "x": 38, "y": 40})),
    ("h3", blk("hotspot", {"product": "premium-audio-cable", "x": 70, "y": 48}))])
S["tabs"] = section("featured-collections-tabs", {"heading": "Best sellers", "card_show_highlights": True, "layout": "slider", "products_to_show": 8, "columns_desktop": 4, "show_view_all": False, "padding_top": 72, "padding_bottom": 72}, [
    (f"t{i}", blk("tab", {"collection": c, "label": l})) for i, (c, l) in enumerate([("reference-monitor-series", "Studio"), ("analog-vinyl-foundations", "Vinyl"), ("ergonomic-surface-essentials", "Desk"), ("seamless-power-hubs", "Power")], 1)])
S["scroll"] = section("scrolling-images", {"tilt": 3, "speed": 40, "tile_height": 260, "tile_height_mobile": 180, "gap": 16, "color_scheme": "scheme-4", "padding_top": 40, "padding_bottom": 40},
    [(f"i{i}", blk("_scrolling-image", {"image": img(f)})) for i, f in enumerate(["c06e954374e5c9e036ac977c0e31d0b2.png", "36d3410f411db406947c31fb85dfcf31.png", "ef6cf469bbc0d20ccf3f0866c8a84c46.png", "64fb1882710babc1d49699293ef22e3e.png", "c0355a9fdd13bd2688ea10cd9b459944.png", "fc27cf231166a28ec84a922156345428.png"], 1)])
S["blog"] = section("blog-posts", {"heading": "Latest stories", "layout": "lead_list", "blog": "journal", "post_count": 3, "columns_desktop": 3, "show_view_all": True, "padding_top": 72, "padding_bottom": 56})
S["services"] = section("multicolumn", {"heading": "", "columns": 4, "columns_mobile": "2", "mobile_layout": "stack", "card_style": "plain", "icon_position": "start", "icon_size": 28, "padding_top": 32, "padding_bottom": 32}, [
    (f"c{i}", blk("_column", {"media": "icon", "icon": ic, "heading": h, "text": f"<p>{t}</p>"})) for i, (ic, h, t) in enumerate([
        ("chat", "Customer service", "Real people answer within one business day."), ("truck", "Shipping", "Describe your delivery promise here."),
        ("gift", "Refer a friend", "Explain your referral offer here."), ("lock", "Secure payment", "Payments are processed by Shopify.")], 1)])
order = ["slideshow", "intro", "collections", "banner", "featured", "compare", "bundle", "marquee", "countdown", "lookbook", "tabs", "scroll", "blog", "services"]
(HERE / "templates").mkdir(exist_ok=True)
(HERE / "templates/index.json").write_text(json.dumps({"sections": S, "order": order}, indent=2) + "\n")
# Collection page (reference: collection with banner header, subcollection tabs, filter drawer, promo tile, story banner, services)
C = {}
C["main"] = section("main-collection", {"header_style": "banner", "header_image": img("78832378-e5d6-4a87-94b9-21ea47157ece.png"), "show_breadcrumb": True, "show_description": False,
    "heading_size": "display", "header_alignment": "start", "banner_height": "large", "banner_content_position": "bottom", "banner_full_width": True, "transparent_header": True,
    "overlay_opacity": 35, "header_color_scheme": "scheme-3", "subcollection_source": "list",
    "subcollections": ["demo-tech-all", "reference-monitor-series", "analog-vinyl-foundations", "ergonomic-surface-essentials", "seamless-power-hubs"],
    "subcollection_style": "tabs", "subcollection_placement": "toolbar", "subcollection_show_count": True, "products_per_page": 16, "columns_desktop": 4, "columns_mobile": "2",
    "pagination": "numbers", "card_quick_add": True, "card_show_highlights": True, "enable_filters": True, "filter_layout": "drawer", "enable_sorting": True, "padding_top": 40, "padding_bottom": 96}, [
    ("promo", blk("promo", {"position": 7, "column_span": "1", "row_span": "1", "image": img("36d36cf1-604f-4dd8-a87d-08d4cc371098.png"), "overlay_opacity": 45,
        "heading": "Desk accessories", "text": "<p>Keep your listening setup tidy for years.</p>", "button_label": "View accessories", "link": "shopify://collections/ergonomic-surface-essentials",
        "content_position": "middle", "content_alignment": "center", "color_scheme": "scheme-3"}))])
C["story"] = section("hero", {"image": img("c55ba300-0e09-4129-8ee7-ceb34f774469.png"), "height": "small", "position": "middle_left", "mobile_position": "bottom", "content_align": "start", "text_color_scheme": "scheme-3", "overlay_opacity": 60}, [
    ("i", blk("icon", {"icon": "headphones"})), ("e", heading("Studio", "eyebrow", "p")), ("h", heading("Dive into pure sound", "h1", "h2")),
    ("t", text("<p>Demo copy — use this banner to tell the story of the collection: materials, sound, the way it fits a room.</p>", "body"))])
C["services"] = S["services"]
(HERE / "templates/collection.json").write_text(json.dumps({"sections": C, "order": ["main", "story", "services"]}, indent=2) + "\n")


header = {"type": "header", "name": "t:sections.groups.header", "sections": {
    "announcement": section("announcement-bar", {"mode": "rotate", "show_arrows": True, "show_social": True, "show_country_selector": True, "show_language_selector": True, "color_scheme": "scheme-2"}, [
        ("a1", blk("_announcement", {"text": "Demo store — sample products from Shopify's mock catalogs", "icon": "tag"})),
        ("a2", blk("_announcement", {"text": "Free shipping message goes here", "icon": "truck"}))]),
    "header": section("header", {"menu": "demo-tech-main", "layout": "logo_left_menu_center", "sticky_mode": "scroll_up", "open_on": "hover", "border": False})},
    "order": ["announcement", "header"]}
(HERE / "sections").mkdir(exist_ok=True)
(HERE / "sections/header-group.json").write_text(json.dumps(header, indent=2) + "\n")
footer = {"type": "footer", "name": "t:sections.groups.footer", "sections": {"footer": section("footer", {"color_scheme": "scheme-3", "show_payment_icons": True, "show_policy_links": True}, [
    ("signup", blk("email-signup", {"heading": "Subscribe for new arrivals", "button_style": "arrow", "consent": "You can unsubscribe at any time."})),
    ("shop", blk("menu", {"heading": "Shop", "menu": "demo-tech-main"})),
    ("help", blk("menu", {"heading": "Help", "menu": "footer"})),
    ("social", blk("social-links", {"heading": "Follow us"}))])}, "order": ["footer"]}
(HERE / "sections/footer-group.json").write_text(json.dumps(footer, indent=2) + "\n")

schemes = {
    "scheme-1": {"background": "#FFFFFF", "background_gradient": "", "foreground": "#141414", "primary": "#141414", "on_primary": "#FFFFFF", "accent": "#C9A36B", "on_accent": "#141414"},
    "scheme-2": {"background": "#F4F4F2", "background_gradient": "", "foreground": "#141414", "primary": "#141414", "on_primary": "#FFFFFF", "accent": "#C9A36B", "on_accent": "#141414"},
    "scheme-3": {"background": "#141414", "background_gradient": "", "foreground": "#FFFFFF", "primary": "#FFFFFF", "on_primary": "#141414", "accent": "#C9A36B", "on_accent": "#141414"},
    "scheme-4": {"background": "#F6D86B", "background_gradient": "", "foreground": "#141414", "primary": "#141414", "on_primary": "#FFFFFF", "accent": "#141414", "on_accent": "#F6D86B"},
    "scheme-5": {"background": "#EFE7DC", "background_gradient": "", "foreground": "#141414", "primary": "#141414", "on_primary": "#FFFFFF", "accent": "#8A6A3F", "on_accent": "#FFFFFF"}}
settings = {"color_schemes": {k: {"settings": v} for k, v in schemes.items()},
    "type_heading_font": "inter_n7", "type_body_font": "inter_n4", "heading_letter_spacing": -30, "heading_line_height": 105,
    "nav_weight": "500", "button_weight": "600", "card_weight": "500",
    "page_width": 1360, "radius_card": 16, "radius_media": 16, "radius_input": 24, "radius_button": 40, "swatch_shape": "circle",
    "card_style": "card", "card_countdown": True, "badge_sold_out_position": "center", "card_image_fit": "cover", "card_show_vendor": True, "card_show_rating": True, "badge_new_days": 30,
    "button_hover": "darken", "color_badge_sale_bg": "#D93D2B", "color_rating": "#F2A900",
    "social_instagram": "https://instagram.com/shopify", "social_facebook": "https://facebook.com/shopify", "social_x": "https://x.com/shopify", "social_youtube": "https://youtube.com/shopify"}
(HERE / "config").mkdir(exist_ok=True)
(HERE / "config/settings_data.json").write_text(json.dumps({"current": settings}, indent=2) + "\n")
print("tech preset written")

# Product page: the template is kept as JSON beside this script (long block lists read better that way)
(HERE / "templates/product.json").write_text((HERE / "product.template.json").read_text())
