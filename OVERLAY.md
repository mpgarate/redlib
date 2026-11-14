# The compact overlay layout (`layout=compact-overlay`)

A fourth layout, selectable in settings: a post as a card - title, byline, content, and the
score read as the first words of the footer line - with an image lightbox over the list.

It came from [mpgarate/redlib's `compact-overlay-nachtalb`](https://github.com/mpgarate/redlib/tree/compact-overlay-nachtalb)
branch, which carried the feature by editing upstream's own files. That version was hard to keep
current: against `nachtalb/main` it changed **415 added and 67 removed lines across 7 upstream
files**, because the layout had copied whole posts with a few classes added, and
`templates/utils.html`, `static/style.css` and `src/utils.rs` - the three files it touched most -
are exactly the ones `nachtalb/main` rewrites most. Every upstream change to a post card or to
media parsing collided with it.

So the layout is now a layer instead. **`nachtalb/main` is the fork; these files are the fork's
change.**

## The rule

Adding this feature must never require editing upstream's lines, only adding lines of our own
between them. Concretely:

- A layout must not change markup to place itself. Position is CSS's: a `.post` is already a
  named grid, and upstream itself puts the score on the footer row at narrow widths - the
  compact overlay is that one grid template at every width, not a second kind of post.
- New CSS, JS and Rust go in files upstream does not have. A new file cannot conflict.
- Where markup really is needed (a settings option, the lightbox, a post's media list), it goes
  in a file of its own and enters an upstream file through one `{% include %}` or `{% import %}`.
- `static/style.css` is served from upstream's own route and is never edited; the layout's sheet
  is a separate route loaded after it, so nothing here races with the cascade.
- Nothing is added to `Post`. The one value the server must supply (which image a post offers the
  lightbox) is a method in `src/overlay.rs`, reading fields `Post` already has. A field would
  mean editing `Post` and every place that builds it, which is the churn this rule exists to stop.

Measured against `nachtalb/main`: **12 added lines, 0 changed and 0 deleted lines, in 5 upstream
files** (10 hook lines, plus the 2 blank lines that keep them clear of upstream's own). `templates/utils.html`, `static/style.css`, `src/utils.rs` and `templates/subreddit.html`
- the four files the old branch conflicted over - are byte for byte upstream's.

## Files the layout owns

| File | Role |
|---|---|
| `src/overlay.rs` | The whole Rust side: `Post::overlay_image_url()`, its `pick` helper, and its unit tests. |
| `static/overlay.css` | Every pixel the layout changes, plus the lightbox. |
| `static/image_overlay.js` | The lightbox. Also turns an ordinary thumbnail into a trigger from the data below. |
| `templates/overlay.html` | The lightbox markup and script tag, and the `data(post)` macro: what a post can show. |
| `templates/overlay_layout_option.html` | The layout's entry in the settings layout list. |

## The hooks, and what to do if one goes missing

Ten hook lines in five upstream files, none of them a change to an upstream line. Each carries an
`OVERLAY` marker, so this prints them all:

```sh
git grep -n -E "OVERLAY|overlay" -- src/main.rs src/lib.rs templates/base.html templates/utils.html templates/settings.html
```

| File | Hook | Why it is there |
|---|---|---|
| `src/lib.rs` | `pub mod overlay;` | The module, and the only place the layout is named in Rust. |
| `src/main.rs` | two `// OVERLAY` routes | Serve `overlay.css` and `image_overlay.js` from `static/`. |
| `templates/base.html` | `<link href="/overlay.css">` | The sheet, loaded after `/style.css`, only for this layout. |
| `templates/base.html` | `{% include "overlay.html" %}` | The lightbox and its script, before the footer. |
| `templates/utils.html` | `{% import "overlay.html" as overlay %}` | Brings in the macro below. |
| `templates/utils.html` | `{{ overlay::data(post) }}` | Inside `post_in_list`, right under the post's opening `div`. |
| `templates/settings.html` | `{% include "overlay_layout_option.html" %}` | The option, added beside `utils::options(...)`. |

After a rebase, confirm none of them fell out. The counts should be `lib.rs` 1, `main.rs` 2,
`base.html` 2, `utils.html` 2, `settings.html` 1 - 8, not 10, because rustfmt splits one of the
two routes over three lines and only its last line carries the marker. The second command should
print nothing:

```sh
git grep -c "OVERLAY" -- src/main.rs src/lib.rs templates/base.html templates/utils.html templates/settings.html
git diff --stat nachtalb/main -- static/style.css src/utils.rs templates/subreddit.html
```

If a hook is gone because upstream moved the line around it, re-add the same line against the
nearest anchor from the table above; nothing else needs to change. If upstream deleted the
construct - took the layout setting out of `settings.html`, or renamed the post div - fix the
hook and note it here.

## Rebasing

```sh
git fetch nachtalb
git rebase nachtalb/main compact-overlay-nachtalb
```

Nothing under "Files the layout owns" should ever conflict. If one does, the rebase is being run
against the wrong base.

Then:

```sh
nix-shell --run "cargo fmt --check && cargo test --lib && cargo check --all-targets"
REDLIB_DEFAULT_LAYOUT=compact-overlay cargo run -- -a 127.0.0.1 -p 8099   # and look at /r/pics
```

## The DOM the layout styles

The layout has no markup of its own to protect, so it depends on upstream's instead. These are
the names it styles or reads; if upstream renames one, `static/overlay.css` and
`static/image_overlay.js` are the two files to update:

`.post` and its grid areas (`post_score`, `post_header`, `post_title`, `post_body`, `post_media`,
`post_poll`, `post_notification`, `post_footer`, `post_thumbnail`), `.post.highlighted` /
`.stickied` / `.post_blurred`, `.post_flair`, `.post_preview`, `.post_media`,
`.post_score .label`, `#post_url`, `#posts`, `.comments` / `.comments-link` / `.comments-count`,
and the `body class="{{ prefs.layout }}"` that scopes all of it.

## What the rule costs

Known and accepted, all of them on the side of a page without JavaScript:

- The score keeps its upstream position in the score column, because moving it is CSS and CSS
  needs the DOM already there. With JS it is placed on the footer row.
- A thumbnail keeps its permalink `href` and never becomes a trigger, so the lightbox simply does
  not exist. (Its media arrives by JS, from the islands `templates/overlay.html` emits.)
- Flair keeps Reddit's own inline colours, which include white-on-light for some subreddits; the
  script swaps those for the accent, and without it they stay hard to read.

The other trade: `card`, `clean` and `compact` share declarations with `.compact-overlay` in
places (`post_flair`, the media sizing, the score column). Duplicating them is what keeps the
layout from reaching into upstream's rules.
