"""Generates the Living demo preset (furniture & lighting). Run: python3 presets/living/build.py
Demo content uses Shopify mock.shop catalogs (Haven & Hearth, Lumina Form Collective) imported into the demo store."""
import json, pathlib
HERE = pathlib.Path(__file__).parent
img = lambda f: f"shopify://shop_images/{f}"
def blk(type_, settings=None, blocks=None):
    b = {"type": type_, "settings": settings or {}}
    if blocks:
        b["blocks"] = dict(blocks); b["block_order"] = [k for k, _ in blocks]
    return b
section = blk
def heading(text, size="h2", tag="h2", align="left"): return blk("heading", {"text": text, "size": size, "tag": tag, "alignment": align})
def text(html, size="body", muted=False, align="left"): return blk("text", {"text": html, "size": size, "muted": muted, "alignment": align})
def button(label, link, style="primary"): return blk("button", {"label": label, "link": link, "style": style})

S = {}
S["slideshow"] = section("slideshow", {"autoplay": True, "autoplay_interval": 7, "height": "full", "full_width": True, "transparent_header": True, "padding_top": 0, "padding_bottom": 0}, [
    (f"slide-{i}", blk("_slide", {"image": img(im), "overlay_opacity": 20, "position": "bottom_left", "content_align": "start", "text_color_scheme": "scheme-3"}, [
        ("title", heading(t, "display", "h2")), ("cta", button(cta, link, "secondary"))]))
    for i, (im, t, cta, link) in enumerate([
        ("1b556fa9-ef2b-4489-ac37-bd96f923be1a.png", "Comfort, style, durability", "Shop living", "shopify://collections/quiet-living-spaces"),
        ("209ec08f-ac98-4591-b94c-3c164a07a1eb.png", "Gather around oak", "Shop dining", "shopify://collections/the-communal-hearth"),
        ("0cf2af3d-3aea-467a-98e9-b5edcadf71c8.png", "Light that sets the mood", "Shop lighting", "shopify://collections/luminous-intervals")], 1)])
S["collage"] = section("collage", {"heading": "Love where you <em>live</em>", "heading_highlight": "squiggle", "row_height": 260, "overlay_opacity": 25, "padding_top": 72, "padding_bottom": 48}, [
    ("c1", blk("_collage-item", {"media_type": "collection", "collection": "quiet-living-spaces", "subtitle": "Sit comfortably, feel at home", "show_arrow": True, "column_span": 5, "row_span": 2, "image": img("30d322ab-e210-49be-aad8-f3e38377d2a8.png")})),
    ("c2", blk("_collage-item", {"media_type": "collection", "collection": "the-communal-hearth", "subtitle": "Gather around the table", "show_arrow": True, "column_span": 7, "row_span": 1, "image": img("ce02b08f-22b1-4170-a4c6-199f9aae9022.png")})),
    ("c3", blk("_collage-item", {"media_type": "collection", "collection": "luminous-intervals", "subtitle": "Light that sets the mood", "show_arrow": True, "column_span": 4, "row_span": 1, "mobile_width": "half", "image": img("65e5906f-483f-4621-9c17-d599148e57c0.png")})),
    ("c4", blk("_collage-item", {"media_type": "collection", "collection": "sculptural-foundations", "subtitle": "Finishing touches", "show_arrow": True, "column_span": 3, "row_span": 1, "mobile_width": "half", "image": img("4bf3aed8-d59c-46db-bb85-efb8d8c65015.png")}))])
S["statement"] = section("scroll-reveal-text", {"text": "Our sofa collection blends modern Scandinavian design with sculptural forms, for comfort and style in any space.", "split": "auto", "start_opacity": 20, "size": "h1", "tag": "h2", "alignment": "center", "text_width": "medium", "padding_top": 120, "padding_bottom": 72})
S["reveal"] = section("reveal-image-with-text", {"image": img("8e52ef4d-cd33-4abc-85bb-8040ae3c3f15.png"), "start_size": 45, "overlay_opacity": 20, "content_position": "bottom_left", "content_align": "start", "text_color_scheme": "scheme-3"}, [
    ("h", heading("Walnut modular sofa", "h1", "h2")), ("b", button("Discover the sofa", "shopify://products/walnut-brown-modular-sofa", "secondary"))])
