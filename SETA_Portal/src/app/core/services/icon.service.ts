import { Injectable } from '@angular/core';

// Import feather-icons - Documentation: https://github.com/feathericons/feather
// The API is: feather.icons.iconName.toSvg()
import * as feather from 'feather-icons';

@Injectable({
  providedIn: 'root'
})
export class IconService {
  // Fallback icon definitions (Feather Icons SVG paths)
  private readonly fallbackIcons: Record<string, string> = {
    'users': '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
    'check-square': '<polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>',
    'check-circle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
    'ban': '<circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>',
    'trending-up': '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline>',
    'shield-off': '<path d="M19.69 14a6.9 6.9 0 0 0 .31-2V5l-8-3-3.16 1.18"></path><path d="M4.73 4.73L4 5v7c0 6 8 10 8 10a20.29 20.29 0 0 0 5.62-4.38"></path><line x1="1" y1="1" x2="23" y2="23"></line>',
    'percent': '<line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle>',
    'activity': '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>'
  };

  /**
   * Get Feather icon SVG path data by name
   * @param iconName Name of the Feather icon (e.g., 'users', 'check-circle')
   * @returns SVG path data as string, or empty string if icon not found
   */
  getIcon(iconName: string): string {
    try {
      if (feather && feather.icons && feather.icons[iconName]) {
        return feather.icons[iconName].toSvg();
      }
      // Fallback to hardcoded icons
      const fallback = this.fallbackIcons[iconName];
      if (fallback) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${fallback}</svg>`;
      }
      return '';
    } catch (error) {
      console.warn(`Icon "${iconName}" not found in Feather Icons`);
      return '';
    }
  }

  /**
   * Get Feather icon SVG path data only (without SVG wrapper)
   * @param iconName Name of the Feather icon
   * @returns Inner HTML content (paths, circles, etc.) as string
   */
  getIconPath(iconName: string): string {
    try {
      // Try to use feather-icons package
      if (feather?.icons?.[iconName]) {
        const icon = feather.icons[iconName];
        const svgString = icon.toSvg();
        const match = svgString.match(/<svg[^>]*>(.*?)<\/svg>/s);
        if (match && match[1]) {
          return match[1];
        }
      }
      // Fallback to hardcoded icons
      if (this.fallbackIcons[iconName]) {
        return this.fallbackIcons[iconName];
      }
      return '';
    } catch (error) {
      // If feather-icons fails, use fallback
      console.warn(`Icon "${iconName}" not found in feather-icons, using fallback`);
      return this.fallbackIcons[iconName] || '';
    }
  }

  /**
   * Check if an icon exists
   * @param iconName Name of the Feather icon
   * @returns true if icon exists, false otherwise
   */
  hasIcon(iconName: string): boolean {
    if (feather && feather.icons) {
      return !!feather.icons[iconName];
    }
    return !!this.fallbackIcons[iconName];
  }
}

