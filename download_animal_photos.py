"""
아쿠아플라넷 일산 동물 사진 다운로더
실행: python download_animal_photos.py
"""

import os
import re
import time
import urllib.request
from urllib.parse import urljoin, urlparse
from html.parser import HTMLParser


BASE_URL = "https://m.aquaplanet.co.kr"
LIST_URL = "https://m.aquaplanet.co.kr/ilsan/introduce/friend/list.do"
SAVE_DIR = "animal_photos"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) "
        "Version/16.0 Mobile/15E148 Safari/604.1"
    ),
    "Referer": BASE_URL,
    "Accept": "text/html,application/xhtml+xml,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
}


class ImageURLParser(HTMLParser):
    def __init__(self, base_url):
        super().__init__()
        self.base_url = base_url
        self.image_urls = []
        self.animal_links = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "img":
            src = attrs.get("src") or attrs.get("data-src") or attrs.get("data-original")
            if src:
                full_url = urljoin(self.base_url, src)
                if any(kw in full_url.lower() for kw in ["friend", "animal", "ilsan/introduce"]):
                    if full_url not in self.image_urls:
                        self.image_urls.append(full_url)
        if tag == "a":
            href = attrs.get("href", "")
            if "friend" in href and "view" in href:
                full_url = urljoin(self.base_url, href)
                if full_url not in self.animal_links:
                    self.animal_links.append(full_url)


class DetailImageParser(HTMLParser):
    def __init__(self, base_url):
        super().__init__()
        self.base_url = base_url
        self.image_urls = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "img":
            src = attrs.get("src") or attrs.get("data-src") or attrs.get("data-original")
            if src and any(kw in src.lower() for kw in ["friend", "animal", "introduce", "upload"]):
                full_url = urljoin(self.base_url, src)
                if full_url not in self.image_urls:
                    self.image_urls.append(full_url)


def fetch_html(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as response:
        return response.read().decode("utf-8", errors="ignore")


def download_image(url, save_path):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as response:
        with open(save_path, "wb") as f:
            f.write(response.read())


def get_extension(url):
    path = urlparse(url).path
    ext = os.path.splitext(path)[1].lower()
    return ext if ext in (".jpg", ".jpeg", ".png", ".gif", ".webp") else ".jpg"


def main():
    os.makedirs(SAVE_DIR, exist_ok=True)
    print(f"[1] 목록 페이지 불러오는 중: {LIST_URL}")

    try:
        html = fetch_html(LIST_URL)
    except Exception as e:
        print(f"오류: 페이지를 불러올 수 없습니다. ({e})")
        return

    parser = ImageURLParser(BASE_URL)
    parser.feed(html)

    print(f"    목록에서 이미지 {len(parser.image_urls)}개 발견")
    print(f"    상세 링크 {len(parser.animal_links)}개 발견")

    # 상세 페이지에서 추가 이미지 수집
    all_images = list(parser.image_urls)
    for i, link in enumerate(parser.animal_links, 1):
        print(f"[2] 상세 페이지 {i}/{len(parser.animal_links)}: {link}")
        try:
            detail_html = fetch_html(link)
            detail_parser = DetailImageParser(BASE_URL)
            detail_parser.feed(detail_html)
            for img_url in detail_parser.image_urls:
                if img_url not in all_images:
                    all_images.append(img_url)
            time.sleep(0.5)
        except Exception as e:
            print(f"    건너뜀: {e}")

    # 목록 페이지 전체 이미지도 재탐색 (data-src 포함)
    all_src = re.findall(r'(?:src|data-src|data-original)=["\']([^"\']+)["\']', html)
    for src in all_src:
        if any(kw in src.lower() for kw in ["friend", "animal", "introduce", "upload"]):
            full_url = urljoin(BASE_URL, src)
            if full_url not in all_images:
                all_images.append(full_url)

    if not all_images:
        print("이미지를 찾을 수 없습니다. 사이트 구조가 변경되었을 수 있습니다.")
        return

    print(f"\n[3] 총 {len(all_images)}개 이미지 다운로드 시작...")
    success = 0
    for i, url in enumerate(all_images, 1):
        ext = get_extension(url)
        filename = f"animal_{i:02d}{ext}"
        save_path = os.path.join(SAVE_DIR, filename)
        try:
            download_image(url, save_path)
            print(f"    [{i:02d}] 저장 완료: {filename}")
            success += 1
            time.sleep(0.3)
        except Exception as e:
            print(f"    [{i:02d}] 실패: {url} ({e})")

    print(f"\n완료! {success}/{len(all_images)}개 이미지가 '{SAVE_DIR}/' 폴더에 저장되었습니다.")


if __name__ == "__main__":
    main()
