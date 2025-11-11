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

    // Extract options (SKU variants) - Updated for new Taobao structure
    const options = [];

    // Try multiple selectors for option groups
    const optionGroupSelectors = [
      '.tb-sku-group',              // Classic Taobao
      '[class*="Sku--skuGroup"]',   // New structure
      '[class*="skuWrapper"]',      // New Taobao 2024 structure
      '[class*="skuGroup"]',        // Variant
      '[class*="sku-group"]',       // Lowercase variant
      '.J_TSaleProp',               // Alternative classic
      '[data-property-id]'          // Property-based
    ];

    console.log('🔍 Starting DOM option group search...');
    let optionGroups = [];

    // NEW APPROACH: Look for skuItem directly (the actual option groups)
    const newTaobaoItems = document.querySelectorAll('[class*="skuItem"]');
    if (newTaobaoItems.length > 0) {
      console.log(`✅ Found ${newTaobaoItems.length} option groups with [class*="skuItem"]`);
      optionGroups = newTaobaoItems;
    } else {
      // Fallback to old selectors
      for (const selector of optionGroupSelectors) {
        console.log(`  Trying selector: ${selector}`);
        optionGroups = document.querySelectorAll(selector);
        console.log(`  → Found ${optionGroups.length} elements`);
        if (optionGroups.length > 0) {
          console.log(`✅ Found ${optionGroups.length} option groups with selector: ${selector}`);
          break;
        }
      }
    }

    optionGroups.forEach((group) => {
      // Try multiple selectors for option name (updated for new Taobao structure)
      let optionName = null;
      const nameSelectors = [
        '[class*="ItemLabel"]',          // NEW: 2024 Taobao structure
        '.tb-property-key',
        '[class*="skuTitle"]',
        '[class*="sku-title"]',
        '.tb-sku-title',
        'dt',
        'label'
      ];

      for (const selector of nameSelectors) {
        const nameEl = group.querySelector(selector);
        if (nameEl && nameEl.textContent.trim()) {
          optionName = nameEl.textContent.trim().replace(/[:：\s]+$/, ''); // Remove trailing colons and spaces
          console.log(`✅ Found option name: "${optionName}" with selector: ${selector}`);
          break;
        }
      }

      if (!optionName) {
        console.log(`⚠️  No option name found in group, skipping...`);
        return;
      }

      const optionValues = [];

      // Try multiple selectors for option values (updated for new Taobao structure)
      const valueSelectors = [
        '[class*="valueItem"][data-vid]',  // NEW: 2024 Taobao structure - only items with data-vid
        '.tb-sku-item',
        'li[data-value]',
        'a[data-value]',
        'span[data-value]'
      ];

      let valueElements = [];
      for (const selector of valueSelectors) {
        valueElements = group.querySelectorAll(selector);
        if (valueElements.length > 0) {
          console.log(`✅ Found ${valueElements.length} value elements with selector: ${selector}`);
          break;
        }
      }

      valueElements.forEach((valueEl, index) => {
        // For new Taobao structure, text content is directly in the valueItem
        // Get the direct text content, not nested elements
        let valueName = valueEl.getAttribute('title') || valueEl.getAttribute('data-value');

        // If no title/data-value, get text but exclude nested elements
        if (!valueName) {
          // Clone the element and remove all child elements to get only direct text
          const clone = valueEl.cloneNode(true);
          const nestedElements = clone.querySelectorAll('[class*="valueItem"]');
          nestedElements.forEach(el => el.remove());
          valueName = clone.textContent.trim();
        }

        // Skip if no name (likely a nested wrapper element)
        if (!valueName) {
          console.log(`⚠️  Skipping valueItem without name (likely wrapper)`);
          return;
        }

        // Enhanced image extraction for new Taobao structure
        const imgEl = valueEl.querySelector('img[class*="valueItemImg"]');
        let valueImage = imgEl?.src ||
                        imgEl?.getAttribute('data-src') ||
                        imgEl?.getAttribute('src');

        if (valueImage) {
          if (valueImage.startsWith('//')) {
            valueImage = 'https:' + valueImage;
          }
          console.log(`✅ Found image for option value "${valueName}": ${valueImage.substring(0, 100)}...`);
        }

        optionValues.push({
          vid: valueEl.getAttribute('data-vid') || valueEl.getAttribute('data-value') || `${optionName}_${index}`,
          name: valueName,
          image: valueImage || undefined
        });
      });

      if (optionValues.length > 0) {
        options.push({
          pid: group.getAttribute('data-property-id') || optionName,
          name: optionName,
          values: optionValues
        });
        console.log(`✅ Extracted option "${optionName}" with ${optionValues.length} values`);
      }
    });

    console.log(`📊 Total options extracted: ${options.length}`);

    // If no options found via DOM, try to extract from page data objects
    if (options.length === 0) {
      console.log('⚠️  No options found in DOM, trying to extract from page data...');
      console.log('🔍 Checking window objects...');
      console.log('   - window.g_config exists:', typeof window.g_config !== 'undefined');
      console.log('   - TB exists:', typeof TB !== 'undefined');

      // Log what's available
      if (typeof window.g_config !== 'undefined') {
        console.log('✅ window.g_config found');
        console.log('   - g_config keys:', Object.keys(window.g_config));
        console.log('   - g_config.idata exists:', !!window.g_config.idata);
        if (window.g_config.idata) {
          console.log('   - idata keys:', Object.keys(window.g_config.idata));
        }
      }

      try {
        // Try to find data in window.g_config
        if (typeof window.g_config !== 'undefined' && window.g_config.idata) {
          const idata = window.g_config.idata;

          // Extract from item.props (销售属性)
          if (idata.item && idata.item.props) {
            console.log('✅ Found item.props in g_config');
            idata.item.props.forEach((prop, index) => {
              if (prop.values && prop.values.length > 0) {
                const optionValues = prop.values.map((val, valIndex) => ({
                  vid: val.vid || `${prop.pid}_${valIndex}`,
                  name: val.name,
                  image: val.image ? (val.image.startsWith('//') ? 'https:' + val.image : val.image) : undefined
                }));

                options.push({
                  pid: prop.pid,
                  name: prop.name,
                  values: optionValues
                });
                console.log(`✅ Extracted option "${prop.name}" with ${optionValues.length} values from g_config`);
              }
            });
          }
        }

        // Alternative: Try TB.detail.data.item
        if (options.length === 0 && typeof TB !== 'undefined' && TB.detail && TB.detail.data && TB.detail.data.item) {
          const item = TB.detail.data.item;
          console.log('✅ Found TB.detail.data.item');

          if (item.props) {
            item.props.forEach((prop, index) => {
              if (prop.values && prop.values.length > 0) {
                const optionValues = prop.values.map((val, valIndex) => ({
                  vid: val.vid || `${prop.pid}_${valIndex}`,
                  name: val.name,
                  image: val.image ? (val.image.startsWith('//') ? 'https:' + val.image : val.image) : undefined
                }));

                options.push({
                  pid: prop.pid,
                  name: prop.name,
                  values: optionValues
                });
                console.log(`✅ Extracted option "${prop.name}" with ${optionValues.length} values from TB.detail`);
              }
            });
          }
        }
      } catch (error) {
        console.error('❌ Error extracting options from page data:', error);
      }

      // If still no options, try parsing from script tags
      if (options.length === 0) {
        console.log('🔍 Trying to extract from script tags...');
        const scripts = document.querySelectorAll('script');

        for (const script of scripts) {
          const text = script.textContent;

          // Look for JSON data in script tags
          try {
            // Pattern 1: Look for "skuProps" or "propertyMemoMap"
            if (text.includes('"skuProps"') || text.includes('"propertyMemoMap"')) {
              console.log('✅ Found skuProps/propertyMemoMap in script');

              // Try to extract the JSON object
              const jsonMatch = text.match(/(\{[^]*?"skuProps"[^]*?\})\s*;?\s*$/m) ||
                               text.match(/(\{[^]*?"propertyMemoMap"[^]*?\})/);

              if (jsonMatch) {
                try {
                  const data = JSON.parse(jsonMatch[1]);

                  // Extract from skuProps
                  if (data.skuProps) {
                    console.log('✅ Parsing skuProps');
                    data.skuProps.forEach((prop) => {
                      const optionValues = (prop.value || []).map((val) => ({
                        vid: val.valueId || val.vid,
                        name: val.name || val.valueName,
                        image: val.image ? (val.image.startsWith('//') ? 'https:' + val.image : val.image) : undefined
                      }));

                      if (optionValues.length > 0) {
                        options.push({
                          pid: prop.propId || prop.pid,
                          name: prop.name || prop.propName,
                          values: optionValues
                        });
                        console.log(`✅ Extracted option "${prop.name}" with ${optionValues.length} values from script`);
                      }
                    });
                  }

                  // Extract from propertyMemoMap
                  if (data.propertyMemoMap && Object.keys(data.propertyMemoMap).length > 0) {
                    console.log('✅ Parsing propertyMemoMap');
                    Object.entries(data.propertyMemoMap).forEach(([propId, prop]) => {
                      if (prop.values) {
                        const optionValues = Object.values(prop.values).map((val) => ({
                          vid: val.valueId,
                          name: val.name,
                          image: val.image ? (val.image.startsWith('//') ? 'https:' + val.image : val.image) : undefined
                        }));

                        options.push({
                          pid: propId,
                          name: prop.name,
                          values: optionValues
                        });
                        console.log(`✅ Extracted option "${prop.name}" with ${optionValues.length} values from propertyMemoMap`);
                      }
                    });
                  }

                  if (options.length > 0) break;
                } catch (e) {
                  console.warn('Failed to parse JSON from script:', e);
                }
              }
            }

            // Pattern 2: Look for propImg (option images with URLs)
            if (options.length === 0 && text.includes('"propImg"')) {
              console.log('🔍 Found propImg in script, extracting option images...');

              // Try to find JSON object containing propImg
              const propImgMatch = text.match(/"propImg"\s*:\s*\{[^}]+\}/);
              if (propImgMatch) {
                try {
                  const propImgJson = propImgMatch[0].replace(/"propImg"\s*:\s*/, '');
                  const propImgData = JSON.parse(propImgJson);

                  // Store image URLs by property value ID
                  const imagesByVid = {};
                  Object.entries(propImgData).forEach(([vid, imgUrl]) => {
                    imagesByVid[vid] = imgUrl.startsWith('//') ? 'https:' + imgUrl : imgUrl;
                  });

                  console.log(`✅ Found ${Object.keys(imagesByVid).length} option images in propImg`);

                  // Store for later use when we extract option values
                  window.__buypilot_propImg = imagesByVid;
                } catch (e) {
                  console.warn('Failed to parse propImg:', e);
                }
              }
            }

            // Pattern 3: Look for complete option data structure with images
            if (options.length === 0 && (text.includes('"skucore"') || text.includes('"propertyValueDisplayName"'))) {
              console.log('🔍 Found detailed SKU structure, trying to extract...');

              // Try to find skucore or property value data
              const skuMatch = text.match(/"skucore"\s*:\s*\{[^]+?"propertyValueDisplayName[^]+?\}/);
              if (skuMatch) {
                try {
                  // Extract property value mappings
                  const pvMatches = [...skuMatch[0].matchAll(/"(\d+)"\s*:\s*\{\s*"propertyValueId"\s*:\s*\d+\s*,\s*"propertyValueDisplayName"\s*:\s*"([^"]+)"[^}]*\}/g)];

                  if (pvMatches.length > 0) {
                    const valueIdToName = {};
                    pvMatches.forEach(m => {
                      valueIdToName[m[1]] = m[2];
                    });

                    console.log(`✅ Found ${pvMatches.length} property values with IDs`);

                    // Get images from propImg if available
                    const propImgData = window.__buypilot_propImg || {};

                    // Group by property name (we'll infer from the structure)
                    const propMatch = text.match(/"propertyName"\s*:\s*"([^"]+)"/);
                    if (propMatch) {
                      const propertyName = propMatch[1];
                      const values = Object.entries(valueIdToName).map(([vid, name]) => ({
                        vid: vid,
                        name: name,
                        image: propImgData[vid] || images[0] || null
                      }));

                      if (values.length > 0) {
                        options.push({
                          pid: propertyName,
                          name: propertyName,
                          values: values
                        });
                        console.log(`✅ Extracted option "${propertyName}" with ${values.length} values and images from skucore`);
                      }
                    }
                  }
                } catch (e) {
                  console.warn('Failed to parse skucore:', e);
                }
              }
            }

            // Pattern 4: Look for "propertyName":"颜色分类" pattern
            if (options.length === 0 && text.includes('"propertyName"')) {
              // Match pattern: {"valueName":"红色,蓝色","propertyName":"颜色分类"}
              const propertyRegex = /\{"valueName":"([^"]+)","propertyName":"([^"]+)"\}/g;
              let match;
              const foundProps = new Map();

              while ((match = propertyRegex.exec(text)) !== null) {
                const valueName = match[1];
                const propertyName = match[2];

                // Only process SKU-related properties (销售属性), not product info (产品参数)
                // Common SKU properties: 颜色分类, 尺码, 规格, 尺寸, 套餐, 款式, 型号 (if multiple options), etc.
                const skuPropertyNames = ['颜色分类', '颜色', '尺码', '尺寸', '规格', '套餐', '款式'];
                const isSkuProperty = skuPropertyNames.includes(propertyName);

                if (propertyName && valueName) {
                  console.log(`${isSkuProperty ? '✅ SKU' : 'ℹ️  Info'} property: ${propertyName} = ${valueName}`);

                  // Only add SKU properties OR properties with multiple values (likely SKU options)
                  const values = valueName.split(/[,，、]/).map((v, idx) => v.trim()).filter(v => v);
                  const hasMultipleValues = values.length > 1;

                  if ((isSkuProperty || hasMultipleValues) && !foundProps.has(propertyName)) {
                    if (values.length > 0) {
                      foundProps.set(propertyName, {
                        name: propertyName,
                        values: values.map((val, idx) => ({
                          vid: `${propertyName}_${idx}`,
                          name: val,
                          // Use product images as option value images (one image per option value)
                          image: images[idx] || images[0] || null
                        }))
                      });
                    }
                  }
                }
              }

              // Convert to options array
              if (foundProps.size > 0) {
                foundProps.forEach((prop, propName) => {
                  options.push({
                    pid: propName,
                    name: prop.name,
                    values: prop.values
                  });
                  console.log(`✅ Extracted option "${prop.name}" with ${prop.values.length} values from propertyName pattern`);
                });

                break;
              }
            }
          } catch (error) {
            // Continue to next script
          }
        }
      }
    }

    console.log(`📊 Final options count: ${options.length}`);

    // Extract variants (SKU combinations with price and stock)
    const variants = [];
    try {
      let skuData = null;

      // Debug: Log available global variables
      console.log('🔍 Checking global variables for SKU data...');
      console.log('   window.g_config:', typeof window.g_config !== 'undefined' ? 'exists' : 'not found');
      console.log('   window.TB:', typeof window.TB !== 'undefined' ? 'exists' : 'not found');
      console.log('   window.__INITIAL_DATA__:', typeof window.__INITIAL_DATA__ !== 'undefined' ? 'exists' : 'not found');
      console.log('   window.RunParams:', typeof window.RunParams !== 'undefined' ? 'exists' : 'not found');

      // First, try to get SKU data from window.g_config
      if (typeof window.g_config !== 'undefined' && window.g_config.idata && window.g_config.idata.skuBase) {
        skuData = window.g_config.idata.skuBase.skus;
        console.log('✅ Found SKU data in g_config.idata.skuBase');
      }

      // Alternative: Try TB.detail.data.skuBase
      if (!skuData && typeof window.TB !== 'undefined' && window.TB.detail && window.TB.detail.data && window.TB.detail.data.skuBase) {
        skuData = window.TB.detail.data.skuBase.skus;
        console.log('✅ Found SKU data in TB.detail.data.skuBase');
      }

      // Try __INITIAL_DATA__
      if (!skuData && typeof window.__INITIAL_DATA__ !== 'undefined') {
        console.log('🔍 Checking __INITIAL_DATA__:', window.__INITIAL_DATA__);
        if (window.__INITIAL_DATA__.skuBase) {
          skuData = window.__INITIAL_DATA__.skuBase.skus;
          console.log('✅ Found SKU data in __INITIAL_DATA__.skuBase');
        }
      }

      // Try RunParams
      if (!skuData && typeof window.RunParams !== 'undefined') {
        console.log('🔍 Checking RunParams:', window.RunParams);
        if (window.RunParams.skuBase) {
          skuData = window.RunParams.skuBase.skus;
          console.log('✅ Found SKU data in RunParams.skuBase');
        }
      }

      // Fallback: Try to find SKU data in page scripts
      if (!skuData) {
        console.log('🔍 Searching for SKU data in page scripts...');
        const scripts = document.querySelectorAll('script');
        let foundSkuKeywords = [];

        for (const script of scripts) {
          const scriptText = script.textContent;

          // Track which keywords we find
          if (scriptText.includes('skuMap')) foundSkuKeywords.push('skuMap');
          if (scriptText.includes('skuBase')) foundSkuKeywords.push('skuBase');
          if (scriptText.includes('valItemInfo')) foundSkuKeywords.push('valItemInfo');

          // Look for skuMap or skuBase data with improved regex
          if (scriptText.includes('skuMap') || scriptText.includes('skuBase')) {
            // More flexible regex that captures nested objects
            const skuMapMatch = scriptText.match(/skuMap\s*[:=]\s*(\{[\s\S]*?\n\s*\}(?=\s*[,;]|\s*$))/);
            const skuBaseMatch = scriptText.match(/skuBase\s*[:=]\s*\{[\s\S]*?skus\s*[:=]\s*(\{[\s\S]*?\n\s*\}(?=\s*[,;]|\s*\}))/);

            if (skuMapMatch) {
              try {
                skuData = JSON.parse(skuMapMatch[1]);
                console.log('✅ Found SKU data in page scripts (skuMap)');
                break;
              } catch (e) {
                console.warn('⚠️  Failed to parse skuMap:', e.message);
              }
            }

            if (skuBaseMatch) {
              try {
                skuData = JSON.parse(skuBaseMatch[1]);
                console.log('✅ Found SKU data in page scripts (skuBase)');
                break;
              } catch (e) {
                console.warn('⚠️  Failed to parse skuBase:', e.message);
              }
            }
          }

          // Alternative: Look for valItemInfo.skuMap
          if (scriptText.includes('valItemInfo')) {
            const valItemMatch = scriptText.match(/valItemInfo\.skuMap\s*=\s*(\{[\s\S]*?\});/);
            if (valItemMatch) {
              try {
                skuData = JSON.parse(valItemMatch[1]);
                console.log('✅ Found SKU data in valItemInfo');
                break;
              } catch (e) {
                console.warn('⚠️  Failed to parse valItemInfo.skuMap:', e.message);
              }
            }
          }
        }

        if (!skuData && foundSkuKeywords.length > 0) {
          console.log(`⚠️  Found keywords [${foundSkuKeywords.join(', ')}] but failed to extract SKU data`);
        }
      }

      // If SKU data found, process it
      if (skuData && Object.keys(skuData).length > 0) {
        console.log('📊 Processing SKU data:', Object.keys(skuData).length, 'variants found');

        Object.entries(skuData).forEach(([skuId, skuInfo]) => {
          // Build options object for this variant
          const variantOptions = {};

          // Try to map SKU properties to option names
          if (skuInfo.prop) {
            const props = skuInfo.prop.split(';');
            props.forEach((prop, index) => {
              if (options[index]) {
                const [propId, valueId] = prop.split(':');
                // Find the matching option value
                const optionValue = options[index].values.find(v =>
                  v.name || v.vid === valueId
                );
                if (optionValue) {
                  variantOptions[options[index].name] = optionValue.name;
                }
              }
            });
          }

          // Extract stock - try multiple fields with better fallback
          let stockValue = 999; // Default to 999 if no stock info available
          if (skuInfo.stock !== undefined && skuInfo.stock !== null) {
            stockValue = parseInt(skuInfo.stock);
          } else if (skuInfo.quantity !== undefined && skuInfo.quantity !== null) {
            stockValue = parseInt(skuInfo.quantity);
          } else if (skuInfo.stockQuantity !== undefined && skuInfo.stockQuantity !== null) {
            stockValue = parseInt(skuInfo.stockQuantity);
          } else if (skuInfo.sellable !== undefined && skuInfo.sellable !== null) {
            stockValue = parseInt(skuInfo.sellable);
          } else if (skuInfo.canBookCount !== undefined && skuInfo.canBookCount !== null) {
            stockValue = parseInt(skuInfo.canBookCount);
          }

          // Validate stock is a positive number
          if (isNaN(stockValue) || stockValue < 0) {
            stockValue = 999;
          }

          console.log(`📦 SKU ${skuId}: price=${skuInfo.price}, stock=${stockValue}, skuInfo=`, skuInfo);

          variants.push({
            sku_id: skuId,
            options: variantOptions,
            price: parseFloat(skuInfo.price) || price, // Fallback to main price
            stock: stockValue,
            image: skuInfo.image || null
          });
        });

        console.log(`✅ Extracted ${variants.length} variants from SKU data with stock information`);
      } else {
        console.warn('⚠️  No SKU data found in page scripts');

        // Fallback: If we have options but no variant data, create basic variants
        if (options.length > 0) {
          console.log('Creating basic variant structure from options...');

          // For single option, create one variant per value
          if (options.length === 1) {
            options[0].values.forEach((value, index) => {
              variants.push({
                sku_id: `generated_${productId}_${index}`,
                options: { [options[0].name]: value.name },
                price: price,
                stock: 999, // Default to 999 when no SKU data available
                image: value.image || null
              });
            });
          }
          // For multiple options, create combinations (up to 50 variants to avoid overload)
          else {
            const createCombinations = (optIndex, currentCombo, comboImages = []) => {
              if (optIndex >= options.length) {
                if (variants.length < 50) { // Limit to 50 variants
                  // Use first available image from the combination
                  const variantImage = comboImages.find(img => img) || null;

                  variants.push({
                    sku_id: `generated_${productId}_${variants.length}`,
                    options: {...currentCombo},
                    price: price,
                    stock: 999, // Default to 999 when no SKU data available
                    image: variantImage
                  });
                }
                return;
              }

              const currentOption = options[optIndex];
              currentOption.values.forEach(value => {
                createCombinations(optIndex + 1, {
                  ...currentCombo,
                  [currentOption.name]: value.name
                }, [...comboImages, value.image]);
              });
            };

            createCombinations(0, {}, []);
            console.log(`✅ Generated ${variants.length} variant combinations`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error extracting variants:', error);
    }

    // Extract weight information
    let weight = null;

    // Weight-related keywords in Chinese and Korean
    const weightKeywords = ['重量', '重', '毛重', '净重', '무게', 'weight', 'kg', 'g'];

    // First try to find weight in specifications
    for (const spec of specifications) {
      const label = spec.name.toLowerCase();
      const value = spec.value.toLowerCase();

      // Check if label contains weight keywords
      const hasWeightKeyword = weightKeywords.some(keyword =>
        label.includes(keyword.toLowerCase()) || value.includes(keyword)
      );

      if (hasWeightKeyword) {
        // Extract weight value - support formats like "1.5kg", "1500g", "1.5 kg", etc.
        const weightMatch = spec.value.match(/([\d.]+)\s*(kg|g|千克|克)/i);
        if (weightMatch) {
          let extractedWeight = parseFloat(weightMatch[1]);
          const unit = weightMatch[2].toLowerCase();

          // Convert to kg if in grams
          if (unit === 'g' || unit === '克') {
            extractedWeight = extractedWeight / 1000;
          }

          weight = extractedWeight;
          console.log(`✅ Weight extracted from specifications: ${weight}kg`);
          break;
        }
      }
    }

    // If not found in specifications, try searching the entire page
    if (!weight) {
      const pageText = document.body.innerText;
      const weightPatterns = [
        /重量[：:]\s*([\d.]+)\s*(kg|g|千克|克)/i,
        /毛重[：:]\s*([\d.]+)\s*(kg|g|千克|克)/i,
        /净重[：:]\s*([\d.]+)\s*(kg|g|千克|克)/i,
        /무게[：:]\s*([\d.]+)\s*(kg|g)/i,
        /weight[：:]\s*([\d.]+)\s*(kg|g)/i
      ];

      for (const pattern of weightPatterns) {
        const match = pageText.match(pattern);
        if (match) {
          let extractedWeight = parseFloat(match[1]);
          const unit = match[2].toLowerCase();

          // Convert to kg if in grams
          if (unit === 'g' || unit === '克') {
            extractedWeight = extractedWeight / 1000;
          }

          weight = extractedWeight;
          console.log(`✅ Weight extracted from page text: ${weight}kg`);
          break;
        }
      }
    }

    if (weight) {
      console.log(`📦 Product weight: ${weight}kg`);
    } else {
      console.warn('⚠️  No weight information found');
    }

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
      variants: variants,               // SKU 조합 (가격, 재고 포함)
      weight: weight,                   // 상품 무게 (kg)
      extracted_at: new Date().toISOString(),
      extraction_method: 'chrome_extension'
    };

    console.log('✅ Product data extracted:', productData);
    console.log('📊 Summary:');
    console.log(`   - Main images: ${images.length}`);
    console.log(`   - Description images: ${descImages.length}`);
    console.log(`   - Options: ${options.length}`);
    console.log(`   - Variants: ${variants.length}`);

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

// Prevent multiple extractions
let isExtracting = false;
let lastExtractedUrl = null;
let extractionTimeout = null;

/**
 * Listen for messages from popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Message received:', request);

  if (request.action === 'extractProduct') {
    try {
      // Check if already extracting
      if (isExtracting) {
        console.log('⏳ Extraction already in progress, skipping...');
        sendResponse({ success: false, data: null, message: 'Extraction in progress' });
        return true;
      }

      isExtracting = true;
      const productData = extractTaobaoProduct();
      isExtracting = false;

      sendResponse({ success: !!productData, data: productData });
    } catch (error) {
      isExtracting = false;
      console.error('❌ Extraction error:', error);
      sendResponse({ success: false, data: null, error: error.message });
    }
  }

  return true; // Keep the message channel open for async response
});

// Store product data when page loads (with debounce)
window.addEventListener('load', () => {
  // Skip if URL hasn't changed
  if (lastExtractedUrl === window.location.href) {
    console.log('ℹ️ URL unchanged, skipping extraction');
    return;
  }

  // Clear previous timeout
  if (extractionTimeout) {
    clearTimeout(extractionTimeout);
  }

  // Debounce extraction
  extractionTimeout = setTimeout(() => {
    console.log('📄 Page loaded, extracting product data...');

    if (isExtracting) {
      console.log('⏳ Extraction already in progress, skipping...');
      return;
    }

    try {
      isExtracting = true;
      const productData = extractTaobaoProduct();
      isExtracting = false;

      if (productData) {
        lastExtractedUrl = window.location.href;

        // Store in chrome storage for popup to access
        chrome.storage.local.set({
          currentProduct: productData,
          lastExtractedUrl: window.location.href
        }, () => {
          console.log('💾 Product data stored in chrome.storage');
        });
      }
    } catch (error) {
      isExtracting = false;
      console.error('❌ Extraction error:', error);
    }
  }, 500); // Wait 500ms for page to stabilize
});
