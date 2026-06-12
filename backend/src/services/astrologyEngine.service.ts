import crypto from 'crypto';
import logger from '../utils/logger';

export interface PlanetaryPosition {
  name: string;
  zodiacSign: string;
  degree: number;
  house: number;
  isRetrograde: boolean;
}

export interface HouseDetail {
  houseNumber: number;
  zodiacSign: string;
  degree: number;
  lord: string;
}

export interface AstrologyMatrix {
  clientBirthPlace: string;
  calculatedAscendant: string;
  planetaryPositions: PlanetaryPosition[];
  houses: HouseDetail[];
}

export class AstrologyEngineService {
  private zodiacSigns = [
    'Aries', 'Taurus', 'Gemini', 'Cancer',
    'Leo', 'Virgo', 'Libra', 'Scorpio',
    'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];

  private houseLords: Record<string, string> = {
    Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
    Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
    Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter'
  };

  /**
   * Generates a deterministic mock planetary matrix based on client birth details.
   */
  generateMatrix(birthDate: string, birthTime: string, birthPlace: string): AstrologyMatrix {
    logger.info('Simulating planetary matrix generation', { birthDate, birthTime, birthPlace });

    // Use a hash of the combined details to seed deterministic values
    const hash = crypto.createHash('md5').update(`${birthDate}T${birthTime}Z_${birthPlace}`).digest('hex');
    
    // Parse chunks of the hash to extract deterministic values
    const ascIndex = parseInt(hash.substring(0, 2), 16) % 12;
    const sunOffset = parseInt(hash.substring(2, 4), 16) % 360;
    const moonOffset = parseInt(hash.substring(4, 6), 16) % 360;
    const mercuryOffset = parseInt(hash.substring(6, 8), 16) % 360;
    const venusOffset = parseInt(hash.substring(8, 10), 16) % 360;
    const marsOffset = parseInt(hash.substring(10, 12), 16) % 360;
    const jupiterOffset = parseInt(hash.substring(12, 14), 16) % 360;
    const saturnOffset = parseInt(hash.substring(14, 16), 16) % 360;

    const ascendantSign = this.zodiacSigns[ascIndex];

    // Align houses relative to Ascendant
    const houses: HouseDetail[] = [];
    for (let i = 1; i <= 12; i++) {
      const signIndex = (ascIndex + i - 1) % 12;
      const sign = this.zodiacSigns[signIndex];
      houses.push({
        houseNumber: i,
        zodiacSign: sign,
        degree: parseFloat(((parseInt(hash.substring(i, i + 2), 16) % 3000) / 100).toFixed(2)),
        lord: this.houseLords[sign]
      });
    }

    // Determine planetary houses based on degree offsets
    const getHouseNum = (degree: number, ascIndex: number) => {
      const signIndex = Math.floor(degree / 30);
      return ((signIndex - ascIndex + 12) % 12) + 1;
    };

    const planets = [
      { name: 'Sun', offset: sunOffset, isRetro: false },
      { name: 'Moon', offset: moonOffset, isRetro: false },
      { name: 'Mercury', offset: mercuryOffset, isRetro: (parseInt(hash.substring(16, 17), 16) % 3) === 0 },
      { name: 'Venus', offset: venusOffset, isRetro: (parseInt(hash.substring(17, 18), 16) % 4) === 0 },
      { name: 'Mars', offset: marsOffset, isRetro: (parseInt(hash.substring(18, 19), 16) % 5) === 0 },
      { name: 'Jupiter', offset: jupiterOffset, isRetro: (parseInt(hash.substring(19, 20), 16) % 3) === 0 },
      { name: 'Saturn', offset: saturnOffset, isRetro: (parseInt(hash.substring(20, 21), 16) % 3) === 0 },
    ];

    const planetaryPositions: PlanetaryPosition[] = planets.map((p) => {
      const signIndex = Math.floor(p.offset / 30);
      const degreeInSign = parseFloat((p.offset % 30).toFixed(2));
      return {
        name: p.name,
        zodiacSign: this.zodiacSigns[signIndex],
        degree: degreeInSign,
        house: getHouseNum(p.offset, ascIndex),
        isRetrograde: p.isRetro
      };
    });

    return {
      clientBirthPlace: birthPlace,
      calculatedAscendant: ascendantSign,
      planetaryPositions,
      houses
    };
  }
}
