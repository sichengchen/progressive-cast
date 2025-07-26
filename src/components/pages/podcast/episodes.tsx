"use client";

import { useEffect, useState } from "react";
import { usePodcastStore } from "@/lib/store";
import { EpisodeList } from "../../common/episode-list";

interface PodcastEpisodesProps {
    podcastId: string;
}

export function PodcastEpisodes({ podcastId }: PodcastEpisodesProps) {
    const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);

    const { episodes, playbackProgress, loadEpisodes, playEpisode } =
        usePodcastStore();

    useEffect(() => {
        const loadPodcastEpisodes = async () => {
            setIsLoadingEpisodes(true);
            await loadEpisodes(podcastId);
            setIsLoadingEpisodes(false);
        };

        loadPodcastEpisodes();
    }, [podcastId, loadEpisodes]);

    return (
        <div>
            <h2 className="text-xl font-semibold px-2">Episodes</h2>
            <EpisodeList
                isLoadingEpisodes={isLoadingEpisodes}
                episodes={episodes}
                playbackProgress={playbackProgress}
                playEpisode={playEpisode}
            />
        </div>
    );
}
