/**
 * Location Intelligence Service
 *
 * Automatically detects:
 * - County and city from address
 * - Incorporated vs unincorporated status
 * - Flood zones (FEMA)
 * - Coastal zones (wind load requirements)
 * - Airport proximity (height restrictions)
 * - Special districts (historic, HOA, etc.)
 */

import axios from 'axios';
import { logger } from '../middleware/logger';

export interface LocationAnalysis {
  // Basic location
  address: {
    street: string;
    city: string;
    county: string;
    state: string;
    zipCode: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };

  // Jurisdiction
  jurisdiction: {
    type: 'incorporated' | 'unincorporated';
    primaryAuthority: string; // e.g., "hillsborough-county"
    secondaryAuthority?: string; // e.g., "city-of-tampa" if incorporated
    permitOffice: string;
  };

  // Flood zone
  floodZone: {
    zone: string; // e.g., "X", "AE", "VE"
    isFloodZone: boolean;
    requiresElevationCert: boolean;
    baseFloodElevation?: number; // in feet
    firmPanelNumber?: string; // FEMA panel ID
  };

  // Wind/coastal requirements
  coastal: {
    isCoastal: boolean;
    windSpeed: number; // mph design wind speed
    requiresWindCalc: boolean;
    windZone: string; // e.g., "Zone 1", "Zone 2"
  };

  // Height restrictions
  heightRestrictions: {
    hasRestrictions: boolean;
    maxHeight?: number; // feet
    reason?: 'airport' | 'historic' | 'zoning' | 'coastal';
    nearbyAirport?: string;
    distanceToAirport?: number; // miles
  };

  // Special requirements
  specialDistricts: {
    historic: boolean;
    hoa: boolean;
    environmentalReview: boolean;
    reasons: string[];
  };

  // Additional forms needed
  additionalForms: string[];

  // Confidence in detection
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

export class LocationIntelligenceService {
  private geocodingEnabled: boolean;
  private geocodingApiKey?: string;

  constructor() {
    // Check if we have Google Maps API key (optional - we can use free OpenStreetMap)
    this.geocodingApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.geocodingEnabled = true; // Always enabled - use OpenStreetMap if no Google key

    if (!this.geocodingApiKey) {
      logger.info('Using OpenStreetMap Nominatim for geocoding (free, no API key required)', {
        service: 'location-intelligence'
      });
    }
  }

  /**
   * Analyze a location and detect all requirements
   */
  async analyzeLocation(address: string, city: string, state: string, zipCode: string): Promise<LocationAnalysis> {
    logger.info('Analyzing location requirements', {
      service: 'location-intelligence',
      address,
      city
    });

    // Step 1: Geocode to get precise coordinates
    const coordinates = await this.geocode(address, city, state, zipCode);

    // Step 2: Detect county
    const county = await this.detectCounty(coordinates, city, state);

    // Step 3: Check incorporated status
    const jurisdiction = this.detectJurisdiction(city, county);

    // Step 4: Check flood zone
    const floodZone = await this.detectFloodZone(coordinates);

    // Step 5: Check coastal requirements
    const coastal = this.detectCoastalRequirements(coordinates, county);

    // Step 6: Check height restrictions
    const heightRestrictions = await this.detectHeightRestrictions(coordinates, city, county);

    // Step 7: Check special districts
    const specialDistricts = this.detectSpecialDistricts(city, county, coordinates);

    // Step 8: Determine additional forms needed
    const additionalForms = this.determineAdditionalForms(
      jurisdiction,
      floodZone,
      coastal,
      heightRestrictions,
      specialDistricts
    );

    // Step 9: Generate warnings
    const warnings = this.generateWarnings(floodZone, heightRestrictions, specialDistricts);

    return {
      address: {
        street: address,
        city,
        county,
        state,
        zipCode,
        coordinates,
      },
      jurisdiction,
      floodZone,
      coastal,
      heightRestrictions,
      specialDistricts,
      additionalForms,
      confidence: coordinates.latitude ? 'high' : 'medium',
      warnings,
    };
  }

