import React, { useState } from 'react';
import Select from 'react-select';
import botswanaData from '~/botswanaData.json';

// Define types for our data structure
interface Neighborhood {
    id: string;
    name: string;
}

interface Town {
    id: string;
    name: string;
    neighborhoods: Neighborhood[];
}

interface BotswanaData {
    Botswana: {
        towns: Town[];
    };
}

// Define types for our select options
interface SelectOption {
    value: string;
    label: string;
    neighborhoods?: Neighborhood[];
}

interface TownNeighborhoodSelectorProps {
    onSelectionChange?: (town: SelectOption | null, neighborhood: SelectOption | null) => void;
}

const TownNeighborhoodSelector: React.FC<TownNeighborhoodSelectorProps> = ({ onSelectionChange }) => {
    const [selectedTown, setSelectedTown] = useState<SelectOption | null>(null);
    const [selectedNeighborhood, setSelectedNeighborhood] = useState<SelectOption | null>(null);

    // Get all towns for the first dropdown, sorted alphabetically
    const towns: SelectOption[] = (botswanaData as BotswanaData).Botswana.towns
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(town => ({
            value: town.id,
            label: town.name,
            neighborhoods: town.neighborhoods
        }));

    // Get neighborhoods for the selected town, sorted alphabetically
    const neighborhoods: SelectOption[] = selectedTown
        ? (selectedTown.neighborhoods
            ? selectedTown.neighborhoods.slice().sort((a, b) => a.name.localeCompare(b.name))
            : []
        ).map(neighborhood => ({
            value: neighborhood.id,
            label: neighborhood.name
        }))
        : [];

    const handleTownChange = (selectedOption: SelectOption | null) => {
        setSelectedTown(selectedOption);
        setSelectedNeighborhood(null); // Reset neighborhood selection when town changes
        if (onSelectionChange) {
            onSelectionChange(selectedOption, null);
        }
    };

    const handleNeighborhoodChange = (selectedOption: SelectOption | null) => {
        setSelectedNeighborhood(selectedOption);
        if (onSelectionChange) {
            onSelectionChange(selectedTown, selectedOption);
        }
    };

    return (
        <div style={{ maxWidth: '500px', margin: '10px' }} className="grid grid-cols-2 rounded-lg p-2 px-0 gap-2">
            <div style={{ marginBottom: '10px' }}>
                <label htmlFor="town-select" className='font-extralight text-sm'>Select a Location:</label>
                <Select
                    id="town-select"
                    options={towns}
                    value={selectedTown}
                    onChange={handleTownChange}
                    placeholder="..."
                    isClearable
                />
            </div>

            {selectedTown && (
                <div>
                    <label htmlFor="neighborhood-select" className='font-extralight text-sm'>Neighborhood:</label>
                    <Select
                        id="neighborhood-select"
                        options={neighborhoods}
                        value={selectedNeighborhood}
                        onChange={handleNeighborhoodChange}
                        placeholder="..."
                        isClearable
                        isDisabled={!selectedTown || neighborhoods.length === 0}
                    />
                    {neighborhoods.length === 0 && (
                        <p style={{ color: '#666', marginTop: '5px' }}>
                            No neighborhoods available for this town.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default TownNeighborhoodSelector;