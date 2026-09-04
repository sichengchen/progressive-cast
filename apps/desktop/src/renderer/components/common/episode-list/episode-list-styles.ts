export type EpisodeListVariant = "compact" | "default" | "editorial" | "featured";

export const episodeListVariantStyles: Record<
  EpisodeListVariant,
  {
    artwork: string;
    content: string;
    item: string;
  }
> = {
  compact: {
    artwork: "size-12",
    content: "",
    item: "py-2.5 after:left-[4.25rem] after:right-2",
  },
  default: {
    artwork: "size-28",
    content: "h-28 justify-center",
    item: "items-stretch py-3 after:left-[8.25rem] after:right-2",
  },
  editorial: {
    artwork: "size-28",
    content: "h-28 justify-center",
    item: "items-stretch py-3 after:left-[8.25rem] after:right-2",
  },
  featured: {
    artwork: "size-24 md:size-28",
    content: "h-24 justify-center md:h-28",
    item: "items-start py-3 after:left-[7.75rem] after:right-2",
  },
};