  /**
   * Geocode an address to get coordinates
   * Uses Google Maps if API key available, otherwise OpenStreetMap Nominatim (free)
   */
  private async geocode(
    address: string,
    city: string,
    state: string,
    zipCode: string
  ): Promise<{ latitude: number; longitude: number }> {
    const fullAddress = `${address}, ${city}, ${state} ${zipCode}`;

    try {
      if (this.geocodingApiKey) {
        // Use Google Maps Geocoding API
        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
          params: {
            address: fullAddress,
            key: this.geocodingApiKey,
          },
          timeout: 5000,
        });

        if (response.data.status === 'OK' && response.data.results.length > 0) {
          const location = response.data.results[0].geometry.location;
          logger.info('Google Maps geocoding successful', {
            service: 'location-intelligence',
            address: fullAddress,
            coordinates: location
          });
          return {
            latitude: location.lat,
            longitude: location.lng,
          };
        }
      } else {
        // Use OpenStreetMap Nominatim (free, no API key required)
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: {
            q: fullAddress,
            format: 'json',
            limit: 1,
            countrycodes: 'us',
          },
          headers: {
            'User-Agent': 'AI-Permit-Tampa/1.0 (HVAC permit geocoding)',
          },
          timeout: 5000,
        });

        if (response.data && response.data.length > 0) {
          const location = response.data[0];
          logger.info('OpenStreetMap geocoding successful', {
            service: 'location-intelligence',
            address: fullAddress,
            coordinates: { lat: location.lat, lon: location.lon }
          });
          return {
            latitude: parseFloat(location.lat),
            longitude: parseFloat(location.lon),
          };
        }
      }

      logger.warn('Geocoding failed, using approximate city coordinates', {
        service: 'location-intelligence',
        address: fullAddress
      });
      return this.getCityApproximateCoordinates(city);
    } catch (error: any) {
      logger.error('Geocoding error, using approximate city coordinates', {
        service: 'location-intelligence',
        error: error.message,
        address: fullAddress
      });
      return this.getCityApproximateCoordinates(city);
    }
  }

  /**
   * Approximate city center coordinates (fallback)
   */
  private getCityApproximateCoordinates(city: string): { latitude: number; longitude: number } {
    const cityCoordinates: Record<string, { latitude: number; longitude: number }> = {
      // Hillsborough County
      'tampa': { latitude: 27.9506, longitude: -82.4572 },
      'brandon': { latitude: 27.9378, longitude: -82.2859 },
      'plant city': { latitude: 28.0186, longitude: -82.1129 },
      'ruskin': { latitude: 27.7209, longitude: -82.4326 },
      'apollo beach': { latitude: 27.7731, longitude: -82.4073 },

      // Pasco County (INLAND - no flood zones!)
      'wesley chapel': { latitude: 28.2416, longitude: -82.3275 },
      'land o lakes': { latitude: 28.2189, longitude: -82.4573 },
      'land o\' lakes': { latitude: 28.2189, longitude: -82.4573 },
      'trinity': { latitude: 28.1831, longitude: -82.6729 },
      'zephyrhills': { latitude: 28.2336, longitude: -82.1812 },
      'dade city': { latitude: 28.3647, longitude: -82.1959 },
      'new port richey': { latitude: 28.2442, longitude: -82.7193 }, // ACTUAL coast
      'port richey': { latitude: 28.2728, longitude: -82.7193 }, // ACTUAL coast
      'hudson': { latitude: 28.3644, longitude: -82.6940 }, // ACTUAL coast

      // Pinellas County (coastal)
      'st. petersburg': { latitude: 27.7676, longitude: -82.6403 },
      'clearwater': { latitude: 27.9659, longitude: -82.8001 },
    };

    const cityLower = city.toLowerCase();
    return cityCoordinates[cityLower] || { latitude: 28.0, longitude: -82.5 }; // Central Florida default
  }

  /**
   * Detect county from coordinates or city name
   */
  private async detectCounty(
    coordinates: { latitude: number; longitude: number },
    city: string,
    state: string
  ): Promise<string> {
    // Tampa Bay area city -> county mapping
    const cityCountyMap: Record<string, string> = {
      // Hillsborough County
      'tampa': 'hillsborough',
      'temple terrace': 'hillsborough',
      'plant city': 'hillsborough',
      'brandon': 'hillsborough',
      'riverview': 'hillsborough',
      'ruskin': 'hillsborough',
      'apollo beach': 'hillsborough',
      'wimauma': 'hillsborough',
      'valrico': 'hillsborough',
      'seffner': 'hillsborough',
      'thonotosassa': 'hillsborough',

      // Pasco County (CRITICAL!)
      'new port richey': 'pasco',
      'port richey': 'pasco',
      'dade city': 'pasco',
      'zephyrhills': 'pasco',
      'wesley chapel': 'pasco',
      'land o lakes': 'pasco',
      'land o\' lakes': 'pasco',
      'trinity': 'pasco',
      'hudson': 'pasco',
      'bayonet point': 'pasco',
      'holiday': 'pasco',
      'lutz': 'pasco', // Part of Lutz is in Pasco
      'san antonio': 'pasco',
      'shady hills': 'pasco',
      'port st. john': 'pasco',

      // Pinellas County
      'st. petersburg': 'pinellas',
      'st petersburg': 'pinellas',
      'clearwater': 'pinellas',
      'largo': 'pinellas',
      'pinellas park': 'pinellas',
      'dunedin': 'pinellas',
      'tarpon springs': 'pinellas',
      'safety harbor': 'pinellas',
      'belleair': 'pinellas',

      // Manatee County
      'bradenton': 'manatee',
      'palmetto': 'manatee',

      // Sarasota County
      'sarasota': 'sarasota',
    };

    const cityLower = city.toLowerCase();
    return cityCountyMap[cityLower] || 'hillsborough'; // Default to Hillsborough
  }

  /**
   * Detect if city is incorporated and determine jurisdiction
   */
  private detectJurisdiction(city: string, county: string): LocationAnalysis['jurisdiction'] {
    const incorporatedCities: Record<string, { county: string; permitOffice: string }> = {
      // Hillsborough County
      'tampa': { county: 'hillsborough', permitOffice: 'City of Tampa Development Services' },
      'temple terrace': { county: 'hillsborough', permitOffice: 'City of Temple Terrace Building Dept' },
      'plant city': { county: 'hillsborough', permitOffice: 'City of Plant City Building Dept' },

      // Pasco County (CRITICAL!)
      'new port richey': { county: 'pasco', permitOffice: 'City of New Port Richey Building Department' },
      'port richey': { county: 'pasco', permitOffice: 'City of Port Richey Building Department' },
      'dade city': { county: 'pasco', permitOffice: 'City of Dade City Building Department' },
      'zephyrhills': { county: 'pasco', permitOffice: 'City of Zephyrhills Building Department' },

      // Pinellas County
      'st. petersburg': { county: 'pinellas', permitOffice: 'City of St. Petersburg Development Review' },
      'clearwater': { county: 'pinellas', permitOffice: 'City of Clearwater Building Dept' },
      'largo': { county: 'pinellas', permitOffice: 'City of Largo Building Services' },

      // Manatee County
      'bradenton': { county: 'manatee', permitOffice: 'City of Bradenton Building Dept' },
    };

    const cityLower = city.toLowerCase();
    const cityInfo = incorporatedCities[cityLower];

    if (cityInfo) {
      return {
        type: 'incorporated',
        primaryAuthority: `${county}-county`,
        secondaryAuthority: `city-of-${cityLower.replace(/\s+/g, '-')}`,
        permitOffice: cityInfo.permitOffice,
      };
    }

    // Unincorporated area
    return {
      type: 'unincorporated',
      primaryAuthority: `${county}-county`,
      permitOffice: `${county.charAt(0).toUpperCase() + county.slice(1)} County Development Services`,
    };
  }

  /**
   * Detect FEMA flood zone using NFHL API
   */
  private async detectFloodZone(
    coordinates: { latitude: number; longitude: number }
  ): Promise<LocationAnalysis['floodZone']> {
    try {
      // FEMA National Flood Hazard Layer (NFHL) REST API
      const femaUrl = 'https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHLWMS/MapServer/identify';

      const params = new URLSearchParams({
        geometry: `${coordinates.longitude},${coordinates.latitude}`,
        geometryType: 'esriGeometryPoint',
        sr: '4326', // WGS84 coordinate system
        layers: 'all:28', // Layer 28 = Special Flood Hazard Areas
        tolerance: '2',
        mapExtent: `${coordinates.longitude - 0.01},${coordinates.latitude - 0.01},${coordinates.longitude + 0.01},${coordinates.latitude + 0.01}`,
        imageDisplay: '400,400,96',
        returnGeometry: 'false',
        f: 'json'
      });

      logger.info('Querying FEMA NFHL API', {
        service: 'location-intelligence',
        coordinates
      });

      const response = await axios.get(`${femaUrl}?${params.toString()}`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'AI-Permit-Tampa/1.0',
          'Accept': 'application/json'
        }
      });

      if (response.data?.results && response.data.results.length > 0) {
        const attributes = response.data.results[0].attributes;
        const zone = attributes.FLD_ZONE || attributes.ZONE_SUBTY || 'X';
        const firmPanel = attributes.DFIRM_ID || attributes.PANEL;

        logger.info('FEMA flood zone detected', {
          service: 'location-intelligence',
          zone,
          firmPanel
        });

        return this.interpretFloodZone(zone, firmPanel);
      }

      // No flood zone data found - property is likely in Zone X (minimal risk)
      logger.info('No FEMA flood zone data found, defaulting to Zone X', {
        service: 'location-intelligence',
        coordinates
      });
      return this.getDefaultFloodZone();

    } catch (error: any) {
      logger.warn('FEMA API query failed, using fallback detection', {
        service: 'location-intelligence',
        error: error.message
      });
      return this.detectFloodZoneFallback(coordinates);
    }
  }

  /**
   * Interpret FEMA flood zone code
   */
  private interpretFloodZone(zone: string, firmPanel?: string): LocationAnalysis['floodZone'] {
    const zoneUpper = zone.toUpperCase();

    // High-risk zones (1% annual flood chance - "100-year floodplain")
    if (zoneUpper.startsWith('A') || zoneUpper.startsWith('V')) {
      const isCoastalHighHazard = zoneUpper.startsWith('V'); // Wave action + flooding
      const hasBaseFloodElevation = /^(AE|VE|AH|AO)/.test(zoneUpper);

      return {
        zone: zoneUpper,
        isFloodZone: true,
        requiresElevationCert: true,
        baseFloodElevation: hasBaseFloodElevation ? 10 : undefined, // Actual BFE would come from FIS
        firmPanelNumber: firmPanel,
      };
    }

    // Moderate-risk zones (0.2% annual flood chance - "500-year floodplain")
    if (zoneUpper.includes('X-SHADED') || zoneUpper === 'X500' || zoneUpper === 'B') {
      return {
        zone: 'X-Shaded',
        isFloodZone: true,
        requiresElevationCert: false, // Not required but recommended for insurance
      };
    }

    // Minimal-risk zones (outside floodplain)
    return this.getDefaultFloodZone();
  }

  /**
   * Fallback flood zone detection (geographic heuristics)
   * CONSERVATIVE BUT ACCURATE: Only flag actual coastal/waterfront properties
   */
  private detectFloodZoneFallback(coordinates: { latitude: number; longitude: number }): LocationAnalysis['floodZone'] {
    const { latitude, longitude } = coordinates;

    // ACTUAL coastal/waterfront areas only (longitude west of -82.5 = right on the water)
    // This excludes inland communities like Wesley Chapel, Trinity, Land O Lakes, etc.
    const isDirectlyOnWater = longitude < -82.5;

    // Pasco County ACTUAL coastal cities (directly on Gulf)
    const isPascoCoastal = latitude > 28.1 && latitude < 28.4 && longitude < -82.65;

    // Tampa Bay waterfront (Apollo Beach, Ruskin, etc.)
    const isTampaBayWaterfront = latitude > 27.7 && latitude < 28.0 && longitude < -82.45;

    // Pinellas County (barrier island peninsula - actually on water)
    const isPinellas = latitude > 27.6 && latitude < 28.2 && longitude < -82.65;

    // Only flag if ACTUALLY on the waterfront
    if (isPascoCoastal || isTampaBayWaterfront || isPinellas) {
      logger.info('Waterfront property detected - flagging for potential flood zone', {
        service: 'location-intelligence',
        coordinates,
        zone: 'AE (estimated)'
      });

      return {
        zone: 'AE',
        isFloodZone: true,
        requiresElevationCert: true,
        baseFloodElevation: 10, // Typical for Tampa Bay coastal zones
        firmPanelNumber: undefined, // Would need FEMA API for actual panel
      };
    }

    // Near water but not directly waterfront (moderate risk area)
    if (isDirectlyOnWater) {
      return {
        zone: 'X-Shaded',
        isFloodZone: true,
        requiresElevationCert: false,
      };
    }

    // Inland communities (Wesley Chapel, Trinity, Land O Lakes, Brandon, etc.) - minimal risk
    logger.info('Inland property - no flood zone requirements', {
      service: 'location-intelligence',
      coordinates
    });
    return this.getDefaultFloodZone();
  }

  /**
   * Default flood zone (minimal risk)
   */
  private getDefaultFloodZone(): LocationAnalysis['floodZone'] {
    return {
      zone: 'X',
      isFloodZone: false,
      requiresElevationCert: false,
    };
  }

  /**
   * Detect coastal wind requirements
   */
  private detectCoastalRequirements(
    coordinates: { latitude: number; longitude: number },
    county: string
  ): LocationAnalysis['coastal'] {
    const { longitude } = coordinates;

    // Florida coastal wind zones (simplified)
    const isCoastal = longitude < -82.3; // West of this line = near Gulf

    if (isCoastal) {
      return {
        isCoastal: true,
        windSpeed: 150, // mph for Tampa Bay coastal
        requiresWindCalc: true,
        windZone: 'Zone 1 (Coastal)',
      };
    }

    return {
      isCoastal: false,
      windSpeed: 130, // mph for inland Florida
      requiresWindCalc: false,
      windZone: 'Zone 2 (Inland)',
    };
  }

  /**
   * Detect height restrictions
   */
  private async detectHeightRestrictions(
    coordinates: { latitude: number; longitude: number },
    city: string,
    county: string
  ): Promise<LocationAnalysis['heightRestrictions']> {
    // Tampa International Airport
    const tpaCoords = { lat: 27.9755, lng: -82.5333 };
    const distanceToTPA = this.calculateDistance(
      coordinates.latitude,
      coordinates.longitude,
      tpaCoords.lat,
      tpaCoords.lng
    );

    if (distanceToTPA < 10) {
      // Within 10 miles of TPA
      return {
        hasRestrictions: true,
        maxHeight: 35, // feet (typical residential near airport)
        reason: 'airport',
        nearbyAirport: 'Tampa International Airport (TPA)',
        distanceToAirport: Math.round(distanceToTPA * 10) / 10,
      };
    }

    return {
      hasRestrictions: false,
    };
  }

  /**
   * Detect special districts
   */
  private detectSpecialDistricts(
    city: string,
    county: string,
    coordinates: { latitude: number; longitude: number }
  ): LocationAnalysis['specialDistricts'] {
    const reasons: string[] = [];
    let historic = false;
    let hoa = false;
    let environmentalReview = false;

    const cityLower = city.toLowerCase();

    // Historic districts (simplified - would query real database)
    const historicCities = ['tampa', 'st. petersburg', 'ybor city', 'dade city'];
    if (historicCities.includes(cityLower)) {
      historic = true;
      reasons.push('Property may be in historic district - verify with city');
    }

    // PASCO COUNTY HOA-HEAVY AREAS (CRITICAL!)
    const hoaHeavyAreas = ['wesley chapel', 'land o lakes', 'land o\' lakes', 'trinity', 'lutz'];
    if (hoaHeavyAreas.includes(cityLower) && county === 'pasco') {
      hoa = true;
      reasons.push('⚠️ PASCO COUNTY: This area typically has HOA restrictions');
      reasons.push('🏘️ CHECK HOA: Many HOAs require approval BEFORE permit application');
      reasons.push('📋 VERIFY: HOA may restrict equipment placement, screening, noise levels');
    }

    // Coastal environmental review
    if (coordinates.longitude < -82.4) {
      environmentalReview = true;
      reasons.push('Coastal area - may require environmental review');
    }

    // PASCO COASTAL AREAS (West Pasco)
    const pascoCoastalCities = ['new port richey', 'port richey', 'hudson', 'bayonet point', 'holiday'];
    if (pascoCoastalCities.includes(cityLower) && county === 'pasco') {
      environmentalReview = true;
      reasons.push('🌊 WEST PASCO: Coastal zone with additional wind and flood requirements');
      reasons.push('💨 WIND LOAD: 140 mph design wind speed required');
    }

    return {
      historic,
      hoa,
      environmentalReview,
      reasons,
    };
  }

  /**
   * Determine additional forms needed
   */
  private determineAdditionalForms(
    jurisdiction: LocationAnalysis['jurisdiction'],
    floodZone: LocationAnalysis['floodZone'],
    coastal: LocationAnalysis['coastal'],
    heightRestrictions: LocationAnalysis['heightRestrictions'],
    specialDistricts: LocationAnalysis['specialDistricts']
  ): string[] {
    const forms: string[] = [];

    // Incorporated city needs city-specific form
    if (jurisdiction.type === 'incorporated') {
      forms.push(`${jurisdiction.secondaryAuthority}-addendum`);
    }

    // Flood zone needs elevation cert
    if (floodZone.requiresElevationCert) {
      forms.push('fema-elevation-certificate');
    }

    // Coastal needs wind calculation
    if (coastal.requiresWindCalc) {
      forms.push('wind-load-calculation');
    }

    // Airport proximity needs FAA review
    if (heightRestrictions.hasRestrictions && heightRestrictions.reason === 'airport') {
      forms.push('faa-height-notification');
    }

    // Historic district needs preservation review
    if (specialDistricts.historic) {
      forms.push('historic-preservation-review');
    }

    return forms;
  }

  /**
   * Generate warnings for contractor
   */
  private generateWarnings(
    floodZone: LocationAnalysis['floodZone'],
    heightRestrictions: LocationAnalysis['heightRestrictions'],
    specialDistricts: LocationAnalysis['specialDistricts']
  ): string[] {
    const warnings: string[] = [];

    if (floodZone.isFloodZone) {
      warnings.push(
        `⚠️ FLOOD ZONE ${floodZone.zone}: This property is in a FEMA flood zone.`
      );
      if (floodZone.requiresElevationCert) {
        warnings.push(
          `📋 ELEVATION CERTIFICATE REQUIRED: Must be completed by licensed surveyor.`
        );
      }
    }

    if (heightRestrictions.hasRestrictions) {
      warnings.push(
        `✈️ HEIGHT RESTRICTION: Maximum ${heightRestrictions.maxHeight} feet due to proximity to ${heightRestrictions.nearbyAirport}`
      );
    }

    if (specialDistricts.historic) {
      warnings.push(
        `🏛️ HISTORIC DISTRICT: May require approval from Historic Preservation Board.`
      );
    }

    if (specialDistricts.environmentalReview) {
      warnings.push(
        `🌊 COASTAL AREA: May require environmental review for wetlands/coastal impact.`
      );
    }

    return warnings;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
