from fastapi import FastAPI, Query, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException
from pydantic import BaseModel, Field, AnyHttpUrl
from typing import List, Dict, Optional, Any, Union
import uuid
import time
import logging
import traceback
import requests
from bs4 import BeautifulSoup
import re
import json
from urllib.parse import urljoin, urlparse, quote_plus
import os
from datetime import datetime
import concurrent.futures
from fastapi.responses import JSONResponse

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("search_engine.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Create data directory if it doesn't exist
os.makedirs("data", exist_ok=True)

app = FastAPI(title="Enhanced Search Engine API", 
              description="API for web search, image search, and content scraping")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models
class SearchResult(BaseModel):
    id: str
    title: str
    snippet: str
    url: str
    source: str = "google"
    domain: str = Field(default="")
    position: int = Field(default=0)
    features: Dict[str, Any] = Field(default_factory=dict)

class ImageSearchResult(BaseModel):
    id: str
    url: str
    thumbnail_url: str
    title: str = ""
    source_url: str = ""
    source_domain: str = ""
    width: Optional[int] = None
    height: Optional[int] = None
    alt_text: str = ""
    position: int = Field(default=0)
    
class PageContent(BaseModel):
    url: str
    title: str
    content: str
    html: str
    meta_tags: Dict[str, str] = Field(default_factory=dict)
    links: List[Dict[str, str]] = Field(default_factory=list)
    images: List[Dict[str, str]] = Field(default_factory=list)
    text_blocks: List[str] = Field(default_factory=list)
    
class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    total_results: int = 0
    execution_time: float = 0
    error: Optional[str] = None

class ImageSearchResponse(BaseModel):
    query: str
    results: List[ImageSearchResult]
    total_results: int = 0
    execution_time: float = 0
    error: Optional[str] = None

class PageContentResponse(BaseModel):
    url: str
    content: Optional[PageContent] = None
    error: Optional[str] = None
    execution_time: float = 0

# Cache for search results with TTL (time to live)
search_cache = {}
image_cache = {}
cache_ttl = 3600  # 1 hour in seconds

# WebDriver Pool for better resource management
webdriver_pool = []
MAX_POOL_SIZE = 2  # Adjust based on your server resources

# Get a driver from the pool or create a new one
def get_driver_from_pool():
    if webdriver_pool:
        return webdriver_pool.pop()
    else:
        return create_new_driver()

# Return a driver to the pool
def return_driver_to_pool(driver):
    if len(webdriver_pool) < MAX_POOL_SIZE:
        try:
            # Clear cookies and cache
            driver.delete_all_cookies()
            webdriver_pool.append(driver)
        except:
            try:
                driver.quit()
            except:
                pass
    else:
        try:
            driver.quit()
        except:
            pass

# Initialize the WebDriver with custom options
def create_new_driver():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-popup-blocking")
    
    # Stealth options to avoid detection
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    
    # Additional options for performance
    options.add_argument("--disable-notifications")
    options.add_argument("--incognito")
    options.add_argument("--disable-infobars")
    
    # Memory optimization
    options.add_argument("--js-flags=--expose-gc")
    options.add_argument("--enable-precise-memory-info")
    options.add_argument("--disable-default-apps")
    options.add_argument("--disable-extensions-file-access-check")
    options.add_argument("--disable-accelerated-2d-canvas")
    options.add_argument("--disable-hang-monitor")
    
    try:
        driver = webdriver.Chrome(options=options)
        logger.info("Chrome driver initialized successfully")
        return driver
    except Exception as e:
        logger.error(f"Failed to initialize Chrome driver: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to initialize browser")

# Extract domain from URL
def extract_domain(url):
    try:
        parsed_url = urlparse(url)
        domain = parsed_url.netloc
        return domain
    except:
        return ""

# Clean cache periodically
def clean_expired_cache():
    current_time = time.time()
    
    # Clean search cache
    expired_keys = []
    for key, value in search_cache.items():
        if current_time - value.get("timestamp", 0) > cache_ttl:
            expired_keys.append(key)
    
    for key in expired_keys:
        search_cache.pop(key, None)
    
    # Clean image cache
    expired_keys = []
    for key, value in image_cache.items():
        if current_time - value.get("timestamp", 0) > cache_ttl:
            expired_keys.append(key)
    
    for key in expired_keys:
        image_cache.pop(key, None)
        
    logger.info(f"Cleaned {len(expired_keys)} expired cache entries")

# Function to scrape page content using requests + BeautifulSoup
def scrape_page_content(url):
    try:
        start_time = time.time()
        
        # Request the page with a timeout
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Cache-Control": "max-age=0"
        }
        
        # Use timeout and handle different encoding issues
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        # Try to handle encodings
        if response.encoding == 'ISO-8859-1':
            encodings = requests.utils.get_encodings_from_content(response.text)
            if encodings:
                response.encoding = encodings[0]
            else:
                response.encoding = response.apparent_encoding
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract the title
        title = soup.title.string if soup.title else "No title found"
        
        # Extract meta tags
        meta_tags = {}
        for tag in soup.find_all("meta"):
            if tag.get("name"):
                meta_tags[tag.get("name")] = tag.get("content", "")
            elif tag.get("property"):
                meta_tags[tag.get("property")] = tag.get("content", "")
        
        # Extract links
        links = []
        for link in soup.find_all("a", href=True):
            href = link["href"]
            # Convert relative URLs to absolute
            if not href.startswith(('http://', 'https://')):
                href = urljoin(url, href)
            
            links.append({
                "href": href,
                "text": link.get_text(strip=True),
                "title": link.get("title", "")
            })
        
        # Extract images
        images = []
        for img in soup.find_all("img", src=True):
            src = img["src"]
            # Convert relative URLs to absolute
            if not src.startswith(('http://', 'https://')):
                src = urljoin(url, src)
                
            images.append({
                "src": src,
                "alt": img.get("alt", ""),
                "title": img.get("title", ""),
                "width": img.get("width", ""),
                "height": img.get("height", "")
            })
        
        # Extract main content
        # Remove script, style, and hidden elements
        for script in soup(["script", "style", "noscript", "[style*='display:none']"]):
            script.extract()
        
        # Get text blocks (paragraphs, headings, lists)
        text_blocks = []
        for elem in soup.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li']):
            text = elem.get_text(strip=True)
            if text and len(text) > 10:  # Only include substantial blocks
                text_blocks.append(text)
        
        # Get the main content as plain text
        content = soup.get_text(separator="\n", strip=True)
        
        # Cleanup content (remove excess whitespace)
        content = re.sub(r'\n\s*\n', '\n\n', content)
        
        execution_time = time.time() - start_time
        
        # Create the response object
        page_content = PageContent(
            url=url,
            title=title,
            content=content,
            html=str(soup),
            meta_tags=meta_tags,
            links=links[:100],  # Limit to first 100 links
            images=images[:50],  # Limit to first 50 images
            text_blocks=text_blocks
        )
        
        return PageContentResponse(
            url=url,
            content=page_content,
            execution_time=execution_time
        )
        
    except Exception as e:
        logger.error(f"Error scraping page {url}: {str(e)}")
        return PageContentResponse(
            url=url,
            error=f"Failed to scrape page: {str(e)}",
            execution_time=time.time() - start_time
        )

