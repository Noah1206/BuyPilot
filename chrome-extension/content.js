/**
 * Content Script - Runs on Taobao/Tmall product pages
 * Extracts product information from the current page
 */

console.log('🚀 BuyPilot Extension: Content script loaded');

/**
 * Extract product data from Taobao page
 */
function extractTaobaoProduct() {
  console.log('📦 Extracting Taobao product data...');

  try {
    // Get product ID from URL
    const url = window.location.href;
    const productIdMatch = url.match(/[?&]id=(\d+)/);
    const productId = productIdMatch ? productIdMatch[1] : null;

    if (!productId) {
      throw new Error('Could not find product ID in URL');
    }

    // Extract title - Updated for new Taobao structure
    let title = '';
    const titleSelectors = [
      '[class*="MainTitle"]',     // New: MainTitle--PiA4nmJz
      '[class*="mainTitle"]',     // New: mainTitle--R75fTcZL
      '.tb-main-title',
      '[data-spm="1000983"]',
      '.ItemTitle--mainTitle--',
      'h1.tb-title',
      'h1[data-spm]',
      'h1'                        // Fallback to any h1
    ];

    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        title = element.textContent.trim();
        console.log(`✅ Title found with selector: ${selector}`);
        break;
      }
    }

    // Extract price - Updated for new Taobao structure
    let price = 0;
    const priceSelectors = [
      '[class*="Price"]',         // New: Works with current structure
      '[class*="price"]',
      '.tb-rmb-num',
      '[class*="priceText"]',
      '[class*="Price--priceText"]',
      '.tb-price',
      '[data-spm*="price"]'
    ];

    for (const selector of priceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        // Extract numbers from text like "¥10.01200+ 판매"
        const priceText = element.textContent.trim();
        const priceMatch = priceText.match(/[\d.]+/);
        if (priceMatch) {
          price = parseFloat(priceMatch[0]);
          console.log(`✅ Price found: ${price} from "${priceText}"`);
          break;
        }
      }
    }

    // Extract main product image FIRST (대표 이미지)
    const images = [];
    const mainImageSelectors = [
      '#J_ImgBooth',                    // Classic Taobao main image
      '[class*="MainPic"] img',         // New structure main pic
      '[class*="mainPic"] img',
      '.tb-booth img'
    ];

    for (const selector of mainImageSelectors) {
      const mainImage = document.querySelector(selector);
      if (mainImage) {
        let src = mainImage.src || mainImage.getAttribute('data-src') || mainImage.getAttribute('data-lazy-src');
        if (src && !src.startsWith('data:')) {
          if (src.startsWith('//')) {
            src = 'https:' + src;
          }
          // Get high-resolution version
          src = src.replace(/_\d+x\d+\./, '_800x800.');
          images.push(src);
          console.log(`✅ Found main image with selector: ${selector}`);
          break;
        }
      }
    }

    // Extract thumbnail images (썸네일 이미지들) - ONLY from gallery, NOT recommended products
    const thumbnailSelectors = [
      '#J_UlThumb img',                          // Classic Taobao thumbnails
      '[class*="Picture--thumbImg"]',            // New structure thumbnails
      '.tb-thumb img',                           // Thumbnail gallery
      '[id*="J_"] [class*="thumb"] img',        // J_ prefixed thumbnail containers
      '[class*="Gallery"] [class*="thumb"] img'  // Gallery thumbnails
    ];

    for (const selector of thumbnailSelectors) {
      const thumbElements = document.querySelectorAll(selector);
      if (thumbElements.length > 0) {
        thumbElements.forEach((img) => {
          // Skip if parent has "recommend" or "related" in class (추천상품 제외)
          const parent = img.closest('[class*="recommend"], [class*="related"], [class*="similar"], [class*="Recommend"], [class*="Related"], [class*="Similar"]');
          if (parent) {
            return; // Skip recommended products
          }

          let src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
          if (src && !images.includes(src) && !src.startsWith('data:')) {
            if (src.startsWith('//')) {
              src = 'https:' + src;
            }
            // Get high-resolution version
            src = src.replace(/_\d+x\d+\./, '_800x800.');
            // Filter out tiny placeholder images
            if (!src.includes('1x1') && !src.includes('placeholder')) {
              images.push(src);
            }
          }
        });
        if (images.length > 1) { // Have main + thumbnails
          console.log(`✅ Found ${images.length} product images (excluding recommended products)`);
          break;
        }
      }
    }

    // Extract description/detail images (상세페이지 이미지)
    const descImages = [];

    // Wait for page to load detail section (lazy loaded)
    console.log('🔍 Searching for detail images...');

    const descImageSelectors = [
      // 가장 구체적인 셀렉터들 먼저
      '#container[class*="imageTextInfo"] img',     // container with imageTextInfo class
      '#container[class*="imageDetailInfo"] img',   // container with imageDetailInfo class
      'div[class*="imageTextInfo"] img',            // Any div with imageTextInfo
      'div[class*="imageDetailInfo"] img',          // Any div with imageDetailInfo
      '#container img',                              // Fallback to container ID
      '[class*="desc"] img',
      '[class*="Desc"] img',
      '[class*="detail"] img',
      '[class*="Detail"] img',
      '#J_DivItemDesc img',
      '.detail-content img',
      '[id*="description"] img'
    ];

    for (const selector of descImageSelectors) {
      console.log(`🔍 Trying selector: ${selector}`);
      const descImgElements = document.querySelectorAll(selector);
      console.log(`   Found ${descImgElements.length} elements`);

      if (descImgElements.length > 0) {
        descImgElements.forEach((img) => {
          // Skip if this image is in the product gallery (이미 images 배열에 있으면 skip)
          // ⚠️ data-src를 우선 읽기 (lazy loading 때문에 src는 placeholder일 수 있음)
          let src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.src;

          if (src) {
            // Normalize URL
            if (src.startsWith('//')) {
              src = 'https:' + src;
            }

            // Skip if already in main images array (대표이미지 제외)
            if (images.includes(src)) {
              console.log(`   ⏭️  Skipping (already in main images): ${src.substring(0, 50)}...`);
              return;
            }

            // Skip tiny images, icons, placeholders (lazy loading placeholders 포함)
            if (src.includes('1x1') || src.includes('icon') || src.includes('placeholder') || src.includes('s.gif')) {
              console.log(`   ⏭️  Skipping (tiny/icon/placeholder): ${src.substring(0, 50)}...`);
              return;
            }

            // Skip data URLs
            if (src.startsWith('data:')) {
              return;
            }

            // Add to descImages if not duplicate
            if (!descImages.includes(src)) {
              descImages.push(src);
              console.log(`   ✅ Added desc image: ${src.substring(0, 50)}...`);
            }
          }
        });

        if (descImages.length > 0) {
          console.log(`✅ Found ${descImages.length} description images with selector: ${selector}`);
          break;
        }
      }
    }

    if (descImages.length === 0) {
      console.warn('⚠️  No description images found');
    } else {
      console.log(`📸 Total description images: ${descImages.length}`);
    }

    // Extract seller
    let seller = '';
    const sellerSelectors = [
      '.tb-seller-name',
      '[class*="ShopHeader--name"]',
      '.J_TShopName',
      '.shop-name'
    ];

    for (const selector of sellerSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        seller = element.textContent.trim();
        break;
      }
    }

    // Extract specifications/properties
    const specifications = [];
    const specElements = document.querySelectorAll('.tb-property-type, .tb-sku-line, [class*="Sku--skuItem"]');
    specElements.forEach((spec) => {
      const label = spec.querySelector('.tb-property-key, [class*="skuTitle"]')?.textContent.trim();
      const value = spec.querySelector('.tb-property-value, [class*="skuValue"]')?.textContent.trim();
      if (label && value) {
        specifications.push({ name: label, value: value });
      }
    });

    // Extract options (SKU variants)
    const options = [];
    const optionGroups = document.querySelectorAll('.tb-sku-group, [class*="Sku--skuGroup"]');

    optionGroups.forEach((group) => {
      const optionName = group.querySelector('.tb-property-key, [class*="skuTitle"]')?.textContent.trim();
      if (!optionName) return;

      const optionValues = [];
      const valueElements = group.querySelectorAll('.tb-sku-item, [class*="skuItem"]');

      valueElements.forEach((valueEl) => {
        const valueName = valueEl.getAttribute('title') ||
                         valueEl.querySelector('span')?.textContent.trim() ||
                         valueEl.textContent.trim();
        const valueImage = valueEl.querySelector('img')?.src;

        if (valueName) {
          optionValues.push({
            name: valueName,
            image: valueImage && valueImage.startsWith('//') ? 'https:' + valueImage : valueImage
          });
        }
      });

      if (optionValues.length > 0) {
        options.push({
          name: optionName,
          values: optionValues
        });
      }
    });

    const productData = {
      source: 'taobao',
      taobao_item_id: productId,
      source_url: url,
      title: title,
      title_cn: title,
      price: price,
      currency: 'CNY',
      seller_nick: seller,
      images: images,
      pic_url: images[0] || '',
      desc_imgs: descImages,           // 상세 페이지 이미지
      specifications: specifications,
      options: options,
      extracted_at: new Date().toISOString(),
      extraction_method: 'chrome_extension'
    };

    console.log('✅ Product data extracted:', productData);
    console.log('📊 Summary:');
    console.log(`   - Main images: ${images.length}`);
    console.log(`   - Description images: ${descImages.length}`);
    console.log(`   - Options: ${options.length}`);

    // Alert if no description images found
    if (descImages.length === 0) {
      console.warn('🚨 WARNING: No description images were extracted!');
      console.warn('Please check if #container exists on this page');
    }

    return productData;

  } catch (error) {
    console.error('❌ Error extracting product data:', error);
    return null;
  }
}

/**
 * Listen for messages from popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Message received:', request);

  if (request.action === 'extractProduct') {
    const productData = extractTaobaoProduct();
    sendResponse({ success: !!productData, data: productData });
  }

  return true; // Keep the message channel open for async response
});

// Store product data when page loads
window.addEventListener('load', () => {
  console.log('📄 Page loaded, extracting product data...');
  const productData = extractTaobaoProduct();

  if (productData) {
    // Store in chrome storage for popup to access
    chrome.storage.local.set({
      currentProduct: productData,
      lastExtractedUrl: window.location.href
    }, () => {
      console.log('💾 Product data stored in chrome.storage');
    });
  }
});