S["lounge"] = section("image-with-text", {"image": img("4abef0c7-ac75-481b-afbd-41096b7f0f0f.png"), "image_position": "start", "image_width": "wide", "image_ratio": "landscape", "padding_top": 96, "padding_bottom": 96}, [
    ("h", heading("Meet the linen sectional", "h1", "h2")),
    ("t", text("<p>Deep seats, a sturdy frame and removable Belgian linen covers. Demo copy — replace with your own product story.</p>", "body", True)),
    ("b", button("View full details", "shopify://products/belgian-linen-sectional-sofa", "secondary"))])
S["inline"] = section("inline-image-text", {"text": "Work comfortably with our [image1] desk lamps and create a cozy [image2] living room with our <em>sculptural</em> [image3] sofas", "heading_highlight": "squiggle", "size": "h1", "tag": "h2", "image_height": 90, "alignment": "center", "width": "page", "padding_top": 72, "padding_bottom": 96}, [
    ("i1", blk("image", {"image": img("65e5906f-483f-4621-9c17-d599148e57c0.png"), "shape": "pill"})),
    ("i2", blk("image", {"image": img("ce02b08f-22b1-4170-a4c6-199f9aae9022.png"), "shape": "circle"})),
    ("i3", blk("image", {"image": img("30d322ab-e210-49be-aad8-f3e38377d2a8.png"), "shape": "pill"}))])
S["bundle"] = section("bundle-builder", {"eyebrow": "Mix and match", "heading": "Create your <em>bundle</em>", "description": "<p>Pick three pieces that belong together and add them to the cart in one go.</p>",
    "products": ["artistic-table-lamp", "contemporary-ceramic-vase", "handcrafted-ceramic-vase-in-sand-glaze", "firebrick-wall-sconce", "ash-hardwood-dining-chair-with-linea-silhouette", "ash-taupe-custom-oversized-carpet"],
    "columns_desktop": 3, "columns_mobile": "2", "min_items": 3, "max_items": 6, "allow_duplicates": False, "panel_heading": "Your bundle", "note": "Choose at least three pieces.", "panel_color_scheme": "scheme-2", "padding_top": 72, "padding_bottom": 72})
S["featured"] = section("featured-product", {"product": "ash-hardwood-dining-chair-with-linea-silhouette", "gallery_layout": "slider", "thumbnail_position": "start", "media_width": "large", "badge_text": "Featured piece • Featured piece • ", "badge_icon": "sparkle", "enable_zoom": True, "show_details_link": True, "padding_top": 72, "padding_bottom": 72}, [
    ("title", blk("product-title", {"size": "h2", "show_vendor": True})), ("rating", blk("product-rating", {"anchor": ""})), ("price", blk("product-price", {"show_tax_note": False})),
    ("picker", blk("product-variant-picker", {"style": "buttons", "swatches": True})), ("buy", blk("product-buy-buttons", {"show_quantity": True, "show_dynamic_checkout": False}))])
S["arrivals"] = section("featured-collection", {"heading": "New arrivals", "text": "<p>Explore pieces for living, dining and working, from Shopify's sample furniture and lighting catalogs.</p>", "collection": "demo-living-all", "products_to_show": 10, "columns_desktop": 4, "layout": "carousel", "mobile_layout": "slider", "show_view_all": False, "padding_top": 72, "padding_bottom": 72})
S["about"] = section("image-with-text", {"image": img("a2fbe9e4-851b-4354-bd1d-cd6008fc8936.png"), "image_position": "start", "image_width": "half", "image_ratio": "portrait", "image_style": "overlap", "second_image": img("4bf3aed8-d59c-46db-bb85-efb8d8c65015.png"), "image_rotation": 4, "color_scheme": "scheme-2", "padding_top": 96, "padding_bottom": 96}, [
    ("e", heading("About us", "eyebrow", "p")), ("h", heading("Modern design, timeless aesthetics, meticulous craftsmanship.", "h2", "h2")), ("b", button("More about us", "shopify://pages/contact"))])
S["services"] = section("multicolumn", {"heading": "", "columns": 4, "columns_mobile": "2", "mobile_layout": "stack", "card_style": "filled", "icon_position": "start", "icon_size": 28, "padding_top": 56, "padding_bottom": 56}, [
    (f"c{i}", blk("_column", {"media": "icon", "icon": ic, "heading": h, "text": f"<p>{t}</p>"})) for i, (ic, h, t) in enumerate([
        ("chat", "Customer service", "Real people answer within one business day."), ("truck", "Delivery", "Describe your delivery promise here."),
        ("gift", "Refer a friend", "Explain your referral offer here."), ("lock", "Secure payment", "Payments are processed by Shopify.")], 1)])
