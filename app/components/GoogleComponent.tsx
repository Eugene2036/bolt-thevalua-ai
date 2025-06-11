import { GoogleMap, InfoWindow, LoadScript, Marker } from '@react-google-maps/api';
import React, { useState, useMemo } from 'react';

interface MapProps {
    latitude: number;
    longitude: number;
    mapLabel: string;
    mapHeight?: string;
}

const GoogleComponent: React.FC<MapProps> = ({ latitude, longitude, mapLabel, mapHeight }) => {
    const [markerPosition, setMarkerPosition] = useState<{ lat: number, lng: number, label: string } | null>(null);
    const [label, setLabel] = useState<string>(mapLabel);
    const [isLoaded, setIsLoaded] = useState(false);

    const mapStyles = {
        height: mapHeight || "400px",
        width: "100%"
    };

    // Validate and provide fallback coordinates if needed
    const defaultCenter = useMemo(() => {
        // Fallback to some default location (e.g., New York) if coordinates are invalid
        const fallback = { lat: -24.6017811, lng: 25.9349454 };

        // Check if coordinates are valid numbers
        if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
            isNaN(latitude) || isNaN(longitude)) {
            return fallback;
        }

        // Check if coordinates are within valid ranges
        if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
            return fallback;
        }

        return {
            lat: latitude,
            lng: longitude,
        };
    }, [latitude, longitude]);

    const handleMapClick = () => {
        if (mapLabel && !isNaN(defaultCenter.lat) && !isNaN(defaultCenter.lng)) {
            setMarkerPosition({
                lat: defaultCenter.lat,
                lng: defaultCenter.lng,
                label: mapLabel
            });
            setLabel(mapLabel);
        }
    };

    return (
        <LoadScript
            googleMapsApiKey='AIzaSyCaedTiS5L1Y3Qx1p_yKAyGSZ_1h28yL50'
            onLoad={() => setIsLoaded(true)}
        >
            {isLoaded ? (
                <GoogleMap
                    mapContainerStyle={mapStyles}
                    zoom={18}
                    center={defaultCenter}
                    options={{
                        mapTypeId: 'hybrid',
                        streetViewControl: false,
                        fullscreenControl: true,
                        zoomControl: true,
                        mapTypeControl: false,
                        scaleControl: false,
                        scrollwheel: false,
                        gestureHandling: 'greedy',
                        keyboardShortcuts: false,
                    }}
                    onClick={handleMapClick}
                >
                    {markerPosition && (
                        <Marker position={markerPosition}>
                            <InfoWindow position={markerPosition}>
                                <div>{label}</div>
                            </InfoWindow>
                        </Marker>
                    )}
                </GoogleMap>
            ) : <div>Loading map...</div>}
        </LoadScript>
    );
};

export default GoogleComponent;




