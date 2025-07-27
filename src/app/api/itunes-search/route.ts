import { NextRequest, NextResponse } from "next/server";

interface ITunesSearchResult {
    collectionId?: number;
    trackId?: number;
    collectionName?: string;
    trackName?: string;
    artistName?: string;
    description?: string;
    artworkUrl600?: string;
    artworkUrl100?: string;
    feedUrl?: string;
    primaryGenreName?: string;
    trackCount?: number;
    releaseDate?: string;
    country?: string;
    language?: string;
    collectionViewUrl?: string;
    trackViewUrl?: string;
    contentAdvisoryRating?: string;
}

interface ITunesAPIResponse {
    resultCount: number;
    results: ITunesSearchResult[];
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const term = searchParams.get("term");
    const limit = searchParams.get("limit") || "10";

    if (!term) {
        return NextResponse.json(
            { error: "Missing required parameter: term" },
            { status: 400 }
        );
    }

    try {
        // iTunes Search API URL
        const itunesUrl = new URL("https://itunes.apple.com/search");
        itunesUrl.searchParams.set("term", term);
        itunesUrl.searchParams.set("media", "podcast");
        itunesUrl.searchParams.set("entity", "podcast");
        itunesUrl.searchParams.set("limit", limit);
        itunesUrl.searchParams.set("country", "US");
        itunesUrl.searchParams.set("explicit", "Yes");

        console.log("Searching iTunes with URL:", itunesUrl.toString());

        const response = await fetch(itunesUrl.toString(), {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; Progressive-Cast/1.0)",
                Accept: "application/json",
            },
            // 15 seconds timeout
            signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
            return NextResponse.json(
                {
                    error: `iTunes API request failed: ${response.status} ${response.statusText}`,
                },
                { status: response.status }
            );
        }

        const data: ITunesAPIResponse = await response.json();

        const transformedResults =
            data.results?.map((item: ITunesSearchResult) => ({
                id: item.collectionId?.toString() || item.trackId?.toString(),
                title: item.collectionName || item.trackName,
                author: item.artistName,
                description: item.description || "",
                imageUrl: item.artworkUrl600 || item.artworkUrl100,
                feedUrl: item.feedUrl,
                genre: item.primaryGenreName,
                trackCount: item.trackCount,
                releaseDate: item.releaseDate,
                country: item.country,
                language: item.language,
                // iTunes specific fields
                itunesUrl: item.collectionViewUrl || item.trackViewUrl,
                explicit: item.contentAdvisoryRating === "Explicit",
            })) || [];

        return NextResponse.json(
            {
                resultCount: data.resultCount || 0,
                results: transformedResults,
            },
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Cache-Control": "public, max-age=1800",
                },
            }
        );
    } catch (error) {
        console.error("iTunes search error:", error);

        // handle timeout error
        if (error instanceof DOMException && error.name === "TimeoutError") {
            return NextResponse.json(
                {
                    error: "Request timeout. iTunes search took too long to respond.",
                },
                { status: 408 }
            );
        }

        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        console.error("Detailed iTunes search error:", {
            term,
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
        });

        return NextResponse.json(
            { error: `iTunes search failed: ${errorMessage}` },
            { status: 500 }
        );
    }
}