# Image search function
@app.get("/api/image-search", response_model=ImageSearchResponse)
def search_images(
    query: str = Query(..., min_length=1),
    num_results: int = Query(5, ge=1, le=20),
    search_engine: str = Query("google", enum=["google", "bing"]),
    use_cache: bool = Query(True)
):
    start_time = time.time()
    logger.info(f"Image search request received for query: '{query}', engine: {search_engine}")
    
    # Check cache first
    cache_key = f"img:{search_engine}:{query}"
    if use_cache and cache_key in image_cache:
        cached_results = image_cache[cache_key]
        logger.info(f"Returning cached image results for query: '{query}'")
        return {
            "query": query,
            "results": cached_results["results"][:num_results],
            "total_results": len(cached_results["results"]),
            "execution_time": time.time() - start_time,
            "error": None
        }
    
    driver = None
    image_results = []
    error = None
    
    try:
        driver = get_driver_from_pool()
        
        # Set page load timeout to avoid hanging
        driver.set_page_load_timeout(30)
        
        # Navigate to search engine image search
        try:
            if search_engine == "google":
                driver.get(f"https://www.google.com/search?q={quote_plus(query)}&tbm=isch")
            elif search_engine == "bing":
                driver.get(f"https://www.bing.com/images/search?q={quote_plus(query)}")
            else:
                driver.get(f"https://www.google.com/search?q={quote_plus(query)}&tbm=isch")
                
            logger.info(f"Successfully navigated to {search_engine} image search")
        except Exception as e:
            logger.error(f"Failed to load image search: {str(e)}")
            raise HTTPException(status_code=503, detail="Failed to access image search")
        
        # Wait for images to load
        time.sleep(3)
        
        # Extract image results
        try:
            if search_engine == "google":
                # Save current page source for caching and debugging
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                with open(f"data/google_img_{timestamp}.html", "w", encoding="utf-8") as f:
                    f.write(driver.page_source)
                
                # Get image containers
                image_elements = driver.find_elements(By.CSS_SELECTOR, ".isv-r")
                
                # If first method didn't work, try alternatives
                if not image_elements:
                    image_elements = driver.find_elements(By.XPATH, "//div[contains(@class, 'isv-r') or contains(@jsname, 'N9Xkfe')]")
                
                if not image_elements:
                    image_elements = driver.find_elements(By.CSS_SELECTOR, "div[data-ved]")
                
                logger.info(f"Found {len(image_elements)} potential image results")
                
                # Process image results
                for i, element in enumerate(image_elements[:num_results*2]):  # Get more than needed in case some fail
                    try:
                        # Click on the image to get more details
                        element.click()
                        time.sleep(1)  # Wait for details to load
                        
                        # Get image thumbnail
                        thumbnail_img = element.find_elements(By.CSS_SELECTOR, "img.Q4LuWd")
                        if not thumbnail_img:
                            thumbnail_img = element.find_elements(By.CSS_SELECTOR, "img")
                        
                        if not thumbnail_img:
                            continue
                            
                        thumbnail_url = thumbnail_img[0].get_attribute("src")
                        
                        # Try to get the full image URL
                        # First look in the lightbox that appears when clicking
                        full_img = driver.find_elements(By.CSS_SELECTOR, "img.r48jcc, img.n3VNCb")
                        if full_img:
                            img_url = full_img[0].get_attribute("src")
                        else:
                            img_url = thumbnail_url
                        
                        # Get title/alt text
                        title = thumbnail_img[0].get_attribute("alt") or "No title available"
                        
                        # Try to get source website info
                        source_elements = driver.find_elements(By.CSS_SELECTOR, ".UAiK1e, .HN1Bfd a")
                        source_url = ""
                        if source_elements:
                            source_url = source_elements[0].get_attribute("href") or ""
                        
                        # Extract dimensions if available
                        dimension_elements = driver.find_elements(By.CSS_SELECTOR, ".NaAj2e, .dTe6Ie span")
                        width = None
                        height = None
                        if dimension_elements:
                            dim_text = dimension_elements[0].text
                            dim_match = re.search(r'(\d+)\s*×\s*(\d+)', dim_text)
                            if dim_match:
                                width = int(dim_match.group(1))
                                height = int(dim_match.group(2))
                        
                        # Create the image result
                        domain = extract_domain(source_url) if source_url else ""
                        
                        image_results.append(
                            ImageSearchResult(
                                id=str(uuid.uuid4()),
                                url=img_url,
                                thumbnail_url=thumbnail_url,
                                title=title,
                                source_url=source_url,
                                source_domain=domain,
                                width=width,
                                height=height,
                                alt_text=title,
                                position=i+1
                            )
                        )
                        
                        logger.info(f"Added image result {len(image_results)}: {title[:30]}...")
                        
                        # Stop after we've found enough valid results
                        if len(image_results) >= num_results:
                            break
                            
                    except Exception as e:
                        logger.error(f"Error processing image result {i}: {str(e)}")
                        continue
                
            elif search_engine == "bing":
                # Wait for images to load
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, ".dgControl_list > li"))
                )
                
                # Get image containers
                image_elements = driver.find_elements(By.CSS_SELECTOR, ".dgControl_list > li")
                logger.info(f"Found {len(image_elements)} potential Bing image results")
                
                # Process image results
                for i, element in enumerate(image_elements[:num_results*2]):
                    try:
                        # Get thumbnail
                        thumbnail_img = element.find_elements(By.CSS_SELECTOR, "img.mimg")
                        if not thumbnail_img:
                            continue
                            
                        thumbnail_url = thumbnail_img[0].get_attribute("src")
                        title = thumbnail_img[0].get_attribute("alt") or "No title available"
                        
                        # Click on the image to get more details
                        element.click()
                        time.sleep(1)  # Wait for details to load
                        
                        # Try to get the full image URL
                        full_img = driver.find_elements(By.CSS_SELECTOR, ".mainImage img")
                        if full_img:
                            img_url = full_img[0].get_attribute("src")
                        else:
                            img_url = thumbnail_url
                        
                        # Try to get source website info
                        source_elements = driver.find_elements(By.CSS_SELECTOR, ".fileInfo a")
                        source_url = ""
                        if source_elements:
                            source_url = source_elements[0].get_attribute("href") or ""
                        
                        # Extract dimensions if available
                        width = None
                        height = None
                        dim_elements = driver.find_elements(By.CSS_SELECTOR, ".fileInfo")
                        if dim_elements:
                            dim_text = dim_elements[0].text
                            dim_match = re.search(r'(\d+)\s*×\s*(\d+)', dim_text)
                            if dim_match:
                                width = int(dim_match.group(1))
                                height = int(dim_match.group(2))
                        
                        # Create the image result
                        domain = extract_domain(source_url) if source_url else ""
                        
                        image_results.append(
                            ImageSearchResult(
                                id=str(uuid.uuid4()),
                                url=img_url,
                                thumbnail_url=thumbnail_url,
                                title=title,
                                source_url=source_url,
                                source_domain=domain,
                                width=width,
                                height=height,
                                alt_text=title,
                                position=i+1
                            )
                        )
                        
                        logger.info(f"Added Bing image result {len(image_results)}: {title[:30]}...")
                        
                        # Stop after we've found enough valid results
                        if len(image_results) >= num_results:
                            break
                            
                    except Exception as e:
                        logger.error(f"Error processing Bing image result {i}: {str(e)}")
                        continue
                
        except Exception as e:
            logger.error(f"Error extracting image results: {str(e)}")
            error = f"Error extracting image results: {str(e)}"
            # We'll still try to return any results we managed to get

    except HTTPException as he:
        # Pass through HTTP exceptions
        raise he
    except Exception as e:
        logger.error(f"Unhandled exception in image search: {str(e)}")
        error = f"Image search error: {str(e)}"
    
    finally:
        # Return the driver to the pool
        if driver:
            try:
                return_driver_to_pool(driver)
                logger.info("Browser returned to pool or closed")
            except:
                logger.warning("Error while returning browser to pool")
    
    # Cache results if successful
    if image_results and not error:
        image_cache[cache_key] = {
            "results": image_results,
            "timestamp": time.time()
        }
    
    # Return results, even if empty
    execution_time = time.time() - start_time
    logger.info(f"Returning {len(image_results)} image results in {execution_time:.2f} seconds")
    
    return ImageSearchResponse(
        query=query,
        results=image_results,
        total_results=len(image_results),
        execution_time=execution_time,
        error=error
    )

