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

    // Extract images - Updated for new Taobao structure
    const images = [];
    const imageSelectors = [
      '[class*="Pic"] img',       // New: Generic pic container
      '[class*="pic"] img',
      '[class*="Image"] img',
      '[class*="image"] img',
      '#J_UlThumb img',
      '.tb-thumb img',
      '[class*="Picture--thumbImg"]',
      '.tb-gallery img'
    ];

    for (const selector of imageSelectors) {
      const imageElements = document.querySelectorAll(selector);
      if (imageElements.length > 0) {
        imageElements.forEach((img) => {
          let src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
          if (src && !images.includes(src) && !src.startsWith('data:')) {
            // Fix protocol-relative URLs
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
        if (images.length > 0) {
          console.log(`✅ Found ${images.length} images`);
          break;
        }
      }
    }

    // Extract main image if thumb images not found
    if (images.length === 0) {
      const mainImage = document.querySelector('#J_ImgBooth') ||
                       document.querySelector('[class*="MainPic"]') ||
                       document.querySelector('[class*="mainPic"]') ||
                       document.querySelector('.tb-booth img');
      if (mainImage) {
        let src = mainImage.src || mainImage.getAttribute('data-src');
        if (src && !src.startsWith('data:')) {
          if (src.startsWith('//')) {
            src = 'https:' + src;
          }
          images.push(src);
          console.log(`✅ Found main image`);
        }
      }
    }

    // Extract description/detail images
    const descImages = [];
    const descImageSelectors = [
      '[class*="desc"] img',
      '[class*="Desc"] img',
      '[class*="detail"] img',
      '[class*="Detail"] img',
      '#J_DivItemDesc img',
      '.detail-content img',
      '[id*="description"] img'
    ];

    for (const selector of descImageSelectors) {
      const descImgElements = document.querySelectorAll(selector);
      if (descImgElements.length > 0) {
        descImgElements.forEach((img) => {
          let src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
          if (src && !descImages.includes(src) && !src.startsWith('data:')) {
            if (src.startsWith('//')) {
              src = 'https:' + src;
            }
            // Filter out tiny images and icons
            if (!src.includes('1x1') && !src.includes('icon') && !src.includes('placeholder')) {
              descImages.push(src);
            }
          }
        });
        if (descImages.length > 0) {
          console.log(`✅ Found ${descImages.length} description images`);
          break;
        }
      }
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
