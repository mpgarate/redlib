//! The compact overlay layout (`layout=compact-overlay`): this file and nothing else in Rust.
//!
//! The layout's look is `static/overlay.css` and its lightbox is `static/image_overlay.js`, both
//! served by the two routes marked `// OVERLAY` in `src/main.rs` and loaded from the single
//! `{% include "overlay.html" %}` in `templates/base.html`. `static/style.css` and the rest of
//! upstream's files are left exactly as upstream wrote them, so a rebase onto `nachtalb/main`
//! has nothing to conflict over. See `OVERLAY.md`.
//!
//! The one thing the server has to know about is which image each post offers the lightbox. It
//! stays out of `Post`'s fields on purpose: a field means editing the struct and every place that
//! builds one, which is the file upstream rewrites most.

use crate::utils::Post;

/// Pick the largest single still image a post offers, from the pieces of it that matter.
///
/// `poster` is the `preview` image Reddit sends for every post type, the same source the RSS
/// enclosure uses, so falling back on it keeps the full-size media for image and gallery posts
/// and still shows something for the rest.
fn pick<'a>(post_type: &str, media_url: &'a str, poster: &'a str, thumbnail: &'a str, gallery_first: Option<&'a str>) -> &'a str {
	match post_type {
		"image" => media_url,
		"gallery" => gallery_first.unwrap_or(media_url),
		_ if !poster.is_empty() => poster,
		_ => thumbnail,
	}
}

impl Post {
	/// The image to open in the overlay for this post, or an empty string when it has none.
	pub fn overlay_image_url(&self) -> &str {
		pick(
			&self.post_type,
			&self.media.url,
			&self.media.poster,
			&self.thumbnail.url,
			self.gallery.first().map(|image| image.url.as_str()),
		)
	}
}

#[cfg(test)]
mod tests {
	use super::pick;

	const MEDIA: &str = "https://i.redd.it/full.jpg";
	const POSTER: &str = "https://preview.redd.it/preview.jpg";
	const THUMBNAIL: &str = "https://b.thumbs.redditmedia.com/tiny.jpg";

	#[test]
	fn test_an_image_post_overlays_its_full_image() {
		assert_eq!(pick("image", MEDIA, POSTER, THUMBNAIL, None), MEDIA);
	}

	#[test]
	fn test_a_gallery_overlays_its_first_item() {
		assert_eq!(pick("gallery", "https://redd.it/gallery", POSTER, THUMBNAIL, Some(POSTER)), POSTER);
	}

	#[test]
	fn test_a_video_overlays_its_preview_poster() {
		assert_eq!(pick("video", "https://v.redd.it/dashvideo", POSTER, THUMBNAIL, None), POSTER);
		assert_eq!(pick("gif", "https://redd.it/gif.mp4", POSTER, THUMBNAIL, None), POSTER);
	}

	#[test]
	fn test_a_link_without_a_preview_falls_back_to_its_thumbnail() {
		assert_eq!(pick("link", "https://example.com/article", "", THUMBNAIL, None), THUMBNAIL);
	}

	#[test]
	fn test_a_text_post_with_nothing_to_show_has_no_overlay() {
		assert!(pick("self", "", "", "", None).is_empty());
	}
}
