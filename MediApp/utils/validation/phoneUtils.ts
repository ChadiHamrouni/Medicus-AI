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
 * Gets the user's country from the device's region setting (e.g. "en-US" -> "US").
 * Runs entirely on the device: no network call, no third-party service sees the user's IP.
 * Falls back to 'US' when the region is unknown or not in the country list.
 */
export const getDeviceCountry = (): string => {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
    const region = locale.split(/[-_]/).find(part => /^[A-Z]{2}$/.test(part));
    if (region && countryCodes.some(c => c.code === region)) {
      return region;
    }
  } catch (error) {
    logger.warn('Could not read the device region, using US', { component: 'phoneUtils' });
  }
  return 'US';
};

/** @deprecated Kept for compatibility: now reads the device region instead of calling an IP service. */
export const getCountryFromIP = async (): Promise<string> => getDeviceCountry();

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
