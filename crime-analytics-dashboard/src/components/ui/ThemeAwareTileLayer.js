import React from 'react';
import { TileLayer } from 'react-leaflet';

/**
 * Shared basemap for every Leaflet view. OpenStreetMap needs no API key; the
 * dashboard theme applies the dark visual treatment through index.css.
 */
function ThemeAwareTileLayer() {
  return (
    <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution="&copy; OpenStreetMap contributors"
      subdomains="abc"
      maxZoom={20}
    />
  );
}

export default ThemeAwareTileLayer;
