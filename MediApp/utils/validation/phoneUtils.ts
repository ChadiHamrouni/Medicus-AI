import { countryCodes } from '@/components/shared/ui/Form/PhoneInput/countryCodes';
import { logger } from '../infrastructure/logger';

/**
 * Formats a phone number according to the country's mask
 */
export const formatPhoneNumber = (
  value: string,
  countryCode: string
): string => {
  if (!value) return '';

  let cleaned = value.replace(/\D/g, '');

  const country = countryCodes.find(c => c.code === countryCode);
  const mask = country?.mask;

  // Stored numbers are often E.164 ("+15550000003"): drop the dial code so the
  // national mask isn't filled with it ("(155) 500-0000").
  const dialDigits = country?.dial_code?.replace(/\D/g, '');
  if (value.trim().startsWith('+') && dialDigits && cleaned.startsWith(dialDigits)) {
    cleaned = cleaned.slice(dialDigits.length);
  }

  if (!mask) return cleaned;

  let formatted = '';
  let digitIndex = 0;

  for (let i = 0; i < mask.length && digitIndex < cleaned.length; i++) {
    if (mask[i] === '#') {
      formatted += cleaned[digitIndex];
      digitIndex++;
    } else {
      formatted += mask[i];
    }
  }

  return formatted;
};

/**
 * Parses a full phone number to extract country code and number
 */
export const parsePhoneNumber = (
  fullPhone: string
): { country: (typeof countryCodes)[0] | null; number: string } => {
  if (!fullPhone) return { country: null, number: '' };

  // Remove all non-digits
  const cleaned = fullPhone.replace(/\D/g, '');

  // Handle "00" prefix (international format)
  let phoneToCheck = cleaned;
  if (cleaned.startsWith('00')) {
    phoneToCheck = cleaned.substring(2); // Remove "00"
  }

  // Try to match against known country dial codes (sort by length descending to match longest first)
  const sortedCountries = [...countryCodes].sort((a, b) => {
    const aLen = a.dial_code.replace('+', '').length;
    const bLen = b.dial_code.replace('+', '').length;
    return bLen - aLen;
  });

  for (const country of sortedCountries) {
    const dialCode = country.dial_code.replace('+', '');
    if (phoneToCheck.startsWith(dialCode)) {
      // Found matching country code
      const numberPart = phoneToCheck.substring(dialCode.length);
      return {
        country,
        number: numberPart,
      };
    }
  }

  // Fallback: if no country code detected, use default logic
  if (phoneToCheck.length === 10) {
    // Likely US number without country code
    const usCountry = countryCodes.find(c => c.code === 'US');
    return { country: usCountry || null, number: phoneToCheck };
  } else if (phoneToCheck.length === 11 && phoneToCheck.startsWith('1')) {
    // US/Canada number with country code
    const usCountry = countryCodes.find(c => c.code === 'US');
    return { country: usCountry || null, number: phoneToCheck.substring(1) };
  }

  // Default fallback to US
  return {
    country: countryCodes.find(c => c.code === 'US') || countryCodes[0],
    number: phoneToCheck,
  };
};

/**
 * Gets the country code from the user's IP address
 * Falls back to 'US' if detection fails
 */
export const getCountryFromIP = async (): Promise<string> => {
  try {
    // Use ipapi.co for IP-based geolocation (free tier available)
    const response = await fetch('https://ipapi.co/json/', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const countryCode = data.country_code;

    // Verify that we have this country in our list
    const country = countryCodes.find(c => c.code === countryCode);

    if (country) {
      logger.info('Country detected from IP', {
        component: 'phoneUtils',
        countryCode,
        countryName: country.name,
      });
      return countryCode;
    }

    logger.warn('Detected country code not found in country list, using US', {
      component: 'phoneUtils',
      detectedCode: countryCode,
    });
    return 'US';
  } catch (error) {
    logger.error('Failed to detect country from IP, using US', error as Error, {
      component: 'phoneUtils',
    });
    return 'US';
  }
};

/**
 * Builds full international phone number with country code
 * Returns format: 00{country_code}{number} (e.g., 0015551234567 for US)
 */
export const buildFullPhoneNumber = (
  phoneNumber: string,
  countryCode: string
): string => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const country = countryCodes.find(c => c.code === countryCode);

  if (!country) {
    throw new Error(`Invalid country code: ${countryCode}`);
  }

  const dialCodeWith00 = country.dial_code.replace('+', '00');
  return `${dialCodeWith00}${cleanPhone}`;
};