S["feed"] = section("shop-the-feed", {"heading": "Shop the <em>feed</em>", "heading_highlight": "squiggle", "text": "<p>Demo posts — connect your own social images and tag the products in them.</p>",
    "account_handle": "@yourstore", "follow_label": "Follow", "follow_link": "https://instagram.com", "platform_icon": "instagram", "layout": "slider", "columns": 5, "image_ratio": "portrait", "quick_add": True, "padding_top": 72, "padding_bottom": 72}, [
    (f"p{i}", blk("post", {"image": img(f), **({"product_1": h} if h else {})})) for i, (f, h) in enumerate([
        ("1939d2f9-a5bf-4034-a077-9eb1e3dbc84e.png", "artistic-table-lamp"), ("ccd0fd95-77db-40d5-8fa8-2597bcb4191b.png", "firebrick-wall-sconce"),
        ("b4420773-b7ee-4b0f-a17d-516883af22f2.png", "contemporary-ceramic-vase"), ("f25c35c2-caa8-4569-95d0-6c6ad5556a31.png", None),
        ("a01d0525-a904-434c-b642-8b17eeff9ba6.png", None), ("0cf2af3d-3aea-467a-98e9-b5edcadf71c8.png", None)], 1)])
S["designers"] = section("people-cards", {"heading": "Meet our <em>designers</em>", "heading_highlight": "underline", "text": "<p>Introduce the people behind your products. Demo cards — replace names, roles and photos.</p>",
    "card_style": "overlay", "columns": 4, "view_all_label": "View all designers", "view_all_link": "shopify://pages/contact", "padding_top": 72, "padding_bottom": 72}, [
    (f"d{i}", blk("person", {"image": img(f), "name": "Designer name", "role": r, "bio": "<p>A short biography goes here: background, favourite materials and signature pieces.</p>"})) for i, (f, r) in enumerate([
        ("2b29ca26-96c3-4683-b7c0-abd1d544bdc0.png", "Ceramics"), ("0cf2af3d-3aea-467a-98e9-b5edcadf71c8.png", "Lighting"),
        ("ce02b08f-22b1-4170-a4c6-199f9aae9022.png", "Furniture"), ("2dc8737d-8e6b-4cc0-877a-10565fd5438c.png", "Textiles")], 1)])
S["blog"] = section("blog-posts", {"heading": "From the journal", "blog": "journal", "post_count": 3, "columns_desktop": 3, "show_view_all": True, "padding_top": 72, "padding_bottom": 56})
order = ["slideshow", "collage", "bundle", "statement", "reveal", "lounge", "inline", "featured", "arrivals", "about", "feed", "designers", "blog", "services"]
(HERE / "templates").mkdir(exist_ok=True)
overlay = json.loads((HERE.parent.parent / "sections/overlay-group.json").read_text())
overlay["sections"]["floating_bar"].update({"disabled": False, "settings": {**overlay["sections"]["floating_bar"].get("settings", {}), "show_on": "home", "position": "start", "show_social": True, "tab_label": "Newsletter", "hide_on_scroll": True, "show_on_mobile": False}})
(HERE / "sections").mkdir(exist_ok=True)
(HERE / "sections/overlay-group.json").write_text(json.dumps(overlay, indent=2) + "\n")
(HERE / "templates/index.json").write_text(json.dumps({"sections": S, "order": order}, indent=2) + "\n")
# Collection page (reference: plain header + breadcrumb, subcollection tabs, sidebar filters, 2x2 promo tile, dark story banner, services)
C = {}
C["main"] = section("main-collection", {"header_style": "plain", "show_breadcrumb": True, "show_description": False, "heading_size": "display", "header_alignment": "start",
    "subcollection_source": "list", "subcollections": ["demo-living-all", "quiet-living-spaces", "the-communal-hearth", "luminous-intervals", "sculptural-foundations"],
    "subcollection_style": "tabs", "subcollection_placement": "toolbar", "subcollection_show_count": True, "products_per_page": 12, "columns_desktop": 3, "columns_mobile": "2",
    "pagination": "load_more", "card_quick_add": True, "enable_filters": True, "filter_layout": "sidebar", "enable_sorting": True, "padding_top": 32, "padding_bottom": 96}, [
    ("promo", blk("promo", {"position": 5, "column_span": "2", "row_span": "2", "image": img("4abef0c7-ac75-481b-afbd-41096b7f0f0f.png"), "overlay_opacity": 30,
        "heading": "Discover the ideal chair", "button_label": "View seating", "link": "shopify://collections/quiet-living-spaces",
        "content_position": "bottom", "content_alignment": "end", "color_scheme": "scheme-3"}))])
