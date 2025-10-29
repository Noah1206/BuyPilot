-- Fix localhost URLs in products table
-- This script replaces localhost URLs with Railway production URL

-- Fix image_url column
UPDATE products
SET image_url = REPLACE(image_url, 'http://localhost:5000', 'https://buypilot-production.up.railway.app')
WHERE image_url LIKE '%localhost:5000%';

UPDATE products
SET image_url = REPLACE(image_url, 'http://localhost:4070', 'https://buypilot-production.up.railway.app')
WHERE image_url LIKE '%localhost:4070%';

UPDATE products
SET image_url = REPLACE(image_url, 'http://localhost:3000', 'https://buypilot-production.up.railway.app')
WHERE image_url LIKE '%localhost:3000%';

-- Fix data JSONB field (thumbnail_image_url)
UPDATE products
SET data = jsonb_set(
    data,
    '{thumbnail_image_url}',
    to_jsonb(REPLACE(data->>'thumbnail_image_url', 'http://localhost:5000', 'https://buypilot-production.up.railway.app'))
)
WHERE data->>'thumbnail_image_url' LIKE '%localhost:5000%';

UPDATE products
SET data = jsonb_set(
    data,
    '{thumbnail_image_url}',
    to_jsonb(REPLACE(data->>'thumbnail_image_url', 'http://localhost:4070', 'https://buypilot-production.up.railway.app'))
)
WHERE data->>'thumbnail_image_url' LIKE '%localhost:4070%';

UPDATE products
SET data = jsonb_set(
    data,
    '{thumbnail_image_url}',
    to_jsonb(REPLACE(data->>'thumbnail_image_url', 'http://localhost:3000', 'https://buypilot-production.up.railway.app'))
)
WHERE data->>'thumbnail_image_url' LIKE '%localhost:3000%';

-- Fix data JSONB field (detail_image_url)
UPDATE products
SET data = jsonb_set(
    data,
    '{detail_image_url}',
    to_jsonb(REPLACE(data->>'detail_image_url', 'http://localhost:5000', 'https://buypilot-production.up.railway.app'))
)
WHERE data->>'detail_image_url' LIKE '%localhost:5000%';

UPDATE products
SET data = jsonb_set(
    data,
    '{detail_image_url}',
    to_jsonb(REPLACE(data->>'detail_image_url', 'http://localhost:4070', 'https://buypilot-production.up.railway.app'))
)
WHERE data->>'detail_image_url' LIKE '%localhost:4070%';

UPDATE products
SET data = jsonb_set(
    data,
    '{detail_image_url}',
    to_jsonb(REPLACE(data->>'detail_image_url', 'http://localhost:3000', 'https://buypilot-production.up.railway.app'))
)
WHERE data->>'detail_image_url' LIKE '%localhost:3000%';

-- Fix downloaded_images array in data JSONB
-- This is more complex - we need to iterate through array elements
-- Using a temporary function approach
DO $$
DECLARE
    prod RECORD;
    img_array jsonb;
    new_array jsonb := '[]'::jsonb;
    img_url text;
BEGIN
    FOR prod IN SELECT id, data FROM products WHERE data->'downloaded_images' IS NOT NULL LOOP
        img_array := prod.data->'downloaded_images';
        new_array := '[]'::jsonb;

        -- Iterate through each image URL in the array
        FOR i IN 0..(jsonb_array_length(img_array) - 1) LOOP
            img_url := img_array->>i;

            -- Replace localhost URLs
            img_url := REPLACE(img_url, 'http://localhost:5000', 'https://buypilot-production.up.railway.app');
            img_url := REPLACE(img_url, 'http://localhost:4070', 'https://buypilot-production.up.railway.app');
            img_url := REPLACE(img_url, 'http://localhost:3000', 'https://buypilot-production.up.railway.app');

            -- Add to new array
            new_array := new_array || to_jsonb(img_url);
        END LOOP;

        -- Update the product with fixed URLs
        UPDATE products
        SET data = jsonb_set(data, '{downloaded_images}', new_array)
        WHERE id = prod.id;
    END LOOP;
END $$;

-- Fix option images
DO $$
DECLARE
    prod RECORD;
    options_array jsonb;
    new_options jsonb := '[]'::jsonb;
    option jsonb;
    values_array jsonb;
    new_values jsonb;
    value jsonb;
    new_value jsonb;
    img_url text;
BEGIN
    FOR prod IN SELECT id, data FROM products WHERE data->'options' IS NOT NULL LOOP
        options_array := prod.data->'options';
        new_options := '[]'::jsonb;

        -- Iterate through each option
        FOR i IN 0..(jsonb_array_length(options_array) - 1) LOOP
            option := options_array->i;
            values_array := option->'values';
            new_values := '[]'::jsonb;

            -- Iterate through each value in the option
            IF values_array IS NOT NULL THEN
                FOR j IN 0..(jsonb_array_length(values_array) - 1) LOOP
                    value := values_array->j;
                    new_value := value;

                    -- Fix image URL if exists
                    IF value->>'image' IS NOT NULL THEN
                        img_url := value->>'image';
                        img_url := REPLACE(img_url, 'http://localhost:5000', 'https://buypilot-production.up.railway.app');
                        img_url := REPLACE(img_url, 'http://localhost:4070', 'https://buypilot-production.up.railway.app');
                        img_url := REPLACE(img_url, 'http://localhost:3000', 'https://buypilot-production.up.railway.app');
                        new_value := jsonb_set(new_value, '{image}', to_jsonb(img_url));
                    END IF;

                    -- Fix original_image URL if exists
                    IF value->>'original_image' IS NOT NULL THEN
                        img_url := value->>'original_image';
                        img_url := REPLACE(img_url, 'http://localhost:5000', 'https://buypilot-production.up.railway.app');
                        img_url := REPLACE(img_url, 'http://localhost:4070', 'https://buypilot-production.up.railway.app');
                        img_url := REPLACE(img_url, 'http://localhost:3000', 'https://buypilot-production.up.railway.app');
                        new_value := jsonb_set(new_value, '{original_image}', to_jsonb(img_url));
                    END IF;

                    new_values := new_values || jsonb_build_array(new_value);
                END LOOP;
            END IF;

            -- Rebuild option with fixed values
            new_options := new_options || jsonb_build_array(jsonb_set(option, '{values}', new_values));
        END LOOP;

        -- Update the product with fixed options
        UPDATE products
        SET data = jsonb_set(data, '{options}', new_options)
        WHERE id = prod.id;
    END LOOP;
END $$;

-- Show summary of changes
SELECT
    COUNT(*) as total_products,
    COUNT(CASE WHEN image_url LIKE '%buypilot-production.up.railway.app%' THEN 1 END) as with_railway_url,
    COUNT(CASE WHEN image_url LIKE '%localhost%' THEN 1 END) as with_localhost_url
FROM products;