# Search function with enhanced error handling and result extraction
@app.get("/api/search", response_model=SearchResponse)
def search_google(
    query: str = Query(..., min_length=1),
    num_results: int = Query(10, ge=1, le=20),
    search_engine: str = Query("google", enum=["google", "bing"]),
    use_cache: bool = Query(True),
    include_featured: bool = Query(True)
):
    start_time = time.time()
    logger.info(f"Search request received for query: '{query}', engine: {search_engine}")
    
    # Check cache first
    cache_key = f"{search_engine}:{query}"
    if use_cache and cache_key in search_cache:
        cached_results = search_cache[cache_key]
        logger.info(f"Returning cached results for query: '{query}'")
        return {
            "query": query,
            "results": cached_results["results"][:num_results],
            "total_results": len(cached_results["results"]),
            "execution_time": time.time() - start_time,
            "error": None
        }
    
    driver = None
    search_results = []
    error = None
    
    try:
        driver = get_driver_from_pool()
        
        # Set page load timeout to avoid hanging
        driver.set_page_load_timeout(30)
        
        # Navigate to search engine
        try:
            if search_engine == "google":
                driver.get("https://www.google.com")
            elif search_engine == "bing":
                driver.get("https://www.bing.com")
            else:
                driver.get("https://www.google.com")
                
            logger.info(f"Successfully navigated to {search_engine} homepage")
        except Exception as e:
            logger.error(f"Failed to load search engine homepage: {str(e)}")
            raise HTTPException(status_code=503, detail="Failed to access search engine")
            
        # Find and interact with search box
        try:
            if search_engine == "google":
                search_box = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.NAME, "q"))
                )
            elif search_engine == "bing":
                search_box = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.NAME, "q"))
                )
            
            search_box.clear()
            search_box.send_keys(query)
            search_box.submit()
            logger.info("Search query submitted successfully")
            
            # Give the page time to load
            time.sleep(3)
        except Exception as e:
            logger.error(f"Failed during search submission: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to submit search query")
        
        # Extract search results
        try:
            if search_engine == "google":
                # Wait for search results to load
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.ID, "search"))
                )
                
                # Save current page source for caching and debugging
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                with open(f"data/google_{timestamp}.html", "w", encoding="utf-8") as f:
                    f.write(driver.page_source)
                
                # Get all search result elements
                search_elements = driver.find_elements(By.CSS_SELECTOR, "#search .g")
                
                # If first method didn't work, try alternatives
                if not search_elements:
                    search_elements = driver.find_elements(By.CSS_SELECTOR, "#rso .g, #rso [data-hveid]")
                
                if not search_elements:
                    search_elements = driver.find_elements(By.XPATH, "//div[@id='search']//div[contains(@class, 'g') or @data-hveid]")
                
                logger.info(f"Found {len(search_elements)} potential search results")
                
                # Extract featured snippets if enabled
                if include_featured:
                    # Look for featured snippets, knowledge panels, etc.
                    featured_elements = driver.find_elements(By.CSS_SELECTOR, 
                        "#search .kp-wholepage, #search .ULSxyf, #search .V3FYCf, #search .IZ6rdc")
                    
                    for i, element in enumerate(featured_elements):
                        try:
                            # Extract title and content
                            title_element = element.find_elements(By.CSS_SELECTOR, "h2, h3, [role='heading']")
                            title = title_element[0].text if title_element else "Featured Result"
                            
                            # Extract content
                            content = element.text
                            if title in content:
                                content = content.replace(title, "", 1).strip()
                            
                            # Try to extract URL if available
                            url_element = element.find_elements(By.CSS_SELECTOR, "a[href]")
                            url = url_element[0].get_attribute("href") if url_element else ""
                            
                            if not url:
                                url = f"https://www.google.com/search?q={query}"
                            
                            # Create result object with feature indicator
                            domain = extract_domain(url)
                            
                            search_results.append(
                                SearchResult(
                                    id=str(uuid.uuid4()),
                                    title=title,
                                    snippet=content,
                                    url=url,
                                    source="google_featured",
                                    domain=domain,
                                    position=-i-1,  # Negative positions for featured items
                                    features={"type": "featured_snippet"}
                                )
                            )
                        except Exception as e:
                            logger.error(f"Error processing featured element: {str(e)}")
                
                # Process regular search results
                for i, result in enumerate(search_elements[:num_results*2]):  # Get more than needed in case some fail
                    try:
                        # Find title and URL
                        title = None
                        url = None
                        
                        # Try to find h3 title and its parent link
                        h3_elements = result.find_elements(By.TAG_NAME, "h3")
                        if h3_elements:
                            title = h3_elements[0].text
                            
                            # Look for the parent link of the h3
                            link_elements = result.find_elements(By.CSS_SELECTOR, "a[href]")
                            for link in link_elements:
                                if link.find_elements(By.TAG_NAME, "h3"):
                                    url = link.get_attribute("href")
                                    break
                        
                        # If title/url not found with h3 method, try direct link method
                        if not title or not url:
                            link_elements = result.find_elements(By.CSS_SELECTOR, "a[href]")
                            for link in link_elements:
                                cite_elements = link.find_elements(By.TAG_NAME, "cite")
                                if cite_elements:
                                    url = link.get_attribute("href")
                                    title_elem = link.find_elements(By.CSS_SELECTOR, "*:not(cite)")
                                    if title_elem:
                                        title = title_elem[0].text
                                    break
                        
                        # Skip if no valid title/url or if it's a Google link
                        if not title or not url or "google.com/search" in url:
                            continue
                            
                        # Extract snippet
                        snippet = "No description available"
                        
                        # Method 1: Look for standard snippet container
                        snippet_elements = result.find_elements(By.CSS_SELECTOR, ".VwiC3b, .IsZvec")
                        if snippet_elements:
                            snippet = snippet_elements[0].text
                        
                        # Method 2: Try alternative
                        if not snippet or snippet == "No description available":
                            # Look for any text blocks that aren't the title
                            text_blocks = result.find_elements(By.XPATH, ".//div[string-length(text()) > 10]")
                            for block in text_blocks:
                                if block.text and block.text != title:
                                    snippet = block.text
                                    break
                        
                        # Extract domain
                        domain = extract_domain(url)
                        
                        # Extract any special features
                        features = {}
                        
                        # Check for review stars
                        star_elements = result.find_elements(By.CSS_SELECTOR, "[role='img'][aria-label*='star']")
                        if star_elements:
                            features["stars"] = star_elements[0].get_attribute("aria-label")
                        
                        # Check for date
                        date_elements = result.find_elements(By.CSS_SELECTOR, "[class*='date'], [class*='time'], span.MUxGbd")
                        for date_elem in date_elements:
                            date_text = date_elem.text
                            if re.search(r'\d{1,2}\s+\w+\s+\d{4}|\d{1,2}/\d{1,2}/\d{2,4}', date_text):
                                features["date"] = date_text
                                break
                        
                        # Add to results
                        search_results.append(
                            SearchResult(
                                id=str(uuid.uuid4()),
                                title=title,
                                snippet=snippet,
                                url=url,
                                source="google",
                                domain=domain,
                                position=i+1,
                                features=features
                            )
                        )
                        
                        logger.info(f"Added result {len(search_results)}: {title[:30]}...")
                        
                        # Stop after we've found enough valid results
                        if len(search_results) >= num_results:
                            break
                            
                    except Exception as e:
                        logger.error(f"Error processing result {i}: {str(e)}")
                        continue
                
            elif search_engine == "bing":
                # Wait for Bing search results to load
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.ID, "b_results"))
                )
                
                # Save current page source for caching and debugging
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                with open(f"data/bing_{timestamp}.html", "w", encoding="utf-8") as f:
                    f.write(driver.page_source)
                
                # Get all search result elements
                search_elements = driver.find_elements(By.CSS_SELECTOR, "#b_results > li.b_algo")
                logger.info(f"Found {len(search_elements)} potential Bing search results")
                
                # Process regular search results
                for i, result in enumerate(search_elements[:num_results*2]):  # Get more than needed in case some fail
                    try:
                        # Find title and URL
                        title_element = result.find_elements(By.CSS_SELECTOR, "h2 a")
                        if not title_element:
                            continue
                            
                        title = title_element[0].text
                        url = title_element[0].get_attribute("href")
                        
                        # Skip if no valid title/url or if it's a Bing link
                        if not title or not url or "bing.com/search" in url:
                            continue
                            
                        # Extract snippet
                        snippet = "No description available"
                        snippet_elements = result.find_elements(By.CSS_SELECTOR, ".b_caption p")
                        if snippet_elements:
                            snippet = snippet_elements[0].text
                        
                        # Extract domain
                        domain = extract_domain(url)
                        
                        # Extract any special features
                        features = {}
                        
                        # Check for date
                        date_elements = result.find_elements(By.CSS_SELECTOR, ".b_attribution cite")
                        if date_elements:
                            date_text = date_elements[0].text
                            features["attribution"] = date_text
                        
                        # Add to results
                        search_results.append(
                            SearchResult(
                                id=str(uuid.uuid4()),
                                title=title,
                                snippet=snippet,
                                url=url,
                                source="bing",
                                domain=domain,
                                position=i+1,
                                features=features
                            )
                        )
                        
                        logger.info(f"Added result {len(search_results)}: {title[:30]}...")
                        
                        # Stop after we've found enough valid results
                        if len(search_results) >= num_results:
                            break
                            
                    except Exception as e:
                        logger.error(f"Error processing Bing result {i}: {str(e)}")
                        continue
                
        except Exception as e:
            logger.error(f"Error extracting search results: {str(e)}")
            error = f"Error extracting results: {str(e)}"
            # We'll still try to return any results we managed to get

    except HTTPException as he:
        # Pass through HTTP exceptions
        raise he
    except Exception as e:
        logger.error(f"Unhandled exception: {str(e)}")
        error = f"Search error: {str(e)}"
    
    finally:
        # Return driver to pool instead of closing
        if driver:
            try:
                return_driver_to_pool(driver)
                logger.info("Browser returned to pool or closed")
            except:
                logger.warning("Error while returning browser to pool")
    
    # Cache results if successful
    if search_results and not error:
        search_cache[cache_key] = {
            "results": search_results,
            "timestamp": time.time()
        }
    
    # Return results, even if empty
    execution_time = time.time() - start_time
    logger.info(f"Returning {len(search_results)} results in {execution_time:.2f} seconds")
    
    return SearchResponse(
        query=query,
        results=search_results,
        total_results=len(search_results),
        execution_time=execution_time,
        error=error
    )

