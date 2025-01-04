# coding: utf-8

import json
import os
import re
import traceback
from datetime import datetime, timezone

import pytz
import requests
import youtube_dl

from requests_oauthlib import OAuth1

twitter_credential = OAuth1(
    client_key=os.environ["TWITTER_CONSUMER_KEY"],
    client_secret=os.environ["TWITTER_CONSUMER_SECRET"],
    resource_owner_key=os.environ["TWITTER_ACCESS_TOKEN_KEY"],
    resource_owner_secret=os.environ["TWITTER_ACCESS_TOKEN_SECRET"],
    decoding=None
)
github_repo = os.environ["GITHUB_REPOSITORY"]
telegram_token = os.environ["TG_BOT_TOKEN"]
tg_dbg_chatid = os.environ["TG_DBG_CHAT_ID"]

s = requests.Session()

def send_tweet(text, media_ids=None):
    data = {"text": text}
    if media_ids:
        data["media"] = {"media_ids": [str(i) for i in media_ids]}

    resp = s.post(
        "https://api.twitter.com/2/tweets",
        headers={"Content-Type": "application/json"},
        data=json.dumps(data, ensure_ascii=True).encode("utf-8"),
        auth=twitter_credential
    )

    if not resp.ok:
        log(resp.content)
        resp.raise_for_status()

    return resp.json()

DB_URL = "https://raw.githubusercontent.com/SerCom-KC/cartoon-network-videos/db/%s.json"
DIFF_URL = "https://raw.githubusercontent.com/%s/%s/diff.json?"
PREVIEW_OUTPUT_PATH = "/tmp/%s_preview.mp4"

# Resets the spanish episode counter
espanol = 0

def log(text):
    text = "webhook: " + str(text)
    params = {
        "chat_id": tg_dbg_chatid,
        "text": text
    }
    try:
        s.get("https://api.telegram.org/bot%s/sendMessage" % (telegram_token), params=params, timeout=3)
    except requests.exceptions.ReadTimeout:
        pass
    print(text)

def escape(string):
    # not necessary for Twitter here
    return string

def is_new_video(video):
    try:
        # Use the db branch to check
        resp = s.head(DB_URL % (video["titleid"]))
        if resp.status_code == 200: return False
        if resp.status_code == 404: return True
        resp.raise_for_status()
    except Exception:
        # Using the banner text to decide whether the video is a new one (not accurate)
        banner_text = video.get("bannertext", "").upper()
        return banner_text in ["SEE IT FIRST", "LATEST EPISODE"]

def parse_video(video):
    global espanol
    if not video["seasonnumber"] or video["seasonnumber"] == "0":
        seasonno = "??"
    else:
        seasonno = video["seasonnumber"].zfill(2)
    if not video["seasonepisodenumber"] or video["seasonepisodenumber"] == "0":
        episodeno = "??"
    else:
        episodeno = video["seasonepisodenumber"].zfill(2)
    ep_result = ""
    if video["originalseriesname"] != "":
        ep_result += "%s S%s" % (escape(video["originalseriesname"]), seasonno)
        if video["type"] == "short":
            ep_result += " Short"
        else:
            ep_result += "E%s" % (episodeno)
        ep_result += " - "
    ep_result += "%s\n" % (escape(video["title"]))
    new_flag = False
    if is_new_video(video):
        ep_result += "🆕 "
        new_flag = True
        if escape(video["originalseriesname"]).rstrip().endswith("en Espanol"):
            espanol += 1
            if espanol > 3: return -1
    else:
        return -1
    ep_result += f"{video['tvratingcode']} {'🔒' if video['authtype'] == 'auth' else '🔓'} {int(video['duration'] / 60):02}:{video['duration'] % 60:02}\n"
    expires = datetime.fromtimestamp(int(video["expdateasmilliseconds"])/1000, timezone.utc).replace(tzinfo=pytz.timezone("UTC")).astimezone(tz=pytz.timezone("US/Eastern"))
    ep_result += expires.strftime("⌛ %B ")
    ep_result += expires.strftime("%d, %Y at %H:%M:%S %Z\n").lstrip("0")
    app_url = f'https://cnvideo.sercomkc.org/redirector.html?type=cnapp&seriesid={video["seriesid"]}&titleid={video["titleid"]}&mediaid={video["mediaid"]}'
    ep_result += "APP: %s\n" % (app_url)
    if video["seofriendlyurl"] != "":
        ep_result += "WEB: https://www.cartoonnetwork.com%s\n" % (video["seofriendlyurl"])
    ep_result += "seriesid=%s titleid=%s mediaid=%s\n" % (video["originalseriesid"] if video["originalseriesid"] != "0" else video["seriesid"], video["titleid"], video["mediaid"])

    # Make sure there's always a valid thumbnail URL
    for i in range(0, 3):
        try:
            thumb_resp = s.head(video["thumbnailurl"]).status_code
            break
        except Exception:
            if i >= 2: thumb_resp = 503
    if thumb_resp != 200:
        thumbnail_fixed = "https://i.cartoonnetwork.com/orchestrator/%s" % (video["titleid"])
        thumbnail_suffix = re.search("_[0-9]{3}_[0-9]{3,4}x[0-9]{3}.jpg", video["thumbnailurl"])
        if thumbnail_suffix:
            thumbnail_suffix = thumbnail_suffix.group(0)
            thumbnail_fixed += thumbnail_suffix
            video["thumbnailurl"] = thumbnail_fixed
        for i in range(0, 3):
            try:
                thumb_resp = s.head(video["thumbnailurl"]).status_code
                break
            except Exception:
                if i >= 2: thumb_resp = 503
        if thumb_resp != 200:
            video["thumbnailurl"] = "https://i.cartoonnetwork.com/orchestrator/%s_001_640x360.jpg" % (video["titleid"])

    thumbnail_url = video["thumbnailurl"].replace("640x360", "1280x720")
    thumbnail_filename = thumbnail_url.split("/")[-1]
    with open(f"/tmp/{thumbnail_filename}", "wb") as f:
        f.write(s.get(thumbnail_url).content)

    media_ids = []
    with open(f"/tmp/{thumbnail_filename}", "rb") as f:
        resp = s.post(
            "https://upload.twitter.com/1.1/media/upload.json",
            files={"media": (thumbnail_filename, f)},
            auth=twitter_credential
        )
        resp.raise_for_status()
        resp = resp.json()
        media_ids.append(resp["media_id"])

    return send_tweet(ep_result, media_ids)["data"]["id"]

