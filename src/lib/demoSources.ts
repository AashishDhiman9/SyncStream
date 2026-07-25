import { VideoSource } from "../types";

export const DEFAULT_DEMO_SOURCES: VideoSource[] = [
  {
    id: "bbb-hls",
    title: "Big Buck Bunny 4K (HLS Adaptive Stream)",
    url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    type: "hls",
    thumbnail: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=60",
    duration: 596,
  },
  {
    id: "sintel-mp4",
    title: "Sintel Open Movie 1080p (Direct MP4)",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    type: "direct",
    thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&auto=format&fit=crop&q=60",
    duration: 888,
  },
  {
    id: "yt-trailer",
    title: "Tears of Steel 4K (YouTube Embed Sync)",
    url: "https://www.youtube.com/watch?v=rP3n-01vD8A",
    type: "youtube",
    thumbnail: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=60",
    duration: 734,
  },
  {
    id: "twitch-stream",
    title: "Twitch Demo Stream",
    url: "https://www.twitch.tv/monstercat",
    type: "twitch",
    thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=60",
  },
  {
    id: "tears-hls",
    title: "Tears of Steel (HLS Low-Latency Stream)",
    url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
    type: "hls",
    thumbnail: "https://images.unsplash.com/photo-1518173946687-a4c8a383392e?w=600&auto=format&fit=crop&q=60",
    duration: 734,
  },
];