@app.get("/api/content", response_model=PageContentResponse)
async def get_page_content(
    url: str = Query(..., min_length=5),
    background_tasks: BackgroundTasks = None
):
    logger.info(f"Content request received for URL: {url}")
    
    # Validate URL
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Invalid URL. Must start with http:// or https://")
    
    try:
        # Scrape the page content
        result = scrape_page_content(url)
        
        # Background task to save content to disk
        if background_tasks and result.content:
            def save_content_to_disk():
                try:
                    # Create a safe filename
                    domain = extract_domain(url)
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    filename = f"data/{domain}_{timestamp}.json"
                    
                    # Save as JSON
                    with open(filename, "w", encoding="utf-8") as f:
                        json.dump(result.content.dict(), f, ensure_ascii=False, indent=2)
                        
                    logger.info(f"Saved content to {filename}")
                except Exception as e:
                    logger.error(f"Failed to save content to disk: {str(e)}")
            
            background_tasks.add_task(save_content_to_disk)
        
        return result
        
    except Exception as e:
        logger.error(f"Error processing content request: {str(e)}")
        return PageContentResponse(
            url=url,
            error=f"Failed to process content: {str(e)}",
            execution_time=0
        )

@app.get("/api/healthcheck")
def healthcheck():
    """Health check endpoint to verify the API is running"""
    return {"status": "ok", "timestamp": time.time(), "memory_usage": get_memory_usage()}

