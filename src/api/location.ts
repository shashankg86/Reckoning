/**
 * Location API Service
 * Uses https://countriesnow.space API (free, no API key required)
 */

export interface Country {
  name: string;
  iso2: string;
  iso3: string;
}

export interface State {
  name: string;
  state_code: string;
}

export interface City {
  name: string;
}

const BASE_URL = 'https://countriesnow.space/api/v0.1/countries';

export const locationAPI = {
  /**
   * Get list of all countries
   */
  async getCountries(): Promise<Country[]> {
    try {
      const response = await fetch(`${BASE_URL}/iso`);
      if (!response.ok) throw new Error('Failed to fetch countries');

      const data = await response.json();
      if (!data.data) throw new Error('Invalid response format');

      // Sort countries alphabetically
      return data.data.sort((a: Country, b: Country) =>
        a.name.localeCompare(b.name)
      );
    } catch (error) {
      console.error('Error fetching countries:', error);
      // Return fallback list of common countries
      return [
        { name: 'India', iso2: 'IN', iso3: 'IND' },
        { name: 'United States', iso2: 'US', iso3: 'USA' },
        { name: 'United Kingdom', iso2: 'GB', iso3: 'GBR' },
        { name: 'Canada', iso2: 'CA', iso3: 'CAN' },
        { name: 'Australia', iso2: 'AU', iso3: 'AUS' },
      ];
    }
  },

  /**
   * Get states for a specific country
   */
  async getStates(countryName: string): Promise<State[]> {
    try {
      const response = await fetch(`${BASE_URL}/states`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: countryName }),
      });

      if (!response.ok) throw new Error('Failed to fetch states');

      const data = await response.json();
      if (!data.data || !data.data.states) throw new Error('Invalid response format');

      // Sort states alphabetically
      return data.data.states.sort((a: State, b: State) =>
        a.name.localeCompare(b.name)
      );
    } catch (error) {
      console.error(`Error fetching states for ${countryName}:`, error);
      return [];
    }
  },

  /**
   * Get cities for a specific country and state
   */
  async getCities(countryName: string, stateName: string): Promise<City[]> {
    try {
      const response = await fetch(`${BASE_URL}/state/cities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: countryName,
          state: stateName,
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch cities');

      const data = await response.json();
      if (!data.data) throw new Error('Invalid response format');

      // Sort cities alphabetically
      const cities = data.data.sort((a: string, b: string) =>
        a.localeCompare(b)
      );

      return cities.map((name: string) => ({ name }));
    } catch (error) {
      console.error(`Error fetching cities for ${countryName}, ${stateName}:`, error);
      return [];
    }
  },
};
