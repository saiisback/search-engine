from fastapi import FastAPI, Query, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
import uuid
import time
import logging
import traceback
import requests
from bs4 import BeautifulSoup
import re
import json
from urllib.parse import urljoin, urlparse
import os
from datetime import datetime

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
              description="API for web search and content scraping")

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

class PageContentResponse(BaseModel):
    url: str
    content: Optional[PageContent] = None
    error: Optional[str] = None
    execution_time: float = 0

# Cache for search results
search_cache = {}

# Initialize the WebDriver with custom options
def get_driver():
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

# Function to scrape page content using requests + BeautifulSoup
def scrape_page_content(url):
    try:
        start_time = time.time()
        
        # Request the page with a timeout
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
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
                "title": img.get("title", "")
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
        driver = get_driver()
        
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
        # Ensure the driver is properly closed
        if driver:
            try:
                driver.quit()
                logger.info("Browser closed successfully")
            except:
                logger.warning("Error while closing browser")
    
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
    return {"status": "ok", "timestamp": time.time()}

@app.get("/api/clear-cache")
def clear_cache():
    """Clear the search cache"""
    global search_cache
    cache_size = len(search_cache)
    search_cache = {}
    return {"status": "ok", "cleared_items": cache_size}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)