@app.get("/api/clear-cache")
def clear_cache():
    """Clear the search cache"""
    global search_cache, image_cache
    search_cache_size = len(search_cache)
    image_cache_size = len(image_cache)
    search_cache = {}
    image_cache = {}
    return {"status": "ok", "cleared_search_items": search_cache_size, "cleared_image_items": image_cache_size}

def get_memory_usage():
    """Get memory usage information for monitoring"""
    import psutil
    process = psutil.Process(os.getpid())
    memory_info = process.memory_info()
    return {
        "rss": f"{memory_info.rss / (1024 * 1024):.2f} MB",
        "vms": f"{memory_info.vms / (1024 * 1024):.2f} MB"
    }

# New API endpoint to get top images from a search
@app.get("/api/search-with-images", response_class=JSONResponse)
async def search_with_images(
    query: str = Query(..., min_length=1),
    num_results: int = Query(10, ge=1, le=20),
    num_images: int = Query(5, ge=1, le=10),
    search_engine: str = Query("google", enum=["google", "bing"]),
    use_cache: bool = Query(True)
):
    """
    Combined endpoint to return both search results and relevant images
    """
    start_time = time.time()
    
    # First get regular search results
    search_response = search_google(
        query=query, 
        num_results=num_results, 
        search_engine=search_engine,
        use_cache=use_cache
    )
    
    # Then get image results
    image_response = search_images(
        query=query,
        num_results=num_images,
        search_engine=search_engine,
        use_cache=use_cache
    )
    
    # Combine results
    combined_response = {
        "query": query,
        "search_results": search_response.results,
        "image_results": image_response.results,
        "total_search_results": search_response.total_results,
        "total_image_results": image_response.total_results,
        "execution_time": time.time() - start_time
    }
    
    return combined_response

