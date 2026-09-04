export type EpisodeListVariant = "compact" | "default" | "editorial" | "featured";

export const episodeListVariantStyles: Record<
  EpisodeListVariant,
  {
    artwork: string;
    content: string;
    item: string;
    title: string;
  }
> = {
  compact: {
    artwork: "size-10",
    content: "h-10",
    item: "items-stretch py-2.5 after:left-[3.75rem] after:right-2",
    title: "line-clamp-1",
  },
  default: {
    artwork: "size-[5.25rem]",
    content: "h-[5.25rem]",
    item: "items-stretch py-3 after:left-[6.5rem] after:right-2",
    title: "line-clamp-1",
  },
  editorial: {
    artwork: "size-[5.25rem]",
    content: "h-[5.25rem]",
    item: "items-stretch py-3 after:left-[6.5rem] after:right-2",
    title: "line-clamp-1",
  },
  featured: {
    artwork: "size-24 md:size-28",
    content: "h-24 justify-center md:h-28",
    item: "items-start py-3 after:left-[7.75rem] after:right-2",
    title: "line-clamp-2",
  },
};
