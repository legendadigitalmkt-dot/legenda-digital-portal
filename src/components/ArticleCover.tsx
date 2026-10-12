import React from "react";
import type { Post } from "../types";
import { safeUrl } from "../lib/validation";
export function imageKind(post: Post) {
  return (
    post.image_variant ||
    (post.featured_image.includes("/images/editorial/")
      ? "editorial"
      : "photography")
  );
}
export function imagePosition(position?: string) {
  return position &&
    (/^(center|top|bottom)$/.test(position) ||
      /^(100|[0-9]{1,2})% (100|[0-9]{1,2})%$/.test(position))
    ? position
    : "center";
}
export function ArticleCover({
  post,
  large = false,
}: {
  post: Post;
  large?: boolean;
}) {
  const batch = post.featured_image.startsWith("/images/editorial/batch1/");
  const stem = batch
    ? post.featured_image.replace(/-hero\.(webp|png|svg)$/, "-hero")
    : "";
  const regular =
    safeUrl(post.card_image || "") ||
    (stem ? stem + "-card.webp" : post.featured_image);
  const mobile =
    safeUrl(post.card_image_mobile || "") ||
    (stem ? stem + "-card-mobile.webp" : regular);
  const wide =
    safeUrl(post.card_image_large || "") ||
    (stem ? stem + "-large.webp" : regular);
  const responsive =
    batch || Boolean(post.card_image_mobile && post.card_image);
  return (
    <picture className={`article-cover cover-${imageKind(post)}`}>
      <source
        media="(max-width: 600px)"
        srcSet={responsive ? `${mobile} 480w, ${regular} 720w` : mobile}
        sizes="calc(100vw - 40px)"
      />
      {large && <source media="(min-width: 601px)" srcSet={wide} />}
      <img
        src={regular}
        srcSet={responsive ? `${mobile} 480w, ${regular} 720w` : undefined}
        sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1100px) 50vw, 400px"
        alt=""
        loading="lazy"
        decoding="async"
        width={large ? 1200 : 720}
        height={large ? 750 : 540}
        style={{ objectPosition: imagePosition(post.hero_position) }}
      />
    </picture>
  );
}