C["story"] = section("rich-text", {"width": "narrow", "alignment": "start", "color_scheme": "scheme-3", "padding_top": 96, "padding_bottom": 96}, [
    ("i", blk("icon", {"icon": "leaf"})), ("e", heading("Living", "eyebrow", "p")), ("h", heading("Elegance and comfort", "h2", "h2")),
    ("t", text("<p>Demo copy — describe the collection here: shapes, materials and the feeling you want the room to have.</p>", "body"))])
C["services"] = S["services"]
(HERE / "templates/collection.json").write_text(json.dumps({"sections": C, "order": ["main", "story", "services"]}, indent=2) + "\n")


header = {"type": "header", "name": "t:sections.groups.header", "sections": {
    "header": section("header", {"menu": "demo-living-main", "layout": "logo_center_menu_left", "sticky_mode": "scroll_up", "open_on": "hover", "border": False, "show_country_selector": True})},
    "order": ["header"]}
(HERE / "sections").mkdir(exist_ok=True)
(HERE / "sections/header-group.json").write_text(json.dumps(header, indent=2) + "\n")
footer = {"type": "footer", "name": "t:sections.groups.footer", "sections": {"footer": section("footer", {"color_scheme": "scheme-4", "show_payment_icons": True, "show_policy_links": True}, [
    ("signup", blk("email-signup", {"heading": "Join our newsletter", "button_style": "arrow", "consent": "You can unsubscribe at any time."})),
    ("shop", blk("menu", {"heading": "Shop", "menu": "demo-living-main"})),
    ("help", blk("menu", {"heading": "Help", "menu": "footer"})),
    ("social", blk("social-links", {"heading": "Follow us"}))])}, "order": ["footer"]}
(HERE / "sections/footer-group.json").write_text(json.dumps(footer, indent=2) + "\n")

schemes = {
    "scheme-1": {"background": "#FBF8F6", "background_gradient": "", "foreground": "#5E3540", "primary": "#6E3F4A", "on_primary": "#FFFFFF", "accent": "#B9C58E", "on_accent": "#2E1D22"},
    "scheme-2": {"background": "#F3ECEA", "background_gradient": "", "foreground": "#5E3540", "primary": "#6E3F4A", "on_primary": "#FFFFFF", "accent": "#B9C58E", "on_accent": "#2E1D22"},
    "scheme-3": {"background": "#2E1D22", "background_gradient": "", "foreground": "#FFFFFF", "primary": "#FFFFFF", "on_primary": "#2E1D22", "accent": "#B9C58E", "on_accent": "#2E1D22"},
    "scheme-4": {"background": "#6E3F4A", "background_gradient": "linear-gradient(135deg, rgba(110, 63, 74, 1) 0%, rgba(148, 120, 96, 1) 55%, rgba(185, 197, 142, 1) 100%)", "foreground": "#FFFFFF", "primary": "#FFFFFF", "on_primary": "#6E3F4A", "accent": "#B9C58E", "on_accent": "#2E1D22"},
    "scheme-5": {"background": "#E8E2D9", "background_gradient": "", "foreground": "#5E3540", "primary": "#6E3F4A", "on_primary": "#FFFFFF", "accent": "#6E3F4A", "on_accent": "#FFFFFF"}}
settings = {"color_schemes": {k: {"settings": v} for k, v in schemes.items()},
    "type_heading_font": "jost_n4", "type_body_font": "jost_n4", "heading_uppercase": True, "heading_line_height": 105, "heading_letter_spacing": 0,
    "nav_uppercase": True, "nav_weight": "500", "nav_size": 13, "button_uppercase": True, "button_weight": "500", "button_size": 13, "button_letter_spacing": 40,
    "card_uppercase": True, "card_weight": "400", "card_text_align": "center",
    "page_width": 1400, "radius_card": 12, "radius_media": 12, "radius_input": 24, "radius_button": 40, "swatch_shape": "circle",
    "card_image_fit": "contain", "card_show_vendor": False, "badge_new_days": 30, "color_badge_sale_bg": "#D4254B", "color_sale": "#D4254B",
    "social_instagram": "https://instagram.com/shopify", "social_facebook": "https://facebook.com/shopify", "social_pinterest": "https://pinterest.com/shopify", "social_x": "https://x.com/shopify"}
(HERE / "config").mkdir(exist_ok=True)
(HERE / "config/settings_data.json").write_text(json.dumps({"current": settings}, indent=2) + "\n")
print("living preset written")

# Product page: the template is kept as JSON beside this script (long block lists read better that way)
(HERE / "templates/product.json").write_text((HERE / "product.template.json").read_text())
