import React, { useState, useEffect } from "react";
import { GetCountries, GetState, GetCity } from "react-country-state-city";
import ReactCountryFlag from "react-country-flag";

interface Country {
    id: string;
    name: string;
    isoCode: string; // Assuming the API returns ISO code for the country
}

interface State {
    id: string;
    name: string;
}

interface City {
    id: string;
    name: string;
}

const StreetAddress: React.FC = () => {
    const [country, setCountry] = useState<string | null>(null);
    const [currentState, setCurrentState] = useState<string | null>(null);
    const [city, setCity] = useState<string | null>(null);
    const [plotNumber, setPlotNumber] = useState<string>("");
    const [neighbourhood, setNeighbourhood] = useState<string>("");
    const [countriesList, setCountriesList] = useState<Country[]>([]);
    const [stateList, setStateList] = useState<State[]>([]);
    const [citiesList, setCitiesList] = useState<City[]>([]);

    useEffect(() => {
        GetCountries().then((result: Country[]) => {
            setCountriesList(result);
            // Automatically select Botswana if it exists in the list
            const botswana = result.find((c) => c.name === "Botswana");
            if (botswana) {
                setCountry(botswana.id);
            }
        });
    }, []);

    useEffect(() => {
        if (country) {
            GetState(parseInt(country)).then((result: State[]) => {
                setStateList(result);
            });
        }
    }, [country]);

    useEffect(() => {
        if (country && currentState) {
            GetCity(parseInt(country), parseInt(currentState)).then((result: City[]) => {
                setCitiesList(result);
            });
        }
    }, [country, currentState]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle form submission, e.g., send data to an API
        console.log({
            country,
            currentState,
            city,
            plotNumber,
            neighbourhood,
        });
    };

    const selectedCountry = countriesList.find((c) => c.id === country);

    return (
        <div
            style={{
                border: "1px solid gray",
                borderRadius: "8px",
                padding: "16px",
                marginTop: "16px",
            }}
        >
            <div style={{ maxWidth: "600px", margin: "auto" }}>
                <h2 style={{ marginBottom: "20px" }}>Address Form</h2>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "16px" }}>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ marginTop: 10, marginBottom: 5 }}>Country</h3>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                {selectedCountry && (
                                    <ReactCountryFlag
                                        countryCode={selectedCountry.isoCode}
                                        svg
                                        style={{
                                            width: "24px",
                                            height: "24px",
                                            borderRadius: "50%",
                                        }}
                                    />
                                )}
                                <select
                                    onChange={(e) => setCountry(e.target.value)}
                                    value={country || ""}
                                    style={{ width: "100%", minHeight: 40 }}
                                    required
                                >
                                    <option value={""}>-- Select Country --</option>
                                    {countriesList.map((_country) => (
                                        <option key={_country.id} value={_country.id}>
                                            {_country.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ flex: 1 }}>
                            <h3 style={{ marginTop: 10, marginBottom: 5 }}>State</h3>
                            <select
                                onChange={(e) => setCurrentState(e.target.value)}
                                value={currentState || ""}
                                style={{ width: "100%", minHeight: 40 }}
                                required
                            >
                                <option value={""}>-- Select State --</option>
                                {stateList.map((_state) => (
                                    <option key={_state.id} value={_state.id}>
                                        {_state.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ flex: 1 }}>
                            <h3 style={{ marginTop: 10, marginBottom: 5 }}>City</h3>
                            <select
                                onChange={(e) => setCity(e.target.value)}
                                value={city || ""}
                                style={{ width: "100%", minHeight: 40 }}
                                required
                            >
                                <option value={""}>-- Select City --</option>
                                {citiesList.map((_city) => (
                                    <option key={_city.id} value={_city.id}>
                                        {_city.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "16px" }}>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ marginTop: 10, marginBottom: 5 }}>Plot Number</h3>
                            <input
                                type="text"
                                value={plotNumber}
                                onChange={(e) => setPlotNumber(e.target.value)}
                                placeholder="Enter Plot Number"
                                style={{ width: "100%", minHeight: 40, padding: "8px" }}
                                required
                            />
                        </div>

                        <div style={{ flex: 1 }}>
                            <h3 style={{ marginTop: 10, marginBottom: 5 }}>Neighbourhood</h3>
                            <input
                                type="text"
                                value={neighbourhood}
                                onChange={(e) => setNeighbourhood(e.target.value)}
                                placeholder="Enter Neighbourhood"
                                style={{ width: "100%", minHeight: 40, padding: "8px" }}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        style={{
                            width: "100%",
                            minHeight: 40,
                            backgroundColor: "#007bff",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }}
                    >
                        Submit
                    </button>
                </form>
            </div>
        </div>
    );
};

export default StreetAddress;