# Background task to clean up resources
@app.on_event("startup")
async def startup_event():
    # Clean expired cache entries periodically
    import asyncio
    
    async def periodic_cache_cleanup():
        while True:
            await asyncio.sleep(600)  # Run every 10 minutes
            clean_expired_cache()
    
    asyncio.create_task(periodic_cache_cleanup())
    
    # Initialize WebDriver pool
    for _ in range(min(MAX_POOL_SIZE, 1)):  # Start with at least one driver
        try:
            driver = create_new_driver()
            webdriver_pool.append(driver)
            logger.info("Added WebDriver to pool during startup")
        except Exception as e:
            logger.error(f"Failed to initialize WebDriver during startup: {str(e)}")

@app.on_event("shutdown")
async def shutdown_event():
    # Close all WebDriver instances
    for driver in webdriver_pool:
        try:
            driver.quit()
        except:
            pass
    logger.info(f"Closed {len(webdriver_pool)} WebDriver instances during shutdown")
    webdriver_pool.clear()

if __name__ == "__main__":
    import uvicorn
    # Use a production-ready configuration
    uvicorn.run(
        "app:app",  # Assuming this file is named app.py
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000)),
        workers=int(os.environ.get("WORKERS", 1)),
        log_level="info",
        timeout_keep_alive=120,
        lifespan="on"
    )