def send_preview(video):
    if video["twitter_status_id"] == -1: return
    return # we are not sending preview videos to Twitter for this time
    output_path = PREVIEW_OUTPUT_PATH % (video["mediaid"])

    try:
        opts = {
            "format": "[height<=?360]",
            "hls_prefer_native": True,
            "geo_bypass_country": "US",
            "outtmpl": output_path,
            "postprocessor_args": ["-movflags", "+faststart"]
        }
    
        preview = s.get("https://medium.ngtv.io/media/%s/phone/preview" % (video["mediaid"]), timeout=10).json()
        preview_link = preview["media"]["phone"]["preview"]["secureUrl"]
        preview_duration = preview["media"]["phone"]["preview"]["totalRuntime"]

        if youtube_dl.YoutubeDL(opts).download([preview_link]) == 0:
            media_ids = []
            raise NotImplementedError
            #media_ids.append(twitter_v1_1.media_upload(filename=output_path).media_id)
            #twitter_v2.create_tweet(text=escape(video["description"]), in_reply_to_tweet_id=video["twitter_status_id"], media_ids=media_ids, user_auth=True)
    except Exception:
        pass

    try:
        os.remove(output_path)
    except Exception:
        pass

def format_wording(videos, word):
    number_of_videos = len(videos)
    if number_of_videos == 1:
        return "1 video was %s" % (word)
    elif number_of_videos > 1:
        return "%d videos were %s" % (number_of_videos, word)
    return ""

def main():
    commit_hash = os.environ["GITHUB_SHA"]
    ref = os.environ["GITHUB_REF"]
    before_hash = os.environ["GITHUB_BEFORE"]

    # Fetching the diff result of the previous push. This is for:
    # a. calculating the time elapsed
    # b. avoiding unnecessary pushes, e.g. a video removed during the previous push has just added back
    prev_video_list = s.get(DIFF_URL % (github_repo, before_hash)).json()
    prev_video_list_updated = datetime.fromtimestamp(int(prev_video_list["updated"]), timezone.utc).replace(tzinfo=pytz.timezone("UTC")).astimezone(tz=pytz.timezone("US/Eastern"))

    video_list = s.get(DIFF_URL % (github_repo, commit_hash)).json()
    added_videos = video_list["added"]
    removed_videos = video_list["removed"]

    if len(added_videos) > 0 or len(removed_videos) > 0:
        log("%s: Processing %s added video(s) and %s removed video(s)." % (ref, len(added_videos), len(removed_videos)))
    else:
        print("No changes detected, nothing to do")

    if ref == "refs/heads/master":
        new_count = 0
        for video in added_videos:
            if is_new_video(video):
                new_count += 1

        text = format_wording(added_videos, "added")
        if new_count == 1:
            text += " (including 1 new episode/short)"
        elif new_count > 1:
            text += " (including %d new episodes/shorts)" % (new_count)
        if len(added_videos) != 0 and len(removed_videos) != 0:
            text += " and "
        text += format_wording(removed_videos, "removed")
        if not text: return

        since_str = prev_video_list_updated.strftime("%B ")
        since_str += prev_video_list_updated.strftime("%d, %Y at %H:%M:%S %Z").lstrip("0")
        text += " since %s. Visit https://github.com/%s/blob/%s/diff.md for a complete list of updates." % (since_str, github_repo, commit_hash)
        send_tweet(text)

    elif ref == "refs/heads/fastring":
        prev_rm_video_list = prev_video_list["removed"]
        prev_rm_titleid_list = [i["titleid"] for i in prev_rm_video_list]

        added_videos = [video for video in added_videos if video["titleid"] not in prev_rm_titleid_list]

        for video in added_videos:
            video["twitter_status_id"] = -1
            video["twitter_status_id"] = parse_video(video)

        if espanol > 3:
            text = "There are %d more Spanish-dubbed new episodes/shorts not listed." % (espanol-3)
            send_tweet(text)

        if added_videos:
            os.system("sudo apt-get install ffmpeg -y")
            for video in added_videos:
                send_preview(video)

if __name__ == "__main__":
    print("Update processing begin")
    try:
        main()
    except Exception:
        log("An unexpected error occurred")
        log(traceback.format_exc())
        raise SystemExit
