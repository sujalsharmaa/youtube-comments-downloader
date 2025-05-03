import requests
import pandas as pd
import os

API_KEY = os.environ.get("YOUTUBE_API_KEY", "AIzaSyAvRLJ6_m_AqPVMg84cULH-n0QhLjGeYrM")  # fallback for local testing

def fetch_and_convert_comments(video_id):
    url = f"https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId={video_id}&maxResults=100&key={API_KEY}"
    comments = []

    while url:
        r = requests.get(url)
        data = r.json()
        for item in data.get("items", []):
            c = item["snippet"]["topLevelComment"]["snippet"]
            comments.append({
                "author": c.get("authorDisplayName"),
                "text": c.get("textDisplay"),
                "publishedAt": c.get("publishedAt"),
                "likeCount": c.get("likeCount")
            })
        url = f"https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId={video_id}&pageToken={data.get('nextPageToken')}&maxResults=100&key={API_KEY}" if data.get("nextPageToken") else None

    # Convert list to DataFrame
    df = pd.DataFrame(comments)

    base = f"/tmp/{video_id}"

    file_paths = {
        "csv": f"{base}.csv",
        "json": f"{base}.json",
        "txt": f"{base}.txt",
        "html": f"{base}.html"
    }

    # Write CSV
    df.to_csv(file_paths["csv"], index=False, encoding='utf-8-sig')

    # Write JSON
    df.to_json(file_paths["json"], orient="records", force_ascii=False, indent=2)

    # Write TXT (ONLY the comments' text)
    with open(file_paths["txt"], "w", encoding="utf-8-sig") as f:
        for comment in comments:
            f.write(comment["text"]+"\n")  # Separate each comment by one newlines

    # Write HTML
    df.to_html(file_paths["html"], index=False)

    return df, file_